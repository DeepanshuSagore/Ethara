"""SQLAlchemy models — importing this package registers all tables on Base.

Alembic env.py and app.main both import from here so autogenerate and the
running app always see the full schema.
"""
from app.models.employee import Employee
from app.models.project import Project
from app.models.seat import Seat
from app.models.seat_allocation import SeatAllocation

__all__ = ["Employee", "Project", "Seat", "SeatAllocation"]
