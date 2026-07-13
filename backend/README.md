# Ethara Backend (FastAPI)

REST API for the Ethara Seat Allocation & Project Mapping System.

## Setup
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then fill values
alembic upgrade head          # create the schema (SQLite by default)
python -m app.seed.run        # seed data (see below)
uvicorn app.main:app --reload
```
Run the schema smoke tests with `pytest`. The DB is `DATABASE_URL`-driven: SQLite locally,
PostgreSQL (`postgresql+psycopg://…`, psycopg v3) on Render — see
[../DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md).
- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Seed data
```bash
python -m app.seed.run        # wipe + repopulate all four tables, then verify
python -m app.seed.verify     # re-run just the verification (summary + asserts)
```
Deterministic (fixed seed + fixed base date — reruns produce identical data) and idempotent
(each run wipes and repopulates in one transaction). Targets from PROJECT_PLAN §5b:
**11 projects** (exact names, all ACTIVE) · **5,600 seats** (5 floors × 2 zones × 80 bays × 7,
`seat_code = {zone}{bay}-{seat_number}`) · **5,000 employees** (unique `@ethara.ai` emails,
employee #1 = Amit Sharma / amit@ethara.ai) · **4,940 ACTIVE allocations** clustered around each
project's home zone · seat statuses 510 AVAILABLE / 100 RESERVED / 50 MAINTENANCE / 4,940 OCCUPIED.
`verify` exits non-zero if any §5b target or invariant fails. Works unchanged against Postgres
(`DATABASE_URL`-driven).

## Structure
```
app/
├── main.py        # FastAPI entrypoint (CORS, routers)
├── core/          # config + db session
├── models/        # SQLAlchemy models
├── schemas/       # Pydantic schemas
├── api/           # REST routers, mounted at root paths (Phase 6)
├── services/      # business logic         (Phase 6)
└── seed/          # Faker seed generator   (Phase 5)
```

See [../PROJECT_PLAN.md](../PROJECT_PLAN.md) for the full plan.
