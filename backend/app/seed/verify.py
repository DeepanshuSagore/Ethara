"""Post-seed verification — summary table + hard asserts on PROJECT_PLAN §5b.

Runs automatically at the end of `python -m app.seed.run`, or standalone:

    python -m app.seed.verify

Exits non-zero if any target or invariant fails, so it can gate CI/deploy.
"""
import sys

from sqlalchemy import String, cast, func, select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models import Employee, Project, Seat, SeatAllocation
from app.seed import data as d

_CHECKS: list[tuple[str, bool]] = []


def _check(label: str, ok: bool) -> None:
    _CHECKS.append((label, ok))
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}")


def _status_counts(session: Session, model, column) -> dict[str, int]:
    rows = session.execute(select(column, func.count()).group_by(column)).all()
    return {status: count for status, count in rows}


def verify() -> int:
    _CHECKS.clear()
    with SessionLocal() as session:
        n_projects = session.scalar(select(func.count()).select_from(Project))
        n_seats = session.scalar(select(func.count()).select_from(Seat))
        n_employees = session.scalar(select(func.count()).select_from(Employee))
        n_allocations = session.scalar(select(func.count()).select_from(SeatAllocation))

        seat_status = _status_counts(session, Seat, Seat.status)
        emp_status = _status_counts(session, Employee, Employee.status)
        active_allocs = session.scalar(
            select(func.count())
            .select_from(SeatAllocation)
            .where(SeatAllocation.allocation_status == "ACTIVE")
        )

        print("\n=== Seed summary ===")
        print(f"  projects:    {n_projects}")
        print(f"  seats:       {n_seats}")
        print(f"  employees:   {n_employees}")
        print(f"  allocations: {n_allocations} ({active_allocs} ACTIVE)")
        print(f"  seat status:     {seat_status}")
        print(f"  employee status: {emp_status}")

        print("\n=== §5b targets ===")
        _check(f"projects == 11 (got {n_projects})", n_projects == 11)
        names = set(session.scalars(select(Project.name)))
        _check("project names are the 11 exact names", names == {p["name"] for p in d.PROJECT_SEEDS})
        non_active = session.scalar(
            select(func.count()).select_from(Project).where(Project.status != "ACTIVE")
        )
        _check("all projects ACTIVE", non_active == 0)

        floors = session.scalars(select(Seat.floor).distinct()).all()
        zones = session.execute(select(Seat.floor, Seat.zone).distinct()).all()
        _check(f"floors >= 5 (got {len(floors)})", len(floors) >= 5)
        _check(f"zones >= 10 (got {len(zones)})", len(zones) >= 10)
        _check(f"seats >= 5500 (got {n_seats})", n_seats >= 5500)
        _check(f"employees == 5000 (got {n_employees})", n_employees == 5000)

        _check(
            f"AVAILABLE >= 500 (got {seat_status.get('AVAILABLE', 0)})",
            seat_status.get("AVAILABLE", 0) >= 500,
        )
        _check(
            f"RESERVED >= 100 (got {seat_status.get('RESERVED', 0)})",
            seat_status.get("RESERVED", 0) >= 100,
        )
        _check(
            f"MAINTENANCE > 0 (got {seat_status.get('MAINTENANCE', 0)})",
            seat_status.get("MAINTENANCE", 0) > 0,
        )
        _check(
            f"PENDING_ALLOCATION >= 50 (got {emp_status.get('PENDING_ALLOCATION', 0)})",
            emp_status.get("PENDING_ALLOCATION", 0) >= 50,
        )

        amit = session.scalar(select(Employee).where(Employee.email == "amit@ethara.ai"))
        _check(
            "employee #1 is Amit Sharma / amit@ethara.ai / ETH-0001",
            amit is not None
            and amit.id == 1
            and amit.name == "Amit Sharma"
            and amit.employee_code == "ETH-0001",
        )

        print("\n=== Invariants ===")
        distinct_emails = session.scalar(select(func.count(func.distinct(Employee.email))))
        _check("all emails unique", distinct_emails == n_employees)
        bad_domain = session.scalar(
            select(func.count())
            .select_from(Employee)
            .where(~Employee.email.like("%@ethara.ai"))
        )
        _check("all emails @ethara.ai", bad_domain == 0)

        # At most one ACTIVE allocation per employee and per seat (the DB's
        # partial unique indexes guarantee this; re-checked independently here).
        for label, column in (("employee", SeatAllocation.employee_id), ("seat", SeatAllocation.seat_id)):
            dupes = session.execute(
                select(column)
                .where(SeatAllocation.allocation_status == "ACTIVE")
                .group_by(column)
                .having(func.count() > 1)
            ).all()
            _check(f"no {label} with 2 ACTIVE allocations", len(dupes) == 0)

        occupied = seat_status.get("OCCUPIED", 0)
        _check(
            f"OCCUPIED seats == ACTIVE allocations ({occupied} == {active_allocs})",
            occupied == active_allocs,
        )
        # …and they are the *same* seats, not just the same count.
        mismatched = session.scalar(
            select(func.count())
            .select_from(SeatAllocation)
            .join(Seat, SeatAllocation.seat_id == Seat.id)
            .where(SeatAllocation.allocation_status == "ACTIVE", Seat.status != "OCCUPIED")
        )
        _check("every ACTIVE allocation points at an OCCUPIED seat", mismatched == 0)

        seatless = session.scalar(
            select(func.count())
            .select_from(SeatAllocation)
            .join(Employee, SeatAllocation.employee_id == Employee.id)
            .where(
                SeatAllocation.allocation_status == "ACTIVE",
                Employee.status.in_(("PENDING_ALLOCATION", "EXITED")),
            )
        )
        _check("no PENDING/EXITED employee holds an ACTIVE allocation", seatless == 0)

        alloc_project_drift = session.scalar(
            select(func.count())
            .select_from(SeatAllocation)
            .join(Employee, SeatAllocation.employee_id == Employee.id)
            .where(SeatAllocation.project_id != Employee.project_id)
        )
        _check("allocation.project_id matches employee.project_id", alloc_project_drift == 0)

        bad_codes = session.scalar(
            select(func.count())
            .select_from(Seat)
            .where(
                Seat.seat_code
                != Seat.zone + cast(Seat.bay, String) + "-" + cast(Seat.seat_number, String)
            )
        )
        _check("seat_code == {zone}{bay}-{seat_number} for every seat", bad_codes == 0)

    failed = [label for label, ok in _CHECKS if not ok]
    if failed:
        print(f"\nVERIFICATION FAILED — {len(failed)} check(s): {failed}")
        return 1
    print(f"\nAll {len(_CHECKS)} checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(verify())
