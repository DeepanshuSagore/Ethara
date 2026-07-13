"""Allocations router — Phase 7 convenience (read-only).

The brief's REST surface never exposes seat_allocations rows, but the UI has
shown "who sits where" since Phase 2 (employee list/detail seat, seat-dialog
occupant). GET /allocations closes that gap without touching any spec path:
filter by employee_id / seat_id / status to resolve employee ↔ seat links.
"""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import SeatAllocation
from app.schemas import AllocationStatus, SeatAllocationRead

router = APIRouter(prefix="/allocations", tags=["Seats"])

DbDep = Annotated[Session, Depends(get_db)]


@router.get(
    "",
    response_model=list[SeatAllocationRead],
    summary="List seat allocations (filter by employee, seat or status)",
)
def list_allocations(
    db: DbDep,
    employee_id: Annotated[Optional[int], Query()] = None,
    seat_id: Annotated[Optional[int], Query()] = None,
    status: Annotated[Optional[AllocationStatus], Query()] = None,
    limit: Annotated[Optional[int], Query(ge=1, description="Max rows (default: all)")] = None,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    stmt = select(SeatAllocation).order_by(SeatAllocation.id)
    if employee_id is not None:
        stmt = stmt.where(SeatAllocation.employee_id == employee_id)
    if seat_id is not None:
        stmt = stmt.where(SeatAllocation.seat_id == seat_id)
    if status:
        stmt = stmt.where(SeatAllocation.allocation_status == status)
    if offset:
        stmt = stmt.offset(offset)
    if limit is not None:
        stmt = stmt.limit(limit)
    return db.scalars(stmt).all()
