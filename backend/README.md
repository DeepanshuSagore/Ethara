# Ethara Backend (FastAPI)

REST API for the Ethara Seat Allocation & Project Mapping System.

## Setup
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then fill values
alembic upgrade head          # create the schema (SQLite by default)
uvicorn app.main:app --reload
```
Run the schema smoke tests with `pytest`. The DB is `DATABASE_URL`-driven: SQLite locally,
PostgreSQL (`postgresql+psycopg://…`, psycopg v3) on Render — see
[../DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md).
- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

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
