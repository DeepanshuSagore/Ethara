"""Seat-allocation business logic — PROJECT_PLAN §3 rules 1–5.

Rules 1 and 2 (one ACTIVE allocation per employee / per seat) also live in the
database as partial unique indexes; the pre-checks here exist to return
friendly 409s, with IntegrityError → 409 as the last line of defense against
races. Rules 3 (release → AVAILABLE), 4 (only AVAILABLE seats allocatable) and
5 (new-joiner proximity ranking) are enforced entirely here.
"""
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Employee, Seat, SeatAllocation
from app.models.base import utcnow
from app.seed.data import project_home_zone_key, zone_key

# Ranking for business rule 5 — mirrors the mock store's suggestSeatsFor.
_REASON_RANK = {"team-zone": 0, "same-floor": 1, "alternate-zone": 2}


def get_or_404(db: Session, model: type, obj_id: int, label: str):
    obj = db.get(model, obj_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{label} {obj_id} not found.")
    return obj


def _conflict(detail: str) -> None:
    raise HTTPException(status.HTTP_409_CONFLICT, detail)


def active_allocation_for_employee(db: Session, employee_id: int) -> SeatAllocation | None:
    return db.scalar(
        select(SeatAllocation).where(
            SeatAllocation.employee_id == employee_id,
            SeatAllocation.allocation_status == "ACTIVE",
        )
    )


def active_allocation_for_seat(db: Session, seat_id: int) -> SeatAllocation | None:
    return db.scalar(
        select(SeatAllocation).where(
            SeatAllocation.seat_id == seat_id,
            SeatAllocation.allocation_status == "ACTIVE",
        )
    )


def allocate_seat(db: Session, employee_id: int, seat_id: int) -> SeatAllocation:
    """POST /seats/allocate — rules 1, 2 and 4, atomically."""
    employee = get_or_404(db, Employee, employee_id, "Employee")
    seat = get_or_404(db, Seat, seat_id, "Seat")

    if employee.status == "EXITED":
        _conflict(f"{employee.name} has exited and cannot be allocated a seat.")
    # Rule 1: one employee → at most one ACTIVE allocation.
    if active_allocation_for_employee(db, employee_id) is not None:
        _conflict(f"{employee.name} already has an active seat.")
    # Rules 2 & 4: only AVAILABLE seats can be allocated (OCCUPIED covers
    # rule 2 — the seat status is kept in lockstep with its ACTIVE allocation).
    if seat.status != "AVAILABLE":
        _conflict(f"Seat {seat.seat_code} is {seat.status.lower()} and cannot be allocated.")

    allocation = SeatAllocation(
        employee_id=employee.id,
        seat_id=seat.id,
        project_id=employee.project_id,
        allocation_status="ACTIVE",
        allocation_date=utcnow(),
    )
    seat.status = "OCCUPIED"
    if employee.status == "PENDING_ALLOCATION":
        employee.status = "ACTIVE"  # the joiner is now seated
    db.add(allocation)
    try:
        db.commit()
    except IntegrityError:
        # Race lost to a concurrent allocation — the partial unique indexes win.
        db.rollback()
        _conflict("Allocation conflicts with an existing active allocation.")
    db.refresh(allocation)
    return allocation


def _release(allocation: SeatAllocation, seat: Seat) -> None:
    """Rule 3 as one state transition — caller owns the transaction."""
    allocation.allocation_status = "RELEASED"
    allocation.released_date = utcnow()
    seat.status = "AVAILABLE"


def release_seat(db: Session, seat_id: int) -> SeatAllocation:
    """POST /seats/release — rule 3, atomically."""
    seat = get_or_404(db, Seat, seat_id, "Seat")
    allocation = active_allocation_for_seat(db, seat_id)
    if allocation is None:
        _conflict(f"Seat {seat.seat_code} has no active allocation.")
    _release(allocation, seat)
    db.commit()
    db.refresh(allocation)
    return allocation


def release_employee_seat(db: Session, employee: Employee) -> None:
    """Release the employee's ACTIVE allocation if any — no commit (caller's)."""
    allocation = active_allocation_for_employee(db, employee.id)
    if allocation is not None:
        _release(allocation, db.get(Seat, allocation.seat_id))


def deactivate_employee(db: Session, employee_id: int) -> Employee:
    """DELETE /employees/{id} — soft: EXITED + seat released, history kept."""
    employee = get_or_404(db, Employee, employee_id, "Employee")
    release_employee_seat(db, employee)
    employee.status = "EXITED"
    db.commit()
    db.refresh(employee)
    return employee


def suggest_seats(db: Session, employee_id: int, limit: int = 3) -> list[dict]:
    """Rule 5 — rank AVAILABLE seats: team zone → same floor → alternate zones.

    Team zone = the (floor, zone) where most of the employee's project-mates
    with ACTIVE allocations sit, falling back to the project's seeded home
    zone. Mirrors frontend/src/lib/mock/store.tsx suggestSeatsFor.
    """
    employee = get_or_404(db, Employee, employee_id, "Employee")

    tally = db.execute(
        select(Seat.floor, Seat.zone, func.count())
        .select_from(SeatAllocation)
        .join(Employee, Employee.id == SeatAllocation.employee_id)
        .join(Seat, Seat.id == SeatAllocation.seat_id)
        .where(
            SeatAllocation.allocation_status == "ACTIVE",
            Employee.project_id == employee.project_id,
        )
        .group_by(Seat.floor, Seat.zone)
    ).all()

    if tally:
        team_floor, team_zone_letter, _ = max(tally, key=lambda row: row[2])
        team_zone = zone_key(team_floor, team_zone_letter)
    else:
        team_zone = project_home_zone_key(employee.project_id)
        team_floor = int(team_zone[:-1])

    available = db.scalars(
        select(Seat).where(Seat.status == "AVAILABLE").order_by(Seat.id)
    ).all()
    suggestions = []
    for seat in available:
        if zone_key(seat.floor, seat.zone) == team_zone:
            reason = "team-zone"
        elif seat.floor == team_floor:
            reason = "same-floor"
        else:
            reason = "alternate-zone"
        suggestions.append({"seat": seat, "reason": reason})
    suggestions.sort(key=lambda s: _REASON_RANK[s["reason"]])
    return suggestions[:limit]
