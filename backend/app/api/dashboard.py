"""Dashboard router — metrics computed live from the DB per request (rule 8)."""
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas import DashboardSummary, FloorUtilization, ProjectUtilization
from app.services import dashboard as dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

DbDep = Annotated[Session, Depends(get_db)]


@router.get(
    "/summary",
    response_model=DashboardSummary,
    summary="Headline metrics (employees, seats by status, utilization)",
)
def summary(db: DbDep):
    return dashboard_service.summary(db)


@router.get(
    "/project-utilization",
    response_model=list[ProjectUtilization],
    summary="Per-project headcount, seated members and home zone",
)
def project_utilization(db: DbDep):
    return dashboard_service.project_utilization(db)


@router.get(
    "/floor-utilization",
    response_model=list[FloorUtilization],
    summary="Per-floor seat counts and occupancy",
)
def floor_utilization(db: DbDep):
    return dashboard_service.floor_utilization(db)
