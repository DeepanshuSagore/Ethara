"""Deterministic keyword assistant — the Phase 6 engine behind POST /ai/query.

Mirrors the frontend mock assistant (frontend/src/components/assistant/
chat-panel.tsx mockReply) so the endpoint works offline with no API key:
employee seat lookup by email or name, floor availability, project occupancy,
and overall utilization — all answered live from the database. Phase 8's Groq
layer (ai_nl.py) sits in front and reuses the answer composers below; this
module stays the guaranteed fallback on any Groq failure or missing key.
"""
import re

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Employee, Project, Seat, SeatAllocation
from app.services import dashboard as dashboard_service

_EMAIL_RE = re.compile(r"[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}")
_FLOOR_RE = re.compile(r"floor\s*(\d+)")


def answer_query(db: Session, query: str) -> str:
    q = query.lower()

    # Same matching order as the mock: employee → floor availability →
    # project → utilization → fallback.
    employee = _find_employee(db, q)
    if employee is not None:
        return employee_answer(db, employee)

    floor_match = _FLOOR_RE.search(q)
    if "available" in q and floor_match:
        return floor_availability_answer(db, int(floor_match.group(1)))

    project = _find_project(db, q)
    if project is not None:
        return project_answer(db, project)

    if "utilization" in q or "occupied" in q or "occupancy" in q:
        return utilization_answer(db)

    return (
        "I couldn't match that to the directory. Try asking about a specific "
        'employee ("Where is my seat? My email is amit@ethara.ai"), a floor '
        '("available seats on Floor 3"), a project ("seats occupied for '
        'Indigo") or overall utilization.'
    )


def _find_employee(db: Session, q: str) -> Employee | None:
    emails = _EMAIL_RE.findall(q)
    if emails:
        employee = db.scalar(
            select(Employee).where(func.lower(Employee.email).in_(emails))
        )
        if employee is not None:
            return employee
    # Name match: the employee's full name appears in the query.
    for emp_id, name in db.execute(select(Employee.id, Employee.name)):
        if name.lower() in q:
            return db.get(Employee, emp_id)
    return None


def employee_answer(db: Session, employee: Employee) -> str:
    project = db.get(Project, employee.project_id)
    seat = db.scalar(
        select(Seat)
        .join(SeatAllocation, SeatAllocation.seat_id == Seat.id)
        .where(
            SeatAllocation.employee_id == employee.id,
            SeatAllocation.allocation_status == "ACTIVE",
        )
    )
    if seat is not None:
        first_name = employee.name.split(" ")[0]
        return (
            f"{employee.name} is seated on Floor {seat.floor}, Zone {seat.zone}, "
            f"Bay {seat.bay}, Seat {seat.seat_code}. "
            f"{first_name} is assigned to Project {project.name}."
        )
    if employee.status == "PENDING_ALLOCATION":
        return (
            f"{employee.name} joined recently and is still waiting for a seat. "
            f"They are assigned to Project {project.name}. Check the New "
            "Joiners queue for suggested seats."
        )
    return f"{employee.name} ({project.name}) has no active seat allocation right now."


def floor_availability_answer(db: Session, floor: int) -> str:
    available = db.scalars(
        select(Seat)
        .where(Seat.floor == floor, Seat.status == "AVAILABLE")
        .order_by(Seat.id)
    ).all()
    if not available:
        return f"There are no available seats on Floor {floor} right now. Try another floor."
    codes = ", ".join(seat.seat_code for seat in available[:8])
    more = ", …" if len(available) > 8 else ""
    noun = "seat" if len(available) == 1 else "seats"
    return (
        f"Floor {floor} has {len(available)} available {noun}: {codes}{more}. "
        "You can allocate one from the Seats page or any project's Allocate people flow."
    )


def _find_project(db: Session, q: str) -> Project | None:
    for project in db.scalars(select(Project)):
        if project.name.lower() in q:
            return project
    return None


def project_answer(db: Session, project: Project) -> str:
    headcount = db.scalar(
        select(func.count())
        .select_from(Employee)
        .where(Employee.project_id == project.id, Employee.status != "EXITED")
    )
    seated = db.scalar(
        select(func.count())
        .select_from(Employee)
        .join(SeatAllocation, SeatAllocation.employee_id == Employee.id)
        .where(
            Employee.project_id == project.id,
            SeatAllocation.allocation_status == "ACTIVE",
        )
    )
    member_noun = "member" if headcount == 1 else "members"
    seat_noun = "seat" if seated == 1 else "seats"
    return (
        f"Project {project.name} has {headcount} {member_noun} and currently "
        f"occupies {seated} {seat_noun}. Its team clusters around one home zone. "
        "The Analytics page has the full breakdown."
    )


def utilization_answer(db: Session) -> str:
    s = dashboard_service.summary(db)
    return (
        f"Overall seat utilization is {s['utilization_pct']}%: "
        f"{s['occupied']:,} of {s['total_seats']:,} seats are occupied, "
        f"with {s['available']:,} available."
    )
