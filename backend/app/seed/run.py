"""Deterministic Faker seed — wipes and repopulates all four tables.

Usage (from backend/, venv active, schema already migrated):

    python -m app.seed.run

Idempotent: every run deletes all rows (allocations → employees → seats →
projects, FK-safe order) inside the same transaction as the re-insert, and all
randomness comes from fixed seeds + a fixed base date, so reruns produce
identical data. Rows carry explicit ids so cross-table references are stable.

Works unchanged against SQLite and PostgreSQL — it only speaks ORM-level
bulk INSERT/DELETE through the DATABASE_URL-driven engine.
"""
import re
import sys
import time
from collections import deque
from datetime import timedelta
from random import Random

from faker import Faker
from sqlalchemy import delete, insert, text

from app.core.database import SessionLocal
from app.models import Employee, Project, Seat, SeatAllocation
from app.seed import data as d
from app.seed.verify import verify


def _email_for(name: str, used: set[str]) -> str:
    """`first.last@ethara.ai`, numeric suffix on collision — mirrors the mock."""
    base = ".".join(re.sub(r"[^a-z\s]", "", name.lower()).split())
    email, suffix = f"{base}@ethara.ai", 2
    while email in used:
        email = f"{base}{suffix}@ethara.ai"
        suffix += 1
    used.add(email)
    return email


