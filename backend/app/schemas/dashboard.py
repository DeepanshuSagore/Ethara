"""Dashboard response schemas — mirror the mock store's derived metrics.

Shapes match frontend/src/lib/mock/store.tsx (DashboardMetrics / ProjectStats /
FloorStats) in snake_case, minus the mock-only ×20 `display` scaling (the real
DB already holds the brief's full volumes). Metrics are computed live on every
request (business rule 8) — see app/services/dashboard.py.
"""
from pydantic import BaseModel

from app.schemas.project import ProjectRead


class DashboardSummary(BaseModel):
    total_employees: int  # non-EXITED, matching the mock store
    total_seats: int
    occupied: int
    available: int
    reserved: int
    maintenance: int
    pending_joiners: int
    utilization_pct: int


class ProjectUtilization(BaseModel):
    project: ProjectRead
    headcount: int  # members not EXITED
    seated: int  # members holding an ACTIVE allocation
    home_zone: str  # e.g. "1A" — the zone the team clusters around


class FloorUtilization(BaseModel):
    floor: int
    total: int
    occupied: int
    available: int
    reserved: int
    maintenance: int
    occupancy_pct: int
