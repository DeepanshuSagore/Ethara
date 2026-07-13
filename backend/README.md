# Ethara Backend (FastAPI)

REST API for the Ethara Seat Allocation & Project Mapping System.

## Setup
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then fill values
uvicorn app.main:app --reload
```
- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Structure
```
app/
├── main.py        # FastAPI entrypoint (CORS, routers)
├── core/          # config + db session
├── models/        # SQLAlchemy models      (Phase 4)
├── schemas/       # Pydantic schemas       (Phase 4)
├── api/v1/        # REST routers           (Phase 6)
├── services/      # business logic         (Phase 6)
└── seed/          # Faker seed generator   (Phase 5)
```

See [../PROJECT_PLAN.md](../PROJECT_PLAN.md) for the full plan.
