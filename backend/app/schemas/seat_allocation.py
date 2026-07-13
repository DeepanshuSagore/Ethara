"""SeatAllocation schemas + the allocate/release request bodies for Phase 6."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.base import AllocationStatus, ReadSchema


class SeatAllocationRead(ReadSchema):
    id: int
    employee_id: int
    seat_id: int
    project_id: int
    allocation_status: AllocationStatus
    allocation_date: datetime
    released_date: Optional[datetime] = None


class SeatAllocateRequest(BaseModel):
    """Body for POST /seats/allocate."""

    employee_id: int
    seat_id: int


class SeatReleaseRequest(BaseModel):
    """Body for POST /seats/release."""

    seat_id: int
