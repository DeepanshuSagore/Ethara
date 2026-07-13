"""employees — one row per person; current seat lives in seat_allocations."""
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import EMPLOYEE_STATUSES, status_check, utcnow

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.seat_allocation import SeatAllocation


class Employee(Base):
    __tablename__ = "employees"
    __table_args__ = (
        CheckConstraint(status_check("status", EMPLOYEE_STATUSES), name="status_valid"),
        # Phase 6 filter params: ?department=&status=&project_id= (project_id
        # gets its index via the FK column index below).
        Index("ix_employees_department", "department"),
        Index("ix_employees_status", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_code: Mapped[str] = mapped_column(String(20), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    department: Mapped[str] = mapped_column(String(80))
    role: Mapped[str] = mapped_column(String(80))
    joining_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE")
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    project: Mapped["Project"] = relationship(back_populates="employees")
    allocations: Mapped[list["SeatAllocation"]] = relationship(back_populates="employee")

    def __repr__(self) -> str:
        return f"<Employee {self.id} {self.employee_code} {self.email}>"
