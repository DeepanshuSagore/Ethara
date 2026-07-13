# AI Prompts & Usage Log

Documentation of **all AI usage** during development, as required by the assessment (Section 9):
the **prompts used**, the **outputs generated**, the **manual fixes applied**, and the
**validation methods** used to verify correctness. Structured to cover: planning, database design,
backend, seat-allocation logic, AI assistant, frontend, testing, debugging, deployment, and
refactoring.

- **Primary AI tool:** Claude (via Claude Code) — architecture, code generation, docs, debugging.
- **In-product AI:** Groq (Llama 3.x) powers the app's natural-language assistant feature.

> Each entry uses this template, mapping 1:1 to the requirement:
> **Prompt** (prompt used) · **AI output** (output generated) · **Correct / Incorrect** (review of
> that output) · **Manual fixes** (fixes applied) · **Verification** (validation method)

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

**AI output:** ~40 files: design tokens in `globals.css` (semantic CSS variables per theme mapped
through `@theme inline`, radius/shadow scales, `text-metric` tabular-numeral utility, `animate-in`
keyframe); 11 typed primitives in `src/components/ui/` (Button/Card/Input/Badge/Table/Dialog/
Select/Tabs/Skeleton/Toast+Toaster/DropdownMenu) on Radix + lucide-react with `cn()`; app shell in
`src/components/layout/` (collapsible Sidebar, Topbar with global search, Demo-Mode RoleSwitcher
backed by a localStorage-persisted `useRole()` context, ThemeToggle, PageHeader, mobile drawer);
`(dashboard)` route group with 7 pages + branded `not-found.tsx`; next-themes provider wiring.
Committed as `7c0571a`.

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

### Phase 2 — Core UI Screens (typed mock data)

**Prompt:** "Build every Phase 2 screen on typed mock data mirroring the DB schema: a seeded
deterministic dataset (~250 employees / 280 seats, ×20 display scale for the brief's ~5,000/~5,600
headline metrics), a client store with allocate/release/add-joiner actions enforcing the business
rules; Dashboard (stat cards + project-wise allocation and floor-wise occupancy bars + utilization
donut), Employees (search/filter table + `/employees/[id]` detail), Projects (cards +
`/projects/[id]` with team table), Seats (floor tabs → zone cards → bay rows of clickable cells,
legend, allocation dialog), New Joiners (queue with proximity-based seat suggestions + add-joiner
dialog), Assistant (chat UI with mock keyword replies), and wire the Topbar global search to
`/employees?query=`. Role-aware: Admin/HR see allocate/release/add actions, others read-only."

**AI output:** ~25 files: `src/types/` (schema-mirroring `Employee`/`Project`/`Seat`/
`SeatAllocation` in snake_case so the Phase 7 API swap is mechanical); `src/lib/mock/` — mulberry32
seeded PRNG, deterministic generator (5 floors × 2 zones × 4 bays × 7 seats = 280 seats; teams
clustered around per-project home zones; Amit Sharma / amit@ethara.ai seeded as employee #1 to match
the brief's AI example), and a `MockDataProvider` context store with derived maps, dashboard
metrics, seat suggestions (team-zone → same-floor → alternate-zone) and rule-enforcing
allocate/release/addJoiner actions; chart primitives (`StatCard`, `BarList`, `DonutStat`);
screen components under `components/{employees,projects,seats,assistant}/`; all 7 screens wired,
detail routes awaiting the Next 16 `params` Promise; seat-status palette validated with a
colorblind-safety script (statuses also carry non-color encoding: icons on reserved/maintenance
cells, filled-vs-outline cells, labeled legend).

**Correct:** Typecheck and production build passed first try; deterministic module-scope dataset
kept SSR and hydration in sync; business rules (one active seat per employee, reserved/maintenance
not allocatable, release → available, duplicate email rejected, metrics recompute on every action)
hold in the store; role switcher visibly gates actions on Employees/Seats/New Joiners; suggested
seats follow project proximity with alternate-zone fallback.

**Incorrect:** First draft synced the Topbar search into filter state with `setState` inside a
`useEffect`, which the repo's React-hooks lint (react-hooks/set-state-in-effect) rejects — replaced
with the adjust-state-during-render pattern. An unused import slipped into the store. A curl check
for "Zone A" on the seats page initially looked like a rendering bug but was React's SSR comment
markers (`Zone <!-- -->A`) — verified content was actually present.

**Manual fixes:** None beyond the above (caught and fixed in-session). Pre-existing Phase 1 lint
error in `demo-role.tsx` left for Phase 3 polish.

**Verification:** `tsc --noEmit` clean; `next build` green (10 routes incl. two dynamic detail
routes); every route curl-checked on the dev server for 200 + expected mock content (dashboard
aggregates 5,000/5,600, employee detail with seat + project cards, project team table, seat grid
with all zones/bays and legend, new-joiner suggestions, assistant prompts); `/employees?query=amit`
confirmed to server-render only the matching row; seat-status palette validated for CVD separation
and contrast in light and dark modes.

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
