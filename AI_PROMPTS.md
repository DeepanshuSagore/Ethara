# AI Prompts & Usage Log

Documentation of AI-tool usage during development, as required by the assessment (Section 9).
Structured to cover: planning, database design, backend, seat-allocation logic, AI assistant,
frontend, testing, debugging, deployment, and refactoring — with what the AI got **right**, what it
got **wrong**, what was **manually fixed**, and how it was **verified**.

- **Primary AI tool:** Claude (via Claude Code) — architecture, code generation, docs, debugging.
- **In-product AI:** Groq (Llama 3.x) powers the app's natural-language assistant feature.

> Each entry uses this template:
> **Prompt** · **AI output** · **Correct** · **Incorrect** · **Manual fixes** · **Verification**

---

## 1. Architecture & Planning

**Prompt:** "Plan a full-stack seat-allocation & project-mapping system (Ethara) for ~5,000
employees serving Employee/HR/Admin/Project roles. Propose a phased plan focused on UI first, with
industry-standard structure, routing, tech stack, and a data model. Then revise it against the
detailed assessment spec."

**AI output:** A 10-phase plan (Foundation → Design System → UI Screens → Polish → Backend →
Seed → REST APIs → Integration → AI → Deploy), a tech-stack table, folder architecture for both
frontend and backend, a data model, and business rules. Captured in [PROJECT_PLAN.md](./PROJECT_PLAN.md).

**Correct:** Phase breakdown, folder structure, and stack choices matched the brief. UI-first
sequencing lets the frontend proceed against typed mocks without waiting on the backend.

**Incorrect / revised:** Initial draft over-normalized the seat model (Building→Floor→Zone→Seat as
separate tables) and used generic API paths with an `/api/v1` prefix. After reading the detailed
spec, revised to the suggested flat schema (Floor/Zone/Bay/Seat as columns), exact table/field
names, exact endpoint paths, the 11 named projects, and precise seed targets.

**Manual fixes:** Locked product decisions — Demo/Normal auth modes (Clerk), grid seat map,
indigo/violet theme, Groq assistant. Aligned statuses to Available/Occupied/Reserved/Maintenance.

**Verification:** Cross-checked every plan item against the assessment's required features, API
list, DB model, business rules, and seed requirements.

---

## 2. Database Design

**Prompt:** _(Phase 4)_ "Generate SQLAlchemy 2.0 models + Pydantic schemas for employees, projects,
seats, seat_allocations following this exact schema and these 8 business rules…"

**AI output:** _pending Phase 4._
**Correct / Incorrect / Manual fixes / Verification:** _logged when implemented._

---

## 3. Backend APIs

**Prompt:** _(Phase 6)_ "Implement FastAPI routers at these exact paths (…/employees, /seats/allocate,
/dashboard/summary, /ai/query …) with search/filter query params and proper status codes."

**AI output:** _pending Phase 6._
**Correct / Incorrect / Manual fixes / Verification:** _logged when implemented._

---

## 4. Seat Allocation Logic

**Prompt:** _(Phase 6)_ "Implement allocation/release enforcing: one active seat per employee, one
active employee per seat, reserved/maintenance not allocatable, new-joiner proximity to project team
with alternate-zone fallback, and dashboard recompute."

**AI output:** _pending Phase 6._
**Correct / Incorrect / Manual fixes / Verification:** _logged when implemented._

---

## 5. AI Assistant

**Prompt:** _(Phase 8)_ "Build a natural-language query interface (Groq Llama) that answers seat,
project, availability, team-location, and utilization questions, with a deterministic keyword
fallback when no API key is present."

**AI output:** _pending Phase 8._
**Correct / Incorrect / Manual fixes / Verification:** _logged when implemented._

---

## 6. Frontend

**Prompt:** _(Phases 1–3, 7)_ "Build a polished Next.js + Tailwind admin UI: design system,
app shell (sidebar/topbar/role-switcher), and screens for dashboard, employees, projects, seats
(grid map), new joiners, and the assistant — first on typed mock data, then wired to the API."

**AI output:** Scaffolded Next.js 16 (App Router, TS, Tailwind v4). Design system + screens logged
per phase.

### Phase 1 — UI Design System

**Prompt:** "Build the Phase 1 design system: Tailwind v4 `@theme` tokens (indigo/violet, light +
dark, radius/shadow, tabular numerals), reusable primitives (Button, Card, Input, Badge, Table,
Dialog, Select, Tabs, Skeleton, Toast) on Radix + lucide-react with a `cn()` util, a collapsible
app shell (Sidebar/Topbar/RoleSwitcher/PageHeader) in a `(dashboard)` route group, and a full
routing skeleton (Dashboard, Employees, Projects, Seats, New Joiners, Analytics, Assistant,
not-found) — accessible and responsive."

**Correct:** Semantic-token architecture (CSS vars per theme mapped via `@theme inline`) worked
first try; all 10 primitives typechecked; class-driven dark mode via next-themes with
`@custom-variant dark`; demo-role context persisted to localStorage; routing skeleton produced all
8 routes as static pages; a11y touches (skip link, aria-current nav, focus-visible rings,
Escape-to-close mobile drawer) included.

**Incorrect:** First draft of Dialog used `tailwindcss-animate` plugin classes
(`animate-out`, `fade-out-0`) that don't exist in this Tailwind v4 setup — replaced with a
custom `--animate-in` keyframe defined in `@theme`. Deleting the old root `page.tsx` left stale
generated types in `.next` that failed `tsc` until a clean rebuild.

**Manual fixes:** None beyond the above (caught and fixed during the same session).

**Verification:** `tsc --noEmit` clean; `next build` green (8 static routes); dev server booted and
every route curl-checked for 200 + expected content (404 page verified too); compiled CSS inspected
to confirm brand tokens, `.dark` block, and `text-metric`/`tabular-nums` utilities were emitted.

---

## 7. Testing

**Prompt:** _(Phase 6+)_ "Write pytest checks for allocation rules and endpoint contracts."
**AI output:** _pending._

---

## 8. Debugging

_Ongoing — significant bugs, their AI-assisted diagnosis, and fixes are logged here and in
`DEBUGGING_NOTES.md`._

---

## 9. Deployment

**Prompt:** _(Phase 9)_ "Produce Render (backend + Postgres) and Vercel (frontend) deploy configs,
env var lists, and CORS setup."
**AI output:** _pending Phase 9._

---

## 10. Refactoring

_Logged as refactors occur (e.g. mock→API data-source swap in Phase 7)._

---

## Appendix — Scaffolding (Phase 0)

**Prompt:** "Scaffold Next.js (App Router, TS, Tailwind, src dir) frontend and a FastAPI backend
skeleton with industry-standard structure, plus root docs."

**AI output:** `create-next-app` frontend; `backend/app/...` package layout with working
`/` + `/health` endpoints; root README, .gitignore, PROJECT_PLAN, this file.

**Correct:** Clean scaffolds; frontend typecheck passed; backend syntax verified.

**Incorrect:** create-next-app pulled Tailwind **v4** (CSS-first config) rather than the v3-style
`tailwind.config.ts` assumed in the plan — noted; design system will use v4's `@theme` in globals.css.

**Verification:** `tsc --noEmit` clean on frontend; `py_compile` clean on backend; committed as
`8b9d5eb` and pushed to GitHub.
