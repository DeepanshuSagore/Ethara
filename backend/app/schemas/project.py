"""Project request/response schemas (mirrors frontend Project type)."""
from datetime import datetime

from pydantic import BaseModel

from app.schemas.base import ProjectStatus, ReadSchema


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    manager_name: str
    status: ProjectStatus = "ACTIVE"


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    manager_name: str | None = None
    status: ProjectStatus | None = None


class ProjectRead(ReadSchema):
    id: int
    name: str
    description: str
    manager_name: str
    status: ProjectStatus
    created_at: datetime