def build_rows() -> dict[str, list[dict]]:
    """Generate all rows in memory. Pure function of the fixed seeds."""
    rng = Random(d.SEED)
    Faker.seed(d.SEED)
    fake = Faker()

    def days_from_base(days: int):
        return d.BASE_DATE - timedelta(days=days)

    # --- Projects: the 11 exact names, all ACTIVE ----------------------------
    projects = [
        {
            "id": i + 1,
            "name": seed["name"],
            "description": seed["description"],
            "manager_name": fake.name(),
            "status": "ACTIVE",
            "created_at": days_from_base(rng.randint(400, 900)),
        }
        for i, seed in enumerate(d.PROJECT_SEEDS)
    ]

    # --- Seats: seat_number runs 1..560 within a floor+zone, bay derived -----
    seats: list[dict] = []
    seat_id = 0
    for floor in d.FLOORS:
        for zone in d.ZONES:
            for n in range(1, d.BAYS_PER_ZONE * d.SEATS_PER_BAY + 1):
                seat_id += 1
                bay = -(-n // d.SEATS_PER_BAY)  # ceil(n / SEATS_PER_BAY)
                seats.append(
                    {
                        "id": seat_id,
                        "floor": floor,
                        "zone": zone,
                        "bay": bay,
                        "seat_number": n,
                        "seat_code": f"{zone}{bay}-{n}",
                        "status": "OCCUPIED",  # provisional; scattered below
                        "created_at": days_from_base(1000),
                    }
                )

    # Scatter the non-occupied statuses within each floor per FLOOR_STATUS_MIX
    # — deliberately uneven, so floors read 79–95% occupied instead of every
    # floor landing on the same flat percentage.
    status_for: dict[int, str] = {}
    for floor in d.FLOORS:
        floor_ids = [s["id"] for s in seats if s["floor"] == floor]
        rng.shuffle(floor_ids)
        cursor = 0
        for status, count in d.FLOOR_STATUS_MIX[floor].items():
            for sid in floor_ids[cursor : cursor + count]:
                status_for[sid] = status
            cursor += count
    for seat in seats:
        seat["status"] = status_for.get(seat["id"], "OCCUPIED")

    # --- Employees: ~5,000; #1 is the brief's AI-assistant example -----------
    # Power-curve team sizes (largest ≈ 5× smallest), shuffled across employee
    # ids so pending/exited/on-leave statuses land in every team.
    project_pool: list[int] = []
    for project_id, count in enumerate(d.project_member_counts(), start=1):
        project_pool.extend([project_id] * count)
    rng.shuffle(project_pool)

    used_emails: set[str] = set()
    employees: list[dict] = []
    for i in range(d.TOTAL_EMPLOYEES):
        emp_id = i + 1
        if i >= d.TOTAL_EMPLOYEES - d.PENDING_COUNT:
            status = "PENDING_ALLOCATION"
        elif i >= d.SEATED_COUNT:
            status = "EXITED"
        else:
            status = "ACTIVE"  # a few flipped to ON_LEAVE below

        # Pending joiners joined (or join) around the base date; others earlier.
        joined_days_ago = (
            rng.randint(-10, 5) if status == "PENDING_ALLOCATION" else rng.randint(45, 1600)
        )
        joining_date = days_from_base(joined_days_ago)

        name = "Amit Sharma" if emp_id == 1 else fake.name()
        department = rng.choice(d.DEPARTMENTS)
        employees.append(
            {
                "id": emp_id,
                "employee_code": f"ETH-{emp_id:04d}",
                "name": name,
                "email": "amit@ethara.ai" if emp_id == 1 else _email_for(name, used_emails),
                "department": department,
                "role": rng.choice(d.DEPARTMENT_ROLES[department]),
                "joining_date": joining_date,
                "status": status,
                "project_id": project_pool[i],
                "created_at": joining_date,
                "updated_at": days_from_base(rng.randint(0, 30)),
            }
        )
    used_emails.add("amit@ethara.ai")

    # Flip a few seated employees to ON_LEAVE (they keep their seats; not #1).
    on_leave_pool = [e["id"] for e in employees[1 : d.SEATED_COUNT]]
    rng.shuffle(on_leave_pool)
    for emp_id in on_leave_pool[: d.ON_LEAVE_COUNT]:
        employees[emp_id - 1]["status"] = "ON_LEAVE"

    # --- Allocations: teams cluster around their project's home zone ---------
    occupiable_by_zone: dict[str, deque] = {key: deque() for key in d.ZONE_KEYS}
    for seat in seats:
        if seat["status"] == "OCCUPIED":
            occupiable_by_zone[d.zone_key(seat["floor"], seat["zone"])].append(seat)

    def take_seat_near(project_id: int) -> dict | None:
        start = d.ZONE_KEYS.index(d.project_home_zone_key(project_id))
        for offset in range(len(d.ZONE_KEYS)):
            queue = occupiable_by_zone[d.ZONE_KEYS[(start + offset) % len(d.ZONE_KEYS)]]
            if queue:
                return queue.popleft()
        return None

    allocations: list[dict] = []
    for project in projects:
        members = [
            e
            for e in employees
            if e["project_id"] == project["id"] and e["status"] in ("ACTIVE", "ON_LEAVE")
        ]
        for member in members:
            seat = take_seat_near(project["id"])
            if seat is None:  # cannot happen: OCCUPIED_COUNT == SEATED_COUNT
                raise RuntimeError("ran out of occupiable seats")
            allocations.append(
                {
                    "id": len(allocations) + 1,
                    "employee_id": member["id"],
                    "seat_id": seat["id"],
                    "project_id": project["id"],
                    "allocation_status": "ACTIVE",
                    "allocation_date": member["joining_date"],
                    "released_date": None,
                }
            )

    return {
        "projects": projects,
        "seats": seats,
        "employees": employees,
        "allocations": allocations,
    }


def seed() -> None:
    started = time.perf_counter()
    rows = build_rows()

    with SessionLocal() as session:
        # Wipe in FK-safe order, then repopulate — one transaction, so a
        # failed run leaves the previous data untouched.
        for model in (SeatAllocation, Employee, Seat, Project):
            session.execute(delete(model))
        session.execute(insert(Project), rows["projects"])
        session.execute(insert(Seat), rows["seats"])
        session.execute(insert(Employee), rows["employees"])
        session.execute(insert(SeatAllocation), rows["allocations"])

        # The rows above carry explicit ids, which leaves Postgres identity
        # sequences at 1 — every later API INSERT would then collide on the
        # primary key (IntegrityError surfacing as a bogus 409). Bump each
        # sequence past the seeded max. SQLite needs nothing: its rowid
        # picks max(id)+1 natively.
        if session.get_bind().dialect.name == "postgresql":
            for model in (Project, Seat, Employee, SeatAllocation):
                table = model.__tablename__
                session.execute(
                    text(
                        f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                        f"(SELECT COALESCE(MAX(id), 1) FROM {table}))"
                    )
                )
        session.commit()

    print(
        f"Seeded {len(rows['projects'])} projects, {len(rows['seats'])} seats, "
        f"{len(rows['employees'])} employees, {len(rows['allocations'])} allocations "
        f"in {time.perf_counter() - started:.2f}s"
    )


if __name__ == "__main__":
    seed()
    sys.exit(verify())
