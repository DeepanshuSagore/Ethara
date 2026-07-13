"""seat_allocations — the single source of truth for "who sits where".

Current seat = the employee's (at most one) ACTIVE row; releases keep the row
as history with allocation_status=RELEASED and a released_date.
"""
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import ALLOCATION_STATUSES, status_check, utcnow

if TYPE_CHECKING:
    from app.models.employee import Employee
    from app.models.project import Project
    from app.models.seat import Seat

_ACTIVE = text("allocation_status = 'ACTIVE'")


class SeatAllocation(Base):
    __tablename__ = "seat_allocations"
    __table_args__ = (
        CheckConstraint(
            status_check("allocation_status", ALLOCATION_STATUSES), name="status_valid"
        ),
        # Business rules 1 & 2 at the schema level: partial unique indexes —
        # at most one ACTIVE allocation per employee and per seat. Partial
        # (filtered) indexes are supported by both SQLite and PostgreSQL.
        Index(
            "uq_seat_allocations_one_active_per_employee",
            "employee_id",
            unique=True,
            sqlite_where=_ACTIVE,
            postgresql_where=_ACTIVE,
        ),
        Index(
            "uq_seat_allocations_one_active_per_seat",
            "seat_id",
            unique=True,
            sqlite_where=_ACTIVE,
            postgresql_where=_ACTIVE,
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), index=True)
    seat_id: Mapped[int] = mapped_column(ForeignKey("seats.id"), index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    allocation_status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
    allocation_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    released_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    employee: Mapped["Employee"] = relationship(back_populates="allocations")
    seat: Mapped["Seat"] = relationship(back_populates="allocations")
    project: Mapped["Project"] = relationship(back_populates="allocations")

    def __repr__(self) -> str:
        return (
            f"<SeatAllocation {self.id} emp={self.employee_id} seat={self.seat_id}"
            f" {self.allocation_status}>"
        )
