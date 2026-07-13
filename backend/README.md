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
Run the tests with `pytest` (47: schema smoke + endpoint contracts + every allocation rule).
The DB is `DATABASE_URL`-driven: SQLite locally, PostgreSQL (`postgresql+psycopg://…`,
psycopg v3) on Render — see [../DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md).
- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Endpoints (Phase 6 — exact paths from the brief, no version prefix)

| Method & path | Purpose | Errors |
|---|---|---|
| `POST /employees` | Create (new joiners default to `PENDING_ALLOCATION`) | 404 unknown project · 409 duplicate email/code (rule 6) · 422 |
| `GET /employees` | List — `?search=&department=&role=&project_id=&status=` (+ optional `limit`/`offset`) | 422 bad status |
| `GET /employees/{id}` | Detail | 404 |
| `PUT /employees/{id}` | Partial update; `status=EXITED` releases the seat | 404 · 409 duplicate email |
| `DELETE /employees/{id}` | **Deactivate** (soft): `EXITED` + seat released, history kept | 404 |
| `POST /projects` | Create | 409 duplicate name |
| `GET /projects` | List | — |
| `GET /projects/{id}` | Detail (convenience) | 404 |
| `GET /projects/{id}/employees` | Team members | 404 |
| `POST /seats` | Create (`seat_code` derived when omitted) | 409 duplicate position (rule 7) |
| `GET /seats` | List — `?status=&floor=&zone=` (+ `limit`/`offset`) | 422 bad status |
| `GET /seats/available` | Available seats (optional `?floor=&zone=`) | — |
| `GET /seats/suggestions` | Rule-5 ranking for a joiner — `?employee_id=&limit=` | 404 |
| `POST /seats/allocate` | `{employee_id, seat_id}` → 201 allocation | 404 · 409 rules 1/2/4 |
| `POST /seats/release` | `{seat_id}` → allocation `RELEASED`, seat `AVAILABLE` (rule 3) | 404 · 409 no active allocation |
| `GET /seats/{id}` | Detail (convenience) | 404 |
| `GET /dashboard/summary` | Live headline metrics (rule 8) | — |
| `GET /dashboard/project-utilization` | Headcount/seated/home zone per project | — |
| `GET /dashboard/floor-utilization` | Seat counts + occupancy per floor | — |
| `POST /ai/query` | `{"query": "…"}` → `{"answer": "…"}` — deterministic keyword engine (Groq in Phase 8) | 422 empty query |

Example:
```bash
curl -X POST localhost:8000/ai/query -H 'Content-Type: application/json' \
  -d '{"query": "Where is my seat? My email is amit@ethara.ai"}'
# → {"answer":"Amit Sharma is seated on Floor 1, Zone A, Bay 1, Seat A1-1. …"}
```

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
├── api/           # REST routers, mounted at root paths (thin — Phase 6)
├── services/      # business logic: allocation rules, dashboard, AI query (Phase 6)
└── seed/          # Faker seed generator   (Phase 5)
```

See [../PROJECT_PLAN.md](../PROJECT_PLAN.md) for the full plan.
