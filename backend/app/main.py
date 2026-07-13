"""Ethara backend — FastAPI application entrypoint.

Routers are mounted at ROOT paths per the brief (e.g. /employees,
/seats/allocate — no version prefix); Swagger at /docs, ReDoc at /redoc.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models  # noqa: F401 — register all tables on Base at import time
from app.api import ai, dashboard, employees, projects, seats
from app.core.config import settings

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


@app.get("/", tags=["meta"])
def root() -> dict:
    return {"name": "Ethara API", "version": app.version, "docs": "/docs"}


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok"}


app.include_router(employees.router)
app.include_router(projects.router)
app.include_router(seats.router)
app.include_router(dashboard.router)
app.include_router(ai.router)
