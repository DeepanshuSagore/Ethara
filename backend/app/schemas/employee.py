"""Employee request/response schemas (mirrors frontend Employee type)."""
from datetime import datetime

from pydantic import BaseModel

from app.schemas.base import EmployeeStatus, ReadSchema


class EmployeeCreate(BaseModel):
    employee_code: str
    name: str
    email: str
    department: str
    role: str
    joining_date: datetime
    # New joiners enter the allocation queue by default (business rule 5).
    status: EmployeeStatus = "PENDING_ALLOCATION"
    project_id: int


class EmployeeUpdate(BaseModel):
    employee_code: str | None = None
    name: str | None = None
    email: str | None = None
    department: str | None = None
    role: str | None = None
    joining_date: datetime | None = None
    status: EmployeeStatus | None = None
    project_id: int | None = None


class EmployeeRead(ReadSchema):
    id: int
    employee_code: str
    name: str
    email: str
    department: str
    role: str
    joining_date: datetime
    status: EmployeeStatus
    project_id: int
    created_at: datetime
    updated_at: datetime


class EmployeeFilterParams(BaseModel):
    """Query params for GET /employees (Phase 6)."""

    search: str | None = None
    department: str | None = None
    role: str | None = None
    project_id: int | None = None
    status: EmployeeStatus | None = None
