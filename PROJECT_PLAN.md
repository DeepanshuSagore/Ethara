# Ethara — Seat Allocation & Project Mapping System
### Master Project Plan

> Assessment: Build a full-stack application to manage seat allocation and project mapping
> for ~5,000 employees across Employee / HR / Admin / Project-team roles.
> **Timeline:** ~2 days. **Strategy:** UI-first, phase-by-phase, commit + document each phase.

---

## 1. Vision & Scope

A seat-allocation and project-mapping platform that lets HR/Admin manage where ~5,000 employees
sit, which projects they belong to, seat availability & utilization, and a fast onboarding flow for
new joiners — all searchable, with a dashboard and a natural-language AI assistant on top.

### Core capability areas (from the brief)
1. Employee Management
2. Project Mapping
3. Seat Allocation & Release
4. New Joiner Seat Allocation
5. Search & Filter
6. Dashboard & Analytics
7. AI Assistant / Natural-Language Query
8. REST APIs (documented / Swagger)
9. Seed Data Generation (~5,000 employees)

### Roles (v1 = role-aware UI, auth kept light)
- **Admin** — full control over employees, seats, projects, buildings.
- **HR** — employee lifecycle, new-joiner allocation.
- **Project team** — project membership & seat needs.
- **Employee** — read-only self view + directory/search.

> **Two modes:**
> - **Demo Mode** — role switcher (no login). Evaluators explore every role instantly. Default landing.
> - **Normal Mode** — real authentication via **Clerk**, with role-based access to assigned views.
>   Chosen over Firebase for its native Next.js App Router support, prebuilt auth UI, and roles/orgs.

---

## 2. Tech Stack & Deployment

| Layer      | Choice                                             | Deploy      |
|------------|----------------------------------------------------|-------------|
| Frontend   | Next.js (App Router) + TypeScript + Tailwind CSS   | Vercel      |
| UI kit     | Custom components + Radix primitives + lucide icons| —           |
| Data/fetch | TanStack Query + Zod-typed API client              | —           |
| Backend    | FastAPI + Pydantic + SQLAlchemy 2.0 + Alembic      | Render      |
| Database   | PostgreSQL                                         | Render (managed) |
| Auth       | Clerk (Normal Mode) + role-switcher (Demo Mode)    | Vercel      |
| AI         | Groq API (Llama 3.x) — NL → structured query       | via backend |
| Seed       | Python + Faker                                     | —           |

---

## 3. Data Model (draft — finalized in Phase 4)

Hierarchy to support 5,000 seats: **Building → Floor → Zone → Seat**.

- **Employee**: id, emp_code, full_name, email, phone, department, designation,
  employment_type (FULL_TIME / CONTRACT / INTERN), join_date, status
  (ACTIVE / ON_LEAVE / EXITED / PENDING_ALLOCATION), project_id (fk, nullable),
  seat_id (fk, nullable), is_new_joiner.
- **Project**: id, code, name, description, department, lead_employee_id (fk),
  start_date, end_date, status (PLANNING / ACTIVE / ON_HOLD / COMPLETED),
  required_seats.
- **Building**: id, name, code, address, total_floors.
- **Floor**: id, building_id (fk), floor_number, name, total_seats.
- **Zone**: id, floor_id (fk), name, wing.
- **Seat**: id, seat_code, zone_id (fk), seat_type (DESK / HOT_DESK / MANAGER / MEETING_ADJ),
  status (AVAILABLE / OCCUPIED / RESERVED / BLOCKED), employee_id (fk, nullable).
- **AllocationHistory**: id, seat_id, employee_id, action (ALLOCATED / RELEASED),
  allocated_by, timestamp, notes.
- **Department**: id, name, code (may stay an enum for v1).

### Key derived metrics
- Seat utilization = occupied / total (global, per building, per floor).
- Vacancy count & rate; reserved vs blocked.
- Headcount per project / department; projects over/under required_seats.
- New joiners pending allocation.

---

## 4. Frontend Architecture (industry-standard structure)

