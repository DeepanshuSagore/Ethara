# Ethara — Seat Allocation & Project Mapping System

[![CI](https://github.com/DeepanshuSagore/Ethara/actions/workflows/ci.yml/badge.svg)](https://github.com/DeepanshuSagore/Ethara/actions/workflows/ci.yml)

A full-stack platform to manage **seat allocation** and **project mapping** for ~5,000 employees,
serving Employee, HR, Admin, and Project-team workflows — with search, analytics dashboards, and a
natural-language AI assistant.

Every push runs `ruff` → `mypy` → the suite against **both SQLite and PostgreSQL 17** → both Docker
images.

> Built as a technical assessment. See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for the full phased plan
> and [AI_PROMPTS.md](./AI_PROMPTS.md) for AI-tool usage documentation.

---

## 📊 Measured results

Every figure below comes from a command in this repo, run on the Compose stack. None are estimates.

| Metric | Value | How it was measured |
|---|---|---|
| Tests | **94 tests · 188 runs** | Each test runs once per engine — `pytest` |
| Coverage | **77%** branch · 91% excluding the seed CLI | `pytest --cov=app --cov-report=term-missing` |
| Suite wall clock | 1.1 s SQLite · 10 s both engines | `pytest` with and without `TEST_DATABASE_URL` |
| CI | ruff · mypy · suite on Postgres · both images | [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) |
| Container cold start | **12 s** to all services healthy | `docker compose down -v && docker compose up -d`, including migrations and seeding |
| API p50 / p95 | **2.3 ms / 2.9 ms** | 1,000 requests across five endpoints, kept-alive, against the seeded Postgres |
| Image sizes | 344 MB API · 433 MB frontend | `docker images` — multi-stage, non-root, standalone Next.js output |
| Seeded dataset | 4,987 employees · 5,600 seats · 11 projects · 4,907 allocations | `python -m app.seed.verify` — 23 invariant checks |

The cold-start number is the one worth reading twice: it covers Postgres starting, Alembic
migrating, and ~15,000 rows being seeded before the API reports healthy. Seeding is skipped on
later boots because the data is already there.

## 🧪 Testing

The suite runs against **two engines**, and the second one is the point.

```bash
cd backend
pytest                                   # SQLite only — 94 passed, 94 skipped, ~1 s

docker compose up -d db
docker compose exec db psql -U ethara -d postgres -c "CREATE DATABASE ethara_test OWNER ethara;"
TEST_DATABASE_URL=postgresql+psycopg://ethara:ethara@localhost:5433/ethara_test pytest
                                         # both engines — 188 passed, ~10 s
```

SQLite is the fast default so the suite runs on every save. Production runs Postgres, and the two
disagree about `LIKE` case sensitivity, `VARCHAR(n)` enforcement, type affinity and row order
without an `ORDER BY` — so a green SQLite-only run proves the development schema is correct and
says nothing about the deployed one. Nothing is marked single-engine; every test runs on both.

Full detail, including what running it on Postgres did and did not find, is in
[backend/README.md](./backend/README.md#testing).

---

## ✨ Features

- **Employee Management** — directory, profiles, department/designation, lifecycle status.
- **Project Mapping** — assign employees to projects, track membership & seat demand.
- **Seat Allocation & Release** — allocate/free seats across Floor → Zone → Bay → Seat.
- **New Joiner Allocation** — pending-allocation queue and fast onboarding flow.
- **Search & Filter** — across employees, seats, and projects.
- **Dashboard & Analytics** — seat utilization, vacancy, headcount, per-floor/project metrics.
- **AI Assistant** — ask questions in plain English: Groq (GPT-OSS 120B) parses the question into a
  structured intent, answers are composed from real DB rows, and a deterministic engine takes
  over automatically if Groq is unavailable — the demo never breaks.
- **Demo Mode** — instant role switcher (Admin / HR / Project / Employee), no login required.
- **REST API** — every endpoint from the brief, documented live in Swagger at `/docs`.
- **Seed data** — deterministic Faker dataset with organic distributions: 4,987 employees ·
  5,600 seats · 11 projects sized on a power curve (933 down to 190 people) · floors running
  79-95% occupied · 534 available / 118 reserved / 41 maintenance seats · 57 pending joiners.

---

## 🧱 Tech Stack

| Layer     | Technology                                                    |
|-----------|---------------------------------------------------------------|
| Frontend  | Next.js (App Router) · TypeScript · Tailwind CSS · TanStack Query |
| Backend   | FastAPI · Pydantic · SQLAlchemy 2.0 · Alembic                 |
| Database  | PostgreSQL 17 (Neon)                                          |
| Auth      | Demo Mode — role switcher (Admin / HR / Project / Employee)  |
| AI        | Groq API (GPT-OSS 120B) with deterministic fallback             |
| Containers| Multi-stage Docker · Compose (Postgres 17 + API + frontend)   |
| Quality   | ruff · mypy (staged strict) · pytest on two engines · GitHub Actions |
| Ops       | JSON logs with request ids · DB-backed `/health` · per-IP rate limiting |
| Deploy    | Vercel (frontend) · Render (backend) · Neon (database)       |

---

## 📁 Repository Structure

```
Ethara/
├── frontend/          # Next.js app (UI, routing, components) + Dockerfile
├── backend/           # FastAPI app (models, APIs, services, seed) + Dockerfile
├── compose.yaml       # db + api + frontend, healthchecked and ordered
├── .env.example       # every variable compose reads, all with working defaults
├── .github/workflows/ # CI: lint, types, tests on Postgres, both images
├── screenshots/       # captured from the live deployment
├── PROJECT_PLAN.md    # Phased build plan
├── AI_PROMPTS.md      # AI-tool usage log
├── DATABASE_SCHEMA.md # ER description + DDL
├── DEPLOYMENT.md      # deploy steps & gotchas
├── DEBUGGING_NOTES.md # issues & resolutions
├── FUTURE.md          # deferred work, with the reasoning for each deferral
└── README.md
```

---

## 🚀 Getting Started

### One command (Docker)

Needs Docker only — no Python, no Node, no database setup.

```bash
git clone https://github.com/DeepanshuSagore/Ethara.git
cd Ethara
docker compose up --build
```

That brings up PostgreSQL 17, applies the Alembic migrations, seeds ~4,987
employees / 5,600 seats / 11 projects on the first run, and serves:

| | |
|---|---|
| UI | http://localhost:3000 |
| API | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |

The API waits for Postgres to report *healthy* before migrating, and the
frontend waits for the API, so the first run on a clean machine works without
retries. Seeding is skipped on later boots because the data is already there;
to rebuild the dataset deliberately:

```bash
docker compose run --rm seed
```

Every setting has a working default. Copy `.env.example` to `.env` only if you
want to change ports, database credentials, or add a `GROQ_API_KEY` — the
assistant runs on its deterministic engine without one.

### Running it directly (no Docker)

Run both servers together — the frontend reads live data from the API.

#### 1. Backend (FastAPI on :8000)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head             # create the schema (SQLite by default)
python -m app.seed.run           # seed ~5,000 employees / 5,600 seats / 11 projects
uvicorn app.main:app --reload    # http://localhost:8000  (Swagger at /docs)
```

#### 2. Frontend (Next.js on :3000)
```bash
cd frontend
npm install
cp .env.local.example .env.local # optional — defaults to http://localhost:8000
npm run dev                      # http://localhost:3000
```

With both up, the dashboard shows the live seeded volumes (4,987 employees,
5,600 seats, 88% utilization), and every allocate/release/add-joiner action round-trips
through the API (try asking the Assistant: *"Where is my seat? My email is amit@ethara.ai"*).

---

## 🔗 Live URLs

| Resource        | URL              |
|-----------------|------------------|
| Frontend        | https://ethara-snowy.vercel.app |
| Backend / API   | https://ethara-api-edmu.onrender.com |
| Swagger docs    | https://ethara-api-edmu.onrender.com/docs |

> The backend is kept warm by a 10-minute keep-alive ping, so the usual free-tier ~50 s
> cold start doesn't apply — a first load lands in well under a second. How that is budgeted
> against Render's free instance-hours, and why the database lives on Neon rather than Render,
> is in [DEPLOYMENT.md](./DEPLOYMENT.md) §8 and §5.

---

## 📚 Documentation

- [PROJECT_PLAN.md](./PROJECT_PLAN.md) — phased plan & architecture
- [backend/README.md](./backend/README.md) — endpoints, the two test tiers, logging, assistant guards
- [AI_PROMPTS.md](./AI_PROMPTS.md) — AI usage log
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) — schema & DDL
- [DEPLOYMENT.md](./DEPLOYMENT.md) — deploy steps, env vars, free-tier gotchas
- [DEBUGGING_NOTES.md](./DEBUGGING_NOTES.md) — issues & resolutions
- [FUTURE.md](./FUTURE.md) — what was deliberately left undone, and why
- [screenshots/](./screenshots/) — captured from the live deployment

---

## 📄 License

Assessment project — not licensed for redistribution.
