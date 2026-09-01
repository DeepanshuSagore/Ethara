"""Ethara backend — FastAPI application entrypoint.

Routers are mounted at ROOT paths per the brief (e.g. /employees,
/seats/allocate — no version prefix); Swagger at /docs, ReDoc at /redoc.
"""
from typing import Annotated, Any

from fastapi import Depends, FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app import models  # noqa: F401 — imported for its side effect: registers every table on Base
from app.api import ai, allocations, dashboard, employees, projects, seats
from app.core.config import settings
from app.core.database import get_db

app = FastAPI(
    title="Ethara API",
    description="Seat Allocation & Project Mapping System",
    version="0.1.0",
    openapi_tags=[
        {"name": "Employees", "description": "Employee lifecycle, search & filters"},
        {"name": "Projects", "description": "Project mapping & team membership"},
        {"name": "Seats", "description": "Seat inventory, allocation & release"},
        {"name": "Dashboard", "description": "Live metrics, recomputed per request"},
        {"name": "AI Assistant", "description": "Natural-language queries over the directory"},
        {"name": "meta", "description": "Service info & health"},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DbDep = Annotated[Session, Depends(get_db)]


@app.get("/", tags=["meta"])
def root() -> dict:
    return {"name": "Ethara API", "version": app.version, "docs": "/docs"}


@app.get(
    "/health",
    tags=["meta"],
    summary="Liveness plus a real database round trip",
    responses={503: {"description": "The database did not answer."}},
)
def health(db: DbDep, response: Response) -> dict[str, Any]:
    """One `SELECT 1` and nothing else.

    Uptime monitors and the keep-alive ping hit this constantly, so it never
    touches an application table. A 503 here means the API is up but cannot
    reach its database, which is the state the old static `{"status": "ok"}`
    reported as healthy.
    """
    try:
        db.execute(text("SELECT 1"))
        database = "up"
    except SQLAlchemyError:
        database = "down"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {
        "status": "ok" if database == "up" else "degraded",
        "database": database,
        "dialect": db.get_bind().dialect.name,
        "version": app.version,
        # Whether a key is configured, never the key itself.
        "groq_configured": bool(settings.groq_api_key),
    }


app.include_router(employees.router)
app.include_router(projects.router)
app.include_router(seats.router)
app.include_router(allocations.router)
app.include_router(dashboard.router)
app.include_router(ai.router)
