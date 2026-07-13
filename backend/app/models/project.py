"""projects — the 11 named projects employees map to (PROJECT_PLAN.md §3)."""
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import PROJECT_STATUSES, status_check, utcnow

if TYPE_CHECKING:
    from app.models.employee import Employee
    from app.models.seat_allocation import SeatAllocation


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint(status_check("status", PROJECT_STATUSES), name="status_valid"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str] = mapped_column(Text, default="")
    manager_name: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    employees: Mapped[list["Employee"]] = relationship(back_populates="project")
    allocations: Mapped[list["SeatAllocation"]] = relationship(back_populates="project")

    def __repr__(self) -> str:
        return f"<Project {self.id} {self.name!r} {self.status}>"
