"""Employees router — spec paths from PROJECT_PLAN §5, thin over services.

POST /employees · GET /employees (?search=&department=&role=&project_id=&status=)
GET /employees/{id} · PUT /employees/{id} · DELETE /employees/{id} (deactivate)
"""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Employee, Project
from app.schemas import EmployeeCreate, EmployeeFilterParams, EmployeeRead, EmployeeUpdate
from app.services import allocation as allocation_service

router = APIRouter(prefix="/employees", tags=["Employees"])

DbDep = Annotated[Session, Depends(get_db)]


def _ensure_project_exists(db: Session, project_id: int) -> None:
    if db.get(Project, project_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Project {project_id} not found.")


def _ensure_email_free(db: Session, email: str) -> None:
    # Business rule 6: duplicate employee email is rejected (DB unique backs this).
    if db.scalar(select(Employee).where(func.lower(Employee.email) == email.lower())):
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"An employee with email {email} already exists."
        )


def _ensure_code_free(db: Session, employee_code: str) -> None:
    if db.scalar(select(Employee).where(Employee.employee_code == employee_code)):
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Employee code {employee_code} already exists."
        )


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=EmployeeRead,
    summary="Create an employee (new joiners default to PENDING_ALLOCATION)",
)
def create_employee(payload: EmployeeCreate, db: DbDep):
    _ensure_project_exists(db, payload.project_id)
    _ensure_email_free(db, payload.email)
    _ensure_code_free(db, payload.employee_code)
    employee = Employee(**{**payload.model_dump(), "email": payload.email.strip().lower()})
    db.add(employee)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Employee email or code already exists."
        )
    db.refresh(employee)
    return employee


@router.get(
    "",
    response_model=list[EmployeeRead],
    summary="List employees with search & filters",
)
def list_employees(
    filters: Annotated[EmployeeFilterParams, Depends()],
    db: DbDep,
    limit: Annotated[Optional[int], Query(ge=1, description="Max rows (default: all)")] = None,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    stmt = select(Employee).order_by(Employee.id)
    if filters.search:
        term = f"%{filters.search.strip()}%"
        stmt = stmt.where(
            or_(
                Employee.name.ilike(term),
                Employee.email.ilike(term),
                Employee.employee_code.ilike(term),
            )
        )
    if filters.department:
        stmt = stmt.where(Employee.department == filters.department)
    if filters.role:
        stmt = stmt.where(Employee.role == filters.role)
    if filters.project_id is not None:
        stmt = stmt.where(Employee.project_id == filters.project_id)
    if filters.status:
        stmt = stmt.where(Employee.status == filters.status)
    if offset:
        stmt = stmt.offset(offset)
    if limit is not None:
        stmt = stmt.limit(limit)
    return db.scalars(stmt).all()


@router.get("/{id}", response_model=EmployeeRead, summary="Get an employee")
def get_employee(id: int, db: DbDep):
    return allocation_service.get_or_404(db, Employee, id, "Employee")


@router.put("/{id}", response_model=EmployeeRead, summary="Update an employee")
def update_employee(id: int, payload: EmployeeUpdate, db: DbDep):
    employee = allocation_service.get_or_404(db, Employee, id, "Employee")
    fields = payload.model_dump(exclude_unset=True)

    if "email" in fields:
        fields["email"] = fields["email"].strip().lower()
        if fields["email"] != employee.email.lower():
            _ensure_email_free(db, fields["email"])
    if "employee_code" in fields and fields["employee_code"] != employee.employee_code:
        _ensure_code_free(db, fields["employee_code"])
    if "project_id" in fields and fields["project_id"] != employee.project_id:
        _ensure_project_exists(db, fields["project_id"])
    if fields.get("status") == "EXITED" and employee.status != "EXITED":
        # Same seat release as DELETE (rule 3) — no orphaned ACTIVE allocation.
        allocation_service.release_employee_seat(db, employee)

    for key, value in fields.items():
        setattr(employee, key, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Update conflicts with an existing employee."
        )
    db.refresh(employee)
    return employee


@router.delete(
    "/{id}",
    response_model=EmployeeRead,
    summary="Deactivate an employee (soft delete: EXITED + seat released)",
)
def deactivate_employee(id: int, db: DbDep):
    return allocation_service.deactivate_employee(db, id)
