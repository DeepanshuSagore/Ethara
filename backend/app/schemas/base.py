"""Shared schema building blocks.

Status literals mirror frontend/src/types/index.ts exactly (same values, same
snake_case field names on every schema) so the Phase 7 mock→API swap is
mechanical.
"""
from typing import Literal

from pydantic import BaseModel, ConfigDict

EmployeeStatus = Literal["ACTIVE", "ON_LEAVE", "EXITED", "PENDING_ALLOCATION"]
ProjectStatus = Literal["ACTIVE", "ON_HOLD", "COMPLETED"]
SeatStatus = Literal["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"]
AllocationStatus = Literal["ACTIVE", "RELEASED"]


class ReadSchema(BaseModel):
    """Base for Read models built from ORM rows."""

    model_config = ConfigDict(from_attributes=True)
