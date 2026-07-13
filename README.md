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
- **Seat Allocation & Release** — allocate/free seats across Building → Floor → Zone → Seat.
- **New Joiner Allocation** — pending-allocation queue and fast onboarding flow.
- **Search & Filter** — across employees, seats, and projects.
- **Dashboard & Analytics** — seat utilization, vacancy, headcount, per-floor/project metrics.
- **AI Assistant** — ask questions in plain English (powered by Groq).
- **Two modes** — Demo Mode (instant role switcher) and Normal Mode (Clerk login with roles).

---

## 🧱 Tech Stack

| Layer     | Technology                                                    |
|-----------|---------------------------------------------------------------|
| Frontend  | Next.js (App Router) · TypeScript · Tailwind CSS · TanStack Query |
| Backend   | FastAPI · Pydantic · SQLAlchemy 2.0 · Alembic                 |
| Database  | PostgreSQL                                                    |
| Auth      | Clerk (Normal Mode) + role switcher (Demo Mode)              |
| AI        | Groq API (Llama 3.x) with deterministic fallback             |
| Deploy    | Vercel (frontend) · Render (backend + Postgres)             |

---

## 📁 Repository Structure

```
Ethara/
├── frontend/          # Next.js app (UI, routing, components)
├── backend/           # FastAPI app (models, APIs, services, seed)
├── PROJECT_PLAN.md    # Phased build plan
├── AI_PROMPTS.md      # AI-tool usage log
└── README.md
```

---

## 🚀 Getting Started

### Frontend
```bash
cd frontend
npm install
npm run dev            # http://localhost:3000
```

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload    # http://localhost:8000  (Swagger at /docs)
```

---

## 🔗 Live URLs

| Resource        | URL              |
|-----------------|------------------|
| Frontend        | _added at deploy_ |
| Backend / API   | _added at deploy_ |
| Swagger docs    | _added at deploy_ |

---

## 📚 Documentation

- [PROJECT_PLAN.md](./PROJECT_PLAN.md) — phased plan & architecture
- [AI_PROMPTS.md](./AI_PROMPTS.md) — AI usage log
- `DATABASE_SCHEMA.md` — schema & DDL _(Phase 4)_
- `DEPLOYMENT.md` — deploy steps & env _(Phase 9)_
- `DEBUGGING_NOTES.md` — issues & resolutions _(ongoing)_

---

## 📄 License

Assessment project — not licensed for redistribution.
