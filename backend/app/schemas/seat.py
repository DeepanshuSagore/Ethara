"""Seat request/response schemas (mirrors frontend Seat type)."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, model_validator

from app.schemas.base import ReadSchema, SeatStatus


class SeatCreate(BaseModel):
    floor: int
    zone: str
    bay: int
    seat_number: int
    # Display code `{zone}{bay}-{seat_number}` — derived when omitted.
    seat_code: Optional[str] = None
    status: SeatStatus = "AVAILABLE"

    @model_validator(mode="after")
    def derive_seat_code(self) -> "SeatCreate":
        if self.seat_code is None:
            self.seat_code = f"{self.zone}{self.bay}-{self.seat_number}"
        return self


class SeatUpdate(BaseModel):
    floor: Optional[int] = None
    zone: Optional[str] = None
    bay: Optional[int] = None
    seat_number: Optional[int] = None
    seat_code: Optional[str] = None
    status: Optional[SeatStatus] = None


class SeatRead(ReadSchema):
    id: int
    floor: int
    zone: str
    bay: int
    seat_number: int
    seat_code: str
    status: SeatStatus
    created_at: datetime


class SeatFilterParams(BaseModel):
    """Query params for GET /seats (Phase 6)."""

    status: Optional[SeatStatus] = None
    floor: Optional[int] = None
    zone: Optional[str] = None
