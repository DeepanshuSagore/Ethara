# Ethara — Seat Allocation & Project Mapping System

A full-stack platform to manage **seat allocation** and **project mapping** for ~5,000 employees,
serving Employee, HR, Admin, and Project-team workflows — with search, analytics dashboards, and a
natural-language AI assistant.

> Built as a technical assessment. See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for the full phased plan
> and [AI_PROMPTS.md](./AI_PROMPTS.md) for AI-tool usage documentation.

---

## ✨ Features

- **Employee Management** — directory, profiles, department/designation, lifecycle status.
- **Project Mapping** — assign employees to projects, track membership & seat demand.
- **Seat Allocation & Release** — allocate/free seats across Floor → Zone → Bay → Seat.
- **New Joiner Allocation** — pending-allocation queue and fast onboarding flow.
- **Search & Filter** — across employees, seats, and projects.
- **Dashboard & Analytics** — seat utilization, vacancy, headcount, per-floor/project metrics.
- **AI Assistant** — ask questions in plain English: Groq (Llama 3.3) parses the question into a
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
| Database  | PostgreSQL                                                    |
| Auth      | Demo Mode — role switcher (Admin / HR / Project / Employee)  |
| AI        | Groq API (Llama 3.3) with deterministic fallback             |
| Deploy    | Vercel (frontend) · Render (backend + managed PostgreSQL 17) |

---

## 📁 Repository Structure

```
Ethara/
├── frontend/          # Next.js app (UI, routing, components)
├── backend/           # FastAPI app (models, APIs, services, seed)
├── screenshots/       # captured from the live deployment
├── PROJECT_PLAN.md    # Phased build plan
├── AI_PROMPTS.md      # AI-tool usage log
├── DATABASE_SCHEMA.md # ER description + DDL
├── DEPLOYMENT.md      # deploy steps & gotchas
├── DEBUGGING_NOTES.md # issues & resolutions
└── README.md
```

---

## 🚀 Getting Started

Run both servers together — the frontend reads live data from the API.

### 1. Backend (FastAPI on :8000)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head             # create the schema (SQLite by default)
python -m app.seed.run           # seed ~5,000 employees / 5,600 seats / 11 projects
uvicorn app.main:app --reload    # http://localhost:8000  (Swagger at /docs)
```

### 2. Frontend (Next.js on :3000)
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

> Free-tier note: the Render backend cold-starts after ~15 min of inactivity — the **first**
> request can take ~50 s (the UI shows loading skeletons meanwhile). Everything after that is
> snappy. Details + deploy steps in [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## 📚 Documentation

- [PROJECT_PLAN.md](./PROJECT_PLAN.md) — phased plan & architecture
- [AI_PROMPTS.md](./AI_PROMPTS.md) — AI usage log
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) — schema & DDL
- [DEPLOYMENT.md](./DEPLOYMENT.md) — deploy steps, env vars, free-tier gotchas
- [DEBUGGING_NOTES.md](./DEBUGGING_NOTES.md) — issues & resolutions
- [screenshots/](./screenshots/) — captured from the live deployment

---

## 📄 License

Assessment project — not licensed for redistribution.
