"""seats — flat location model: Floor → Zone → Bay → Seat as columns."""
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import SEAT_STATUSES, status_check, utcnow

if TYPE_CHECKING:
    from app.models.seat_allocation import SeatAllocation


class Seat(Base):
    __tablename__ = "seats"
    __table_args__ = (
        # Business rule 7: no duplicate seat position within a floor/zone.
        UniqueConstraint("floor", "zone", "bay", "seat_number"),
        CheckConstraint(status_check("status", SEAT_STATUSES), name="status_valid"),
        # Phase 6 filter params: ?status=&floor=&zone= (floor is the leading
        # column of the unique constraint's index, but gets its own composite
        # with zone for the common floor+zone lookup).
        Index("ix_seats_floor_zone", "floor", "zone"),
        Index("ix_seats_status", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    floor: Mapped[int] = mapped_column(Integer)
    zone: Mapped[str] = mapped_column(String(10))
    bay: Mapped[int] = mapped_column(Integer)
    seat_number: Mapped[int] = mapped_column(Integer)
    # Display code `{zone}{bay}-{seat_number}` (e.g. B4-23); repeats across
    # floors, so indexed but not unique.
    seat_code: Mapped[str] = mapped_column(String(20), index=True)
    status: Mapped[str] = mapped_column(String(20), default="AVAILABLE")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    allocations: Mapped[list["SeatAllocation"]] = relationship(back_populates="seat")

    def __repr__(self) -> str:
        return f"<Seat {self.id} F{self.floor}/{self.seat_code} {self.status}>"
