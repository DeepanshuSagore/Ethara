"""Shared model helpers — status vocabularies and UTC timestamp default.

Status values are stored as plain strings with CHECK constraints (portable
across SQLite and PostgreSQL, unlike native enums) and mirror
frontend/src/types/index.ts exactly.
"""
from datetime import datetime, timezone

EMPLOYEE_STATUSES = ("ACTIVE", "ON_LEAVE", "EXITED", "PENDING_ALLOCATION")
PROJECT_STATUSES = ("ACTIVE", "ON_HOLD", "COMPLETED")
SEAT_STATUSES = ("AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE")
ALLOCATION_STATUSES = ("ACTIVE", "RELEASED")


def utcnow() -> datetime:
    """Timezone-aware UTC now — all timestamps are stored as UTC."""
    return datetime.now(timezone.utc)


def status_check(column: str, values: tuple[str, ...]) -> str:
    """SQL text for a status CHECK constraint, portable on SQLite + Postgres."""
    quoted = ", ".join(f"'{v}'" for v in values)
    return f"{column} IN ({quoted})"
