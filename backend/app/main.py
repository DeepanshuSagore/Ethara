"""Ethara backend — FastAPI application entrypoint.

Phase 0: minimal app with health check + CORS. Routers, models, and services are
mounted in later phases (see PROJECT_PLAN.md).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

app = FastAPI(
    title="Ethara API",
    description="Seat Allocation & Project Mapping System",
    version="0.1.0",
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


# Routers mounted in Phase 6:
# from app.api.v1 import employees, projects, seats, allocations, analytics, assistant
# app.include_router(employees.router, prefix="/api/v1")
