"""Seats router — inventory + the allocation lifecycle.

POST /seats · GET /seats (?status=&floor=&zone=) · GET /seats/available
POST /seats/allocate · POST /seats/release, plus GET /seats/suggestions
(rule 5 ranking for the new-joiners screen) and GET /seats/{id}.
Static paths are declared before /{id} so they never shadow-match.
"""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Seat
from app.schemas import (
    SeatAllocateRequest,
    SeatAllocationRead,
    SeatCreate,
    SeatFilterParams,
    SeatRead,
    SeatReleaseRequest,
    SeatSuggestionRead,
)
from app.services import allocation as allocation_service

router = APIRouter(prefix="/seats", tags=["Seats"])

DbDep = Annotated[Session, Depends(get_db)]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=SeatRead,
    summary="Create a seat (seat_code derived when omitted)",
)
def create_seat(payload: SeatCreate, db: DbDep):
    # Business rule 7: duplicate seat position within a floor/zone is rejected.
    existing = db.scalar(
        select(Seat).where(
            Seat.floor == payload.floor,
            Seat.zone == payload.zone,
            Seat.bay == payload.bay,
            Seat.seat_number == payload.seat_number,
        )
    )
    if existing is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Seat {existing.seat_code} already exists at floor {payload.floor} "
            f"zone {payload.zone} bay {payload.bay} #{payload.seat_number}.",
        )
    seat = Seat(**payload.model_dump())
    db.add(seat)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Seat position already exists in this floor/zone."
        )
    db.refresh(seat)
    return seat


@router.get("", response_model=list[SeatRead], summary="List seats with filters")
def list_seats(
    filters: Annotated[SeatFilterParams, Depends()],
    db: DbDep,
    limit: Annotated[Optional[int], Query(ge=1, description="Max rows (default: all)")] = None,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    stmt = select(Seat).order_by(Seat.id)
    if filters.status:
        stmt = stmt.where(Seat.status == filters.status)
    if filters.floor is not None:
        stmt = stmt.where(Seat.floor == filters.floor)
    if filters.zone:
        stmt = stmt.where(Seat.zone == filters.zone)
    if offset:
        stmt = stmt.offset(offset)
    if limit is not None:
        stmt = stmt.limit(limit)
    return db.scalars(stmt).all()


@router.get(
    "/available",
    response_model=list[SeatRead],
    summary="List available seats (optionally by floor/zone)",
)
def list_available_seats(
    db: DbDep,
    floor: Annotated[Optional[int], Query()] = None,
    zone: Annotated[Optional[str], Query()] = None,
):
    stmt = select(Seat).where(Seat.status == "AVAILABLE").order_by(Seat.id)
    if floor is not None:
        stmt = stmt.where(Seat.floor == floor)
    if zone:
        stmt = stmt.where(Seat.zone == zone)
    return db.scalars(stmt).all()


@router.get(
    "/suggestions",
    response_model=list[SeatSuggestionRead],
    summary="Suggest seats for a new joiner (team zone → same floor → alternate)",
)
def suggest_seats(
    employee_id: Annotated[int, Query(description="Employee to suggest seats for")],
    db: DbDep,
    limit: Annotated[int, Query(ge=1, le=20)] = 3,
):
    return allocation_service.suggest_seats(db, employee_id, limit)


@router.post(
    "/allocate",
    status_code=status.HTTP_201_CREATED,
    response_model=SeatAllocationRead,
    summary="Allocate a seat to an employee (rules 1, 2, 4)",
)
def allocate_seat(payload: SeatAllocateRequest, db: DbDep):
    return allocation_service.allocate_seat(db, payload.employee_id, payload.seat_id)


@router.post(
    "/release",
    response_model=SeatAllocationRead,
    summary="Release a seat (allocation → RELEASED, seat → AVAILABLE)",
)
def release_seat(payload: SeatReleaseRequest, db: DbDep):
    return allocation_service.release_seat(db, payload.seat_id)


@router.get("/{id}", response_model=SeatRead, summary="Get a seat")
def get_seat(id: int, db: DbDep):
    return allocation_service.get_or_404(db, Seat, id, "Seat")
