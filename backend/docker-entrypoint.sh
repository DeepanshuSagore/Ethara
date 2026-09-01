#!/bin/sh
# Container start: bring the schema up to date, populate an empty database
# once, then hand off to uvicorn as PID 1.
set -e

echo "[entrypoint] applying migrations"
alembic upgrade head

# Seeding is skipped whenever data is already present, so a restart costs
# nothing. Re-seed deliberately with: docker compose run --rm seed
python - <<'PY'
from sqlalchemy import func, select

from app.core.database import SessionLocal
from app.models import Employee

with SessionLocal() as session:
    existing = session.scalar(select(func.count()).select_from(Employee)) or 0

if existing:
    print(f"[entrypoint] {existing} employees present, skipping seed")
else:
    print("[entrypoint] empty database, seeding")
    from app.seed.run import seed

    seed()
PY

echo "[entrypoint] starting uvicorn"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
