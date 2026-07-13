"""Project request/response schemas (mirrors frontend Project type)."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.base import ProjectStatus, ReadSchema


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    manager_name: str
    status: ProjectStatus = "ACTIVE"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    manager_name: Optional[str] = None
    status: Optional[ProjectStatus] = None


class ProjectRead(ReadSchema):
    id: int
    name: str
    description: str
    manager_name: str
    status: ProjectStatus
    created_at: datetime
