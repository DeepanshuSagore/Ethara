"""Pydantic schemas — request/response models mirroring frontend/src/types."""
from app.schemas.ai import AiQueryRequest, AiQueryResponse
from app.schemas.base import (
    AllocationStatus,
    EmployeeStatus,
    ProjectStatus,
    SeatStatus,
)
from app.schemas.dashboard import (
    DashboardSummary,
    FloorUtilization,
    ProjectUtilization,
)
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeFilterParams,
    EmployeeRead,
    EmployeeUpdate,
)
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.schemas.seat import (
    SeatCreate,
    SeatFilterParams,
    SeatRead,
    SeatSuggestionRead,
    SeatUpdate,
    SuggestionReason,
)
from app.schemas.seat_allocation import (
    SeatAllocateRequest,
    SeatAllocationRead,
    SeatReleaseRequest,
)

__all__ = [
    "AllocationStatus",
    "EmployeeStatus",
    "ProjectStatus",
    "SeatStatus",
    "AiQueryRequest",
    "AiQueryResponse",
    "DashboardSummary",
    "FloorUtilization",
    "ProjectUtilization",
    "EmployeeCreate",
    "EmployeeFilterParams",
    "EmployeeRead",
    "EmployeeUpdate",
    "ProjectCreate",
    "ProjectRead",
    "ProjectUpdate",
    "SeatCreate",
    "SeatFilterParams",
    "SeatRead",
    "SeatSuggestionRead",
    "SeatUpdate",
    "SuggestionReason",
    "SeatAllocateRequest",
    "SeatAllocationRead",
    "SeatReleaseRequest",
]
