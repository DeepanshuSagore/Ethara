"""Employee request/response schemas (mirrors frontend Employee type)."""
from datetime import datetime
from typing import Optional

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
    employee_code: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    joining_date: Optional[datetime] = None
    status: Optional[EmployeeStatus] = None
    project_id: Optional[int] = None


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

    search: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    project_id: Optional[int] = None
    status: Optional[EmployeeStatus] = None
