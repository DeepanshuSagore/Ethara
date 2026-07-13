"""Phase 4 smoke tests — models create, FKs work, DB-level rules hold.

Covers the schema-enforceable business rules from PROJECT_PLAN.md §3:
rule 1 (one ACTIVE allocation per employee), rule 2 (one ACTIVE employee per
seat), rule 6 (duplicate email rejected), rule 7 (duplicate seat position
rejected).
"""
from datetime import datetime, timezone

import pytest
from sqlalchemy.exc import IntegrityError

from app.models import Employee, Project, Seat, SeatAllocation
from app.schemas import EmployeeRead, ProjectRead, SeatAllocationRead, SeatRead

NOW = datetime(2026, 7, 13, tzinfo=timezone.utc)


def make_project(**overrides):
    defaults = dict(name="Indigo", description="Core platform", manager_name="Priya Patel")
    return Project(**{**defaults, **overrides})


def make_employee(project, **overrides):
    defaults = dict(
        employee_code="ETH-0001",
        name="Amit Sharma",
        email="amit@ethara.ai",
        department="Engineering",
        role="Software Engineer",
        joining_date=NOW,
        status="ACTIVE",
        project=project,
    )
    return Employee(**{**defaults, **overrides})


def make_seat(**overrides):
    defaults = dict(floor=1, zone="B", bay=4, seat_number=23, seat_code="B4-23")
    return Seat(**{**defaults, **overrides})


def test_tables_created(engine):
    from sqlalchemy import inspect

    names = set(inspect(engine).get_table_names())
    assert {"employees", "projects", "seats", "seat_allocations"} <= names


def test_insert_row_with_fks_and_read_schemas(db):
    project = make_project()
    employee = make_employee(project)
    seat = make_seat(status="OCCUPIED")
    db.add_all([project, employee, seat])
    db.flush()
    allocation = SeatAllocation(
        employee_id=employee.id,
        seat_id=seat.id,
        project_id=project.id,
        allocation_date=NOW,
    )
    db.add(allocation)
    db.commit()

    assert allocation.allocation_status == "ACTIVE"
    assert employee.created_at is not None and employee.updated_at is not None
    # Read schemas mirror the frontend types field-for-field.
    assert EmployeeRead.model_validate(employee).email == "amit@ethara.ai"
    assert ProjectRead.model_validate(project).status == "ACTIVE"
    assert SeatRead.model_validate(seat).seat_code == "B4-23"
    assert SeatAllocationRead.model_validate(allocation).released_date is None


def test_fk_integrity_enforced(db):
    db.add(
        SeatAllocation(employee_id=999, seat_id=999, project_id=999, allocation_date=NOW)
    )
    with pytest.raises(IntegrityError):
        db.commit()


def test_duplicate_email_rejected(db):
    project = make_project()
    db.add(make_employee(project))
    db.commit()
    db.add(make_employee(project, employee_code="ETH-0002", name="Amit Two"))
    with pytest.raises(IntegrityError):
        db.commit()


def test_duplicate_seat_position_rejected(db):
    db.add(make_seat())
    db.commit()
    # Same (floor, zone, bay, seat_number) — rejected even with another code.
    db.add(make_seat(seat_code="dup"))
    with pytest.raises(IntegrityError):
        db.commit()


def test_same_position_on_other_floor_allowed(db):
    db.add_all([make_seat(), make_seat(floor=2)])
    db.commit()


def test_second_active_allocation_per_employee_rejected(db):
    project = make_project()
    employee = make_employee(project)
    seat_a, seat_b = make_seat(), make_seat(seat_number=24, seat_code="B4-24")
    db.add_all([project, employee, seat_a, seat_b])
    db.flush()
    db.add(
        SeatAllocation(
            employee_id=employee.id, seat_id=seat_a.id, project_id=project.id,
            allocation_date=NOW,
        )
    )
    db.commit()
    db.add(
        SeatAllocation(
            employee_id=employee.id, seat_id=seat_b.id, project_id=project.id,
            allocation_date=NOW,
        )
    )
    with pytest.raises(IntegrityError):
        db.commit()


def test_second_active_allocation_per_seat_rejected(db):
    project = make_project()
    emp_a = make_employee(project)
    emp_b = make_employee(project, employee_code="ETH-0002", email="priya@ethara.ai")
    seat = make_seat()
    db.add_all([project, emp_a, emp_b, seat])
    db.flush()
    db.add(
        SeatAllocation(
            employee_id=emp_a.id, seat_id=seat.id, project_id=project.id,
            allocation_date=NOW,
        )
    )
    db.commit()
    db.add(
        SeatAllocation(
            employee_id=emp_b.id, seat_id=seat.id, project_id=project.id,
            allocation_date=NOW,
        )
    )
    with pytest.raises(IntegrityError):
        db.commit()


def test_released_history_allows_new_active_allocation(db):
    """The unique indexes are partial: RELEASED rows don't block re-allocation."""
    project = make_project()
    employee = make_employee(project)
    seat = make_seat()
    db.add_all([project, employee, seat])
    db.flush()
    first = SeatAllocation(
        employee_id=employee.id, seat_id=seat.id, project_id=project.id,
        allocation_date=NOW,
    )
    db.add(first)
    db.commit()

    first.allocation_status = "RELEASED"
    first.released_date = NOW
    db.commit()

    db.add(
        SeatAllocation(
            employee_id=employee.id, seat_id=seat.id, project_id=project.id,
            allocation_date=NOW,
        )
    )
    db.commit()  # succeeds — only one ACTIVE row exists


def test_invalid_status_rejected_by_check_constraint(db):
    db.add(make_seat(status="BROKEN"))
    with pytest.raises(IntegrityError):
        db.commit()
