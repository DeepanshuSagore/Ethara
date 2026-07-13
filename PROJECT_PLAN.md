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

## 3. Data Model (aligned to the assessment's suggested schema)

Seat location is flat: **Floor → Zone → Bay → Seat** (stored as columns on `seats`, per the brief).
Four tables: `employees`, `projects`, `seats`, `seat_allocations`.

- **employees**: id, employee_code, name, email (unique), department, role, joining_date,
  status (ACTIVE / ON_LEAVE / EXITED / **PENDING_ALLOCATION**), project_id (fk → projects),
  created_at, updated_at.
- **projects**: id, name (unique), description, manager_name,
  status (ACTIVE / ON_HOLD / COMPLETED), created_at.
  Seed with the 11 named projects: Indigo, Indreed, Mydreed, Preed, Serfy, Oreed,
  bedegreed, Opreed, Serry, Kaary, Mered.
- **seats**: id, floor, zone, bay, seat_number, seat_code (e.g. `B4-23`),
  status (AVAILABLE / OCCUPIED / RESERVED / **MAINTENANCE**), created_at.
  Unique constraint on (floor, zone, bay, seat_number).
- **seat_allocations**: id, employee_id (fk), seat_id (fk), project_id (fk),
  allocation_status (ACTIVE / RELEASED), allocation_date, released_date.
  The single source of truth for "who sits where" — current seat = latest ACTIVE row.

### Key derived metrics (for dashboard)
- Total employees, total seats, occupied / available / reserved / maintenance counts.
- Seat utilization = occupied / total (global + per floor).
- Project-wise allocation (headcount & seats per project).
- Floor-wise occupancy.
- New joiners pending allocation (employees with status PENDING_ALLOCATION).

### Business rules (enforced in the allocation service)
1. One employee → at most one ACTIVE seat allocation.
2. One seat → at most one ACTIVE employee.
3. Releasing a seat sets it back to AVAILABLE.
4. RESERVED / MAINTENANCE seats cannot be allocated until status is changed.
5. New joiners are prioritized for available seats near their project team (same floor/zone),
   with alternate-zone suggestions when the preferred zone is full.
6. Duplicate employee email is rejected.
7. Duplicate seat_number within the same floor/zone is rejected.
8. Dashboard metrics recompute on every allocation / release.

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
│   ├── api/                    # routers: employees, projects, seats, dashboard, ai
│   ├── services/               # business logic (allocation, dashboard, nl-query)
│   └── seed/                   # Faker-based seed generator
├── alembic/                    # migrations
├── tests/
├── requirements.txt
├── .env.example
└── README.md
```

### REST API surface — **exact paths from the brief** (mounted at root, no version prefix)

**Employees**
- `POST /employees` · `GET /employees` (with `?search=&department=&role=&project_id=&status=`)
- `GET /employees/{id}` · `PUT /employees/{id}` · `DELETE /employees/{id}` (deactivate)

**Projects**
- `POST /projects` · `GET /projects` · `GET /projects/{id}/employees`

**Seats**
- `POST /seats` · `GET /seats` (with `?status=&floor=&zone=`) · `GET /seats/available`
- `POST /seats/allocate` (employee_id, seat_id) · `POST /seats/release` (seat_id)

**Dashboard**
- `GET /dashboard/summary` · `GET /dashboard/project-utilization` · `GET /dashboard/floor-utilization`

**AI Assistant**
- `POST /ai/query` → `{ "query": "Where is my seat? My email is amit@ethara.ai" }`
  returns `{ "answer": "..." }`

**Docs** — `GET /docs` (Swagger) · `GET /redoc`

> Extra convenience endpoints (e.g. new-joiner suggestions) may be added, but every path
> above is implemented verbatim so automated grading finds them.

---

## 5b. Seed Data Requirements (exact, from the brief)

| Item                          | Requirement            | Plan |
|-------------------------------|------------------------|------|
| Employees                     | 5,000                  | 5,000, emails `@ethara.ai` |
| Floors                        | ≥ 5                    | 5 floors |
| Zones                         | ≥ 10                   | 10 (2 per floor: A–B) |
| Seats                         | ≥ 5,500                | ~5,600 (floor→zone→bay→seat) |
| Projects                      | ≥ 10                   | 11 named projects |
| Available seats               | ≥ 500                  | ✅ enforced by generator |
| Reserved seats                | ≥ 100                  | ✅ enforced |
| Maintenance seats             | (some)                 | ~50 |
| Employees pending allocation  | ≥ 50                   | ✅ status PENDING_ALLOCATION |

Seat code format: `{zone}{bay}-{seat}` → e.g. `B4-23`. Each employee maps to exactly one active
project; ~4,950 have an ACTIVE seat allocation, ≥50 remain pending.

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
| **5** | Seed Data | Exact seed targets met | Faker seed: 5,000 employees · 5 floors · 10 zones · ~5,600 seats · 11 projects · ≥500 available · ≥100 reserved · ≥50 pending; verify counts |
| **6** | REST APIs | All **exact** endpoints + Swagger | Employees/Projects/Seats/Dashboard/AI routers at spec paths, allocation rules enforced, Swagger documented |
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
- [x] Phase 0 — Foundation & Docs ✅ committed (`8b9d5eb`)
- [x] Phase 1 — UI Design System ✅ theme tokens, 10 UI primitives, app shell + role switcher, full routing skeleton, light/dark
- [x] Phase 2 — Core UI Screens ✅ typed mock layer (schema-mirroring types, seeded generator, client store with rule-enforcing actions), Dashboard with live aggregates + charts, Employees list/detail, Projects list/detail, interactive seat map + allocation dialog, new-joiner queue with proximity suggestions, assistant chat UI, global search wired
- [x] Phase 3 — Polish & States ✅ route-level loading skeletons shaped per screen, designed empty states everywhere, error boundaries with retry (Next 16.2 `unstable_retry`), reusable pagination (employees + project team) replacing the row cap, sortable columns + filter chips, mobile audit (dialogs, tabs, topbar search, seat-map wrap), a11y pass (aria-sort, keyboard seat map, toasts, reduced motion), per-route titles, lint 100% clean (demo-role rewritten on useSyncExternalStore)
- [ ] Phase 4 — Backend Foundation + Schema
- [ ] Phase 5 — Seed Data
- [ ] Phase 6 — REST APIs
- [ ] Phase 7 — Integration
- [ ] Phase 8 — AI Assistant
- [ ] Phase 9 — Deploy + Final Docs
