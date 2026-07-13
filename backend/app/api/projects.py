"""Projects router — POST /projects · GET /projects · GET /projects/{id}/employees."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Employee, Project
from app.schemas import EmployeeRead, ProjectCreate, ProjectRead
from app.services import allocation as allocation_service

router = APIRouter(prefix="/projects", tags=["Projects"])

DbDep = Annotated[Session, Depends(get_db)]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ProjectRead,
    summary="Create a project",
)
def create_project(payload: ProjectCreate, db: DbDep):
    if db.scalar(select(Project).where(func.lower(Project.name) == payload.name.lower())):
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"A project named {payload.name} already exists."
        )
    project = Project(**payload.model_dump())
    db.add(project)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Project name already exists.")
    db.refresh(project)
    return project


@router.get("", response_model=list[ProjectRead], summary="List projects")
def list_projects(db: DbDep):
    return db.scalars(select(Project).order_by(Project.id)).all()


@router.get("/{id}", response_model=ProjectRead, summary="Get a project")
def get_project(id: int, db: DbDep):
    return allocation_service.get_or_404(db, Project, id, "Project")


@router.get(
    "/{id}/employees",
    response_model=list[EmployeeRead],
    summary="List a project's employees",
)
def list_project_employees(id: int, db: DbDep):
    allocation_service.get_or_404(db, Project, id, "Project")
    return db.scalars(
        select(Employee).where(Employee.project_id == id).order_by(Employee.id)
    ).all()