```
frontend/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (dashboard)/              # authenticated app shell (sidebar layout)
│   │   │   ├── layout.tsx            # sidebar + topbar + role switcher
│   │   │   ├── page.tsx              # Dashboard (analytics home)
│   │   │   ├── employees/
│   │   │   │   ├── page.tsx          # list + search + filters
│   │   │   │   └── [id]/page.tsx     # employee detail
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── seats/
│   │   │   │   ├── page.tsx          # seat map / grid + availability
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── new-joiners/page.tsx  # pending-allocation queue
│   │   │   ├── analytics/page.tsx    # deeper charts
│   │   │   └── assistant/page.tsx    # AI natural-language query
│   │   ├── layout.tsx                # root layout, providers, fonts
│   │   ├── globals.css
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── ui/                       # primitives: Button, Card, Input, Badge, Table, Dialog, Select, Tabs, Skeleton, Toast
│   │   ├── layout/                   # Sidebar, Topbar, RoleSwitcher, PageHeader
│   │   ├── charts/                   # UtilizationChart, HeadcountChart, DonutStat
│   │   ├── employees/                # EmployeeTable, EmployeeCard, EmployeeForm, EmployeeFilters
│   │   ├── projects/                 # ProjectTable, ProjectCard, ProjectForm
│   │   ├── seats/                    # SeatGrid, SeatCell, SeatLegend, AllocationDialog
│   │   └── assistant/                # ChatPanel, MessageBubble, SuggestedPrompts
│   ├── lib/
│   │   ├── api/                      # typed API client (fetch wrappers per resource)
│   │   ├── hooks/                    # useEmployees, useSeats, useProjects, useAnalytics ...
│   │   ├── mock/                     # mock data + generators (Phase 2, later removed/gated)
│   │   ├── utils.ts                  # cn(), formatters
│   │   └── constants.ts              # roles, statuses, nav config
│   ├── types/                        # shared TS types (Employee, Seat, Project ...) — mirror Zod schemas
│   └── config/                       # env, query client config
├── public/
├── .env.local.example
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Design system (the "very good UI" part)
- **Look:** clean, dense-but-airy admin console. Neutral slate base + a single brand accent.
  Rounded-2xl cards, soft shadows, subtle borders. Dark mode from day one.
- **Type:** Inter (or Geist). Clear scale, tabular numerals for metrics.
- **Motion:** minimal, purposeful (hover, dialog, skeletons). No gratuitous animation.
- **Accessibility:** keyboard nav, focus rings, aria labels, WCAG-AA contrast, both themes.
- **States:** every list/detail has loading (skeleton), empty, and error states.
- **Responsive:** collapsible sidebar; tables → cards on mobile.

---

## 5. Backend Architecture

```
backend/
├── app/
│   ├── main.py                 # FastAPI app, CORS, router mounts
│   ├── core/                   # config (pydantic-settings), db session, deps
│   ├── models/                 # SQLAlchemy models
│   ├── schemas/                # Pydantic request/response schemas
│   ├── api/v1/                 # routers: employees, projects, seats, allocations, analytics, assistant
│   ├── services/               # business logic (allocation, analytics, nl-query)
│   └── seed/                   # Faker-based seed generator
├── alembic/                    # migrations
├── tests/
├── requirements.txt
├── .env.example
└── README.md
```

### REST API surface (v1)
- `GET/POST /employees`, `GET/PATCH/DELETE /employees/{id}`, `?search=&department=&status=&project_id=`
- `GET/POST /projects`, `GET/PATCH/DELETE /projects/{id}`, `GET /projects/{id}/members`
- `GET /seats`, `GET /seats/{id}`, `?status=&floor=&building=`
- `POST /allocations/allocate` (seat_id, employee_id), `POST /allocations/release`
- `GET /new-joiners` (pending allocation), `POST /new-joiners/{id}/allocate`
- `GET /analytics/overview`, `/analytics/utilization`, `/analytics/projects`
- `POST /assistant/query` (natural-language → structured answer)
- `GET /docs` (Swagger), `GET /redoc`

---

## 6. Phase Plan (10 phases)

Each phase ends with: working increment → **commit** → docs updated (README/AI_PROMPTS as relevant).

| # | Phase | Goal | Key deliverables |
|---|-------|------|------------------|
| **0** | Foundation & Docs | Repo, tooling, docs skeleton | git init, `frontend/` + `backend/` scaffolds, README/AI_PROMPTS/PROJECT_PLAN, .gitignore, this plan |
| **1** | UI Design System | Reusable component kit + app shell | Tailwind theme, `ui/` primitives, Sidebar/Topbar, RoleSwitcher, routing skeleton, dark mode |
| **2** | Core UI Screens (mock data) | Every screen looks/feels complete | Dashboard, Employees (list+detail), Projects, Seats (seat map), New Joiners, Search, Assistant UI — all on typed mock data |
| **3** | Polish & States | Production-grade feel | Loading/empty/error states, responsive, a11y, toasts, filters, pagination |
| **4** | Backend Foundation + Schema | DB + models + migrations | FastAPI app, SQLAlchemy models, Alembic, Pydantic schemas, DB schema doc |
| **5** | Seed Data | ~5,000 employees + seats + projects | Faker seed script, buildings/floors/zones/seats, allocations, verify counts |
| **6** | REST APIs | All endpoints + Swagger | CRUD, search/filter, allocation, analytics endpoints, Swagger documented |
| **7** | Frontend ↔ Backend Integration | Replace mocks with real API | Typed API client, TanStack Query hooks, wire every screen, env config |
| **8** | AI Assistant | NL query interface end-to-end | Claude-backed `/assistant/query`, chat UI wired, suggested prompts, guardrails |
| **9** | Deploy + Final Docs | Live + submission bundle | Vercel + Render deploy, env, screenshots, README, AI_PROMPTS, schema, deployment & debugging notes |

> Phases 1–3 are the **UI-first focus** you asked for. Backend (4–6) can even be built in parallel
> by me while you review UI, but we'll go sequentially and commit cleanly unless you say otherwise.

---

## 7. Documentation Deliverables (tracked continuously)
- `README.md` — overview, architecture, local setup, live URLs, features, tech stack.
- `AI_PROMPTS.md` — every significant AI prompt, output summary, manual fixes, validation. **Updated every phase.**
- `PROJECT_PLAN.md` — this file (kept current).
- `DATABASE_SCHEMA.md` — ER description + DDL (Phase 4).
- `DEPLOYMENT.md` — deploy steps, env vars, gotchas (Phase 9).
- `DEBUGGING_NOTES.md` — issues hit + resolutions (ongoing).
- Swagger/OpenAPI at `/docs` (Phase 6).
- `screenshots/` — captured in Phase 9.

---

## 8. Git & Commit Convention
- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `style:`.
- One focused commit (or a few) per phase; each phase's work is self-contained and reviewable.
- Branch: work on `main` for speed given the deadline (solo dev), tag phase completions if useful.

---

## 9. Resolved Decisions
1. **Auth:** ✅ Demo Mode (role switcher) + Normal Mode (Clerk login with role-based access).
2. **Seat map visualization:** ✅ Grid-of-cells per floor + legend + filters.
3. **AI assistant:** ✅ Groq API (Llama 3.x) with a deterministic rules fallback so the demo never breaks.
4. **Brand:** ✅ Indigo/violet accent, modern SaaS console, dark mode, "Ethara" wordmark.

---

## 10. Current Status
- [x] Phase 0 — Foundation & Docs (in progress)
- [ ] Phase 1 — UI Design System
- [ ] Phase 2 — Core UI Screens
- [ ] Phase 3 — Polish & States
- [ ] Phase 4 — Backend Foundation + Schema
- [ ] Phase 5 — Seed Data
- [ ] Phase 6 — REST APIs
- [ ] Phase 7 — Integration
- [ ] Phase 8 — AI Assistant
- [ ] Phase 9 — Deploy + Final Docs
