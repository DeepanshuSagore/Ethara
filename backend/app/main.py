"""Ethara backend — FastAPI application entrypoint.

Phase 4: app + CORS + full ORM schema registered (models imported below).
REST routers land in Phase 6, mounted at ROOT paths per the brief
(e.g. /employees, /seats/allocate — no version prefix).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models  # noqa: F401 — register all tables on Base at import time
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


# Routers mounted in Phase 6 at root paths (exact spec paths from the brief):
# from app.api import employees, projects, seats, dashboard, ai
# app.include_router(employees.router)   # POST/GET /employees ...
