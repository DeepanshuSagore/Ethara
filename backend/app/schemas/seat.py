"""Seat request/response schemas (mirrors frontend Seat type)."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, model_validator

from app.schemas.base import ReadSchema, SeatStatus


class SeatCreate(BaseModel):
    floor: int
    zone: str
    bay: int
    seat_number: int
    # Display code `{zone}{bay}-{seat_number}` — derived when omitted.
    seat_code: str | None = None
    status: SeatStatus = "AVAILABLE"

    @model_validator(mode="after")
    def derive_seat_code(self) -> SeatCreate:
        if self.seat_code is None:
            self.seat_code = f"{self.zone}{self.bay}-{self.seat_number}"
        return self


class SeatUpdate(BaseModel):
    floor: int | None = None
    zone: str | None = None
    bay: int | None = None
    seat_number: int | None = None
    seat_code: str | None = None
    status: SeatStatus | None = None


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

    status: SeatStatus | None = None
    floor: int | None = None
    zone: str | None = None


# Business rule 5 — ranking labels, mirrors frontend SeatSuggestion.
SuggestionReason = Literal["team-zone", "same-floor", "alternate-zone"]


class SeatSuggestionRead(BaseModel):
    """One ranked new-joiner seat suggestion (GET /seats/suggestions)."""

    seat: SeatRead
    reason: SuggestionReason
