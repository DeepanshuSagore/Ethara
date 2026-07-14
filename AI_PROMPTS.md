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

**Prompt:** _(Phase 4)_ "Build the backend foundation + schema: SQLAlchemy 2.0 typed models
(DeclarativeBase, `Mapped[]`) for employees / projects / seats / seat_allocations with the exact
field names and status enums from PROJECT_PLAN §3 and `frontend/src/types/index.ts`; enforce the
uniqueness business rules at the DB level (email unique, UNIQUE(floor, zone, bay, seat_number),
partial unique indexes for one ACTIVE allocation per employee and per seat) plus indexes for the
Phase 6 filter params; a MetaData naming convention; Alembic wired to `DATABASE_URL` with one
initial migration that round-trips; Pydantic v2 Create/Update/Read (+ filter-param) schemas;
`DATABASE_SCHEMA.md`; and a pytest smoke suite — portable across SQLite (dev) and Postgres
(deploy), no /api/v1 prefix."

**AI output:** Four typed models with String+CHECK statuses (portable, no native enums), UTC
`DateTime(timezone=True)` timestamps, naming-convention MetaData on `Base`; two partial unique
indexes (`sqlite_where` + `postgresql_where`) carrying rules 1–2 in the schema; Alembic `env.py`
reading settings with `alembic check` clean; 18 Pydantic schemas mirroring the frontend types
(SeatCreate derives `seat_code` = `{zone}{bay}-{seat_number}` when omitted); a 10-test smoke
suite; `DATABASE_SCHEMA.md` mapping each of the 8 business rules to schema- vs service-level
enforcement; `app/api/v1/` flattened to `app/api/` to match the root-path API decision.

**Correct:** Models, migration, schemas, and tests all worked as generated — autogenerate rendered
the partial indexes with both dialect `where` clauses on the first try, and the migration
round-trips (`upgrade head` → `downgrade base` → `upgrade head`) with no drift.

**Incorrect / revised:** The Phase 0 pins didn't install on Python 3.14 — `psycopg2-binary`
2.9.10 has no cp314 wheel (build fell back to source and failed on missing `pg_config`), and
pydantic 2.10 / SQLAlchemy 2.0.36 predate cp314 wheels too. Swapped to **psycopg v3**
(`psycopg[binary]==3.2.13`, prod URL scheme `postgresql+psycopg://`) and bumped
fastapi 0.128.8 / sqlalchemy 2.0.44 / pydantic 2.12.5 / alembic 1.16.5; dropped `uvicorn[standard]`
extras (uvloop/httptools wheels lag on 3.14). Also noticed SQLite ships with foreign-key
enforcement OFF — added a per-connection `PRAGMA foreign_keys=ON` listener so dev matches
Postgres (caught by the FK-integrity test, which passes invalid ids on purpose).

**Manual fixes:** None beyond the above (caught and fixed in-session).

**Verification:** Fresh venv install from requirements.txt on Python 3.14.3 succeeds;
`alembic upgrade head` → SQLite DDL inspected via `sqlite_master` (CHECK constraints, named
FKs/uniques, both partial `WHERE allocation_status = 'ACTIVE'` unique indexes present);
downgrade/upgrade round-trip + `alembic check` (no drift); pytest 10/10 (row insert with FKs,
duplicate email, duplicate seat position, second ACTIVE allocation per employee **and** per seat
all rejected; RELEASED history rows don't block re-allocation; bad status rejected by CHECK);
uvicorn boots with all models imported — `/`, `/health`, `/docs`, `/openapi.json` all 200.

---

## 2b. Seed Data Generation

**Prompt:** _(Phase 5)_ "Build the Faker seed module (`python -m app.seed.run`): deterministic
(fixed seed, fixed base date) and idempotent (wipe + repopulate the four tables in one
transaction, bulk inserts). Exact §5b targets: 11 named projects all ACTIVE; 5 floors × 2 zones
= 10 zones, ~5,600 seats with `seat_code = {zone}{bay}-{seat_number}` and bay derived from
seat_number like the frontend mock; 5,000 employees with unique @ethara.ai emails, employee #1 =
Amit Sharma / amit@ethara.ai, the mock's department→roles mapping, `ETH-NNNN` codes; ≥50
PENDING_ALLOCATION / a few EXITED (no seats) / a few ON_LEAVE (keep seats); seat statuses ≥500
AVAILABLE, ≥100 RESERVED, ~50 MAINTENANCE, OCCUPIED = exactly the ACTIVE-allocation seats; teams
clustered around per-project home zones (mirrors the mock so rule 5's proximity suggestions make
sense). Plus a verification step printing a summary and asserting every target + invariant."

**AI output:** `app/seed/data.py` (vocabularies + targets mirroring
`frontend/src/lib/mock/data.ts`, scaled ×20: 80 bays × 7 seats per zone = 5,600 seats;
composition 4,915 ACTIVE / 25 ON_LEAVE / 10 EXITED / 50 PENDING → 4,940 allocations, leaving
510 AVAILABLE / 100 RESERVED / 50 MAINTENANCE), `app/seed/run.py` (pure in-memory row builder
from `random.Random(20260713)` + seeded Faker with explicit ids and fixed-base-date offsets —
no `now()` drift — then FK-ordered `DELETE` + bulk `INSERT` in one transaction), and
`app/seed/verify.py` (summary table + 21 hard checks: every §5b minimum, exact project names,
Amit row, unique emails, no double-ACTIVE per employee/seat, OCCUPIED == ACTIVE allocations and
pointing at the same seats, no PENDING/EXITED holding a seat, allocation↔employee project match,
seat_code recomputed in SQL; exits non-zero on failure and runs standalone).

**Correct:** Worked first try — fresh DB (`alembic downgrade base && upgrade head`) → seed in
~0.5s → 21/21 checks pass; per-project clustering exact (e.g. all ~450 of project 1's seats in
floor 1 zone A, project 6's in 3B, matching the mock's home-zone walk).

**Incorrect:** Nothing material this phase (the cp314 dependency work was done in Phase 4). One
in-session cleanup: the first draft of verify.py's seat_code SQL check used an inline
`__import__("sqlalchemy")` hack instead of importing `cast`/`String` properly.

**Manual fixes:** None beyond the above.

**Verification:** Ran the seeder twice and compared `sqlite3 .dump` SHA-256 hashes —
byte-identical, proving idempotency + determinism. Independently re-verified with the sqlite3
CLI (not the script): entity counts (11 / 5,600 / 5,000 / 4,940), seat- and employee-status
breakdowns, `COUNT(DISTINCT email) = 5000`, zero employees/seats with two ACTIVE allocations,
occupied-count == active-allocation-count, Amit row, 5 floors / 10 zones, seat_code spot-checks
across bay boundaries (`A1-7` → `A2-8`, `A80-560`). Existing pytest schema suite still 10/10.

---

## 3. Backend APIs

**Prompt:** _(Phase 6)_ "Implement the REST APIs at the exact spec paths from PROJECT_PLAN §5,
mounted at root (no /api/v1): employees CRUD with `?search=&department=&role=&project_id=&status=`
and DELETE-as-deactivate; projects + `/projects/{id}/employees`; seats with filters,
`/seats/available`, `/seats/allocate`, `/seats/release`; the three dashboard endpoints computed
live from the DB; and `POST /ai/query` with a deterministic keyword fallback. Routers stay thin in
`app/api/`, business logic in `app/services/`; reuse the Phase 4 Pydantic schemas; pre-check rules
for friendly 409s with the DB constraints as the race fallback; 201/404/409/422 status codes and
Swagger tags/summaries throughout."

**AI output:** Five routers (`app/api/{employees,projects,seats,dashboard,ai}.py`) mounted in
`main.py` with `openapi_tags`, three services (`app/services/{allocation,dashboard,ai_query}.py`),
and three new schema modules (dashboard metrics, AI query, seat suggestion — reusing the Phase 4
Create/Update/Read + filter-param schemas for everything else; the filter models bind as query
params via `Depends()`). Convenience extras beyond the spec: `GET /projects/{id}`,
`GET /seats/{id}`, `GET /seats/suggestions` (rule 5, needed by the Phase 7 new-joiners screen),
and optional `limit`/`offset` on the two big list endpoints. Emails are normalized (trim +
lowercase) on create/update; `PUT` with `status=EXITED` and `DELETE` both release the seat so no
ACTIVE allocation is orphaned; deletes are soft (row + allocation history survive).

**Correct:** All 26 routes registered at the exact spec paths on the first boot; the 37 new
endpoint tests passed on the first run; OpenAPI lists every brief path verbatim (locked by a test).

**Incorrect / revised:** Nothing material — one design choice worth noting: path params are named
`{id}` (not `{employee_id}`) so `/docs` shows `/employees/{id}` exactly as the brief writes it.

**Manual fixes:** None.

**Verification:** `pytest` 47/47 (10 Phase 4 schema tests + 37 new); then against a live uvicorn
on a fresh seeded DB: every spec path curl-checked (counts match the §5b targets — 510 available,
88% utilization, project 1 = 455 headcount / 450 seated / home zone 1A), each rule rejection
exercised live with its status code and message, 404s for unknown ids, 422 for bad enum values,
`/docs` + `/redoc` 200. DB reseeded to pristine state afterwards.

---

## 4. Seat Allocation Logic

**Prompt:** _(Phase 6)_ "Implement allocation/release enforcing: one active seat per employee, one
active employee per seat, reserved/maintenance not allocatable, new-joiner proximity to project team
with alternate-zone fallback, and dashboard recompute. Pre-check for friendly errors; the DB's
partial unique indexes are the last line of defense (translate IntegrityError into clean 409s).
Mirror the mock store's behavior so Phase 7 is a mechanical swap."

**AI output:** `app/services/allocation.py`. `allocate_seat`: 404s for unknown ids, then 409s for
EXITED employee, an existing ACTIVE allocation (rule 1), and any non-AVAILABLE seat (rules 2 & 4 —
seat status is kept in lockstep with its ACTIVE allocation, so OCCUPIED covers rule 2); on success
the allocation row, `seat.status=OCCUPIED`, and PENDING→ACTIVE employee promotion commit together,
with `IntegrityError → rollback → 409` catching races the pre-checks miss. `release_seat` (rule 3):
allocation → RELEASED + `released_date`, seat → AVAILABLE, one transaction; 409 when there's no
active allocation. The same `_release` transition backs `DELETE /employees/{id}` and
`PUT status=EXITED`. `suggest_seats` (rule 5): team zone = the (floor, zone) where most of the
employee's project-mates with ACTIVE allocations sit (SQL GROUP BY), falling back to the project's
seeded home zone, then ranks AVAILABLE seats team-zone → same-floor → alternate-zone (top 3 by
default) — the same algorithm as the mock store's `suggestSeatsFor`. Dashboard metrics (rule 8) are
computed live per request in `app/services/dashboard.py` from GROUP BY aggregates — no cache to
invalidate.

**Correct:** All rule behavior matched the mock store's semantics on the first test run, including
the messages ("… already has an active seat.", "Seat B4-23 is reserved and cannot be allocated.").

**Incorrect / revised:** Nothing material.

**Manual fixes:** None.

**Verification:** Each rule has a happy-path AND rejection pytest (see §7), plus live curl checks
against the seeded DB: pending employee #5000 (project 6, home zone 3B) got team-zone suggestions
in floor 3 zone B, allocate → 201 with the employee flipping to ACTIVE, second seat → 409, seat
already occupied → 409, reserved/maintenance → 409, release → 200 with `released_date` set and the
seat AVAILABLE again, double release → 409; deactivating Amit freed seat #1 and the very next
dashboard/AI reads reflected it (rule 8).

---

## 5. AI Assistant

**Prompt:** _(Phase 8)_ "Put Groq (Llama 3.3, JSON mode) in front of the Phase 6 deterministic
engine behind `POST /ai/query`: NL → structured intent (intent + email/name/floor/project
entities), execute the intent against the DB with the same data access the keyword engine uses,
compose the answer from real rows, and fall back to the deterministic engine on any failure —
missing key, HTTP/API error, timeout, rate limit, malformed JSON, unknown intent or low
confidence — so the endpoint never 500s and the demo works offline."

**AI output:** [backend/app/services/ai_nl.py](backend/app/services/ai_nl.py) — one httpx POST to
Groq's OpenAI-compatible chat-completions API (temperature 0, `response_format: json_object`,
4-second timeout, 200 max tokens) classifying into 8 intents: the four Phase 6 ones
(`employee_seat`, `floor_availability`, `project_occupancy`, `utilization`) plus
`floor_most_available`, `project_on_floor`, `off_topic` and `unknown`. Executors reuse the Phase 6
answer composers (promoted to public in `ai_query.py`) and add two new DB queries (most-available
floor ranking; project×floor active-allocation count with a "team mostly sits on Floor X" hint).
19 mocked tests in [backend/tests/test_ai_nl.py](backend/tests/test_ai_nl.py).

**Correct:** the structured-query architecture held — every answer string is composed
server-side from DB rows; the model only ever picks an intent and copies entities out of the
question. All live paraphrases worked first try ("does anyone from Serfy sit on floor 3?",
"how full is the office?", "which floor has the most free seats?", first-name-only lookups).

**Incorrect / Manual fixes:**
- The groq SDK import trips a `pydantic.v1` UserWarning on Python 3.14 → dropped it for a direct
  httpx call (already pinned); one less dependency.
- A prompt-injection probe ("ignore all previous instructions…") derailed Llama into emitting a
  *different* JSON shape than requested. The strict schema validation (intent whitelist +
  confidence floor) rejected it and the user saw only the deterministic fallback — documented as
  the load-bearing guardrail, and the one echo of model-extracted text (the "couldn't find X"
  message) is whitespace-collapsed and capped at 80 chars.
- Guardrails: queries > 500 chars never reach Groq (fallback answers them); blank key
  short-circuits offline; Groq errors are logged server-side, never surfaced.

**Verification:** pytest 66/66 offline (autouse fixture blanks the key so the 47 existing tests
never touch the network; the 19 new tests mock `httpx.post` with real `httpx.Response` objects);
live curl pass with the real key (brief's example + 5 paraphrases + off-topic refusal + 422);
second server with `GROQ_API_KEY=""` env override confirmed every fallback answer; headless-Chrome
pass 6/6 on `/assistant` (suggested prompt, Groq-only phrasing, refusal, updated copy).

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

### Phase 3 — Polish & States

**Prompt:** "Phase 3 polish on top of the mock store (don't restructure it): route-level
`loading.tsx` skeletons shaped like each screen; designed empty states on every list/table;
`error.tsx` boundaries (route group + detail routes) with retry, consistent with the not-found
cards; replace the employees MAX_ROWS=60 cap with reusable client-side pagination (~25/page,
prev/next + 'Page X of Y' + count) shared with the project team table; sortable name/code/
department columns; 'N filters active' chips with clear-all; mobile audit (tables, seat-map
wrap, dialogs, chat, topbar); a11y pass (focus-visible, aria on icon buttons, keyboard seat map,
toast announcements, prefers-reduced-motion); fix the `react-hooks/set-state-in-effect` error in
`demo-role.tsx` keeping SSR-safe localStorage; verified per-route titles. Lint must end 100% clean."

**AI output:** ~30 files. Shared state kit: `EmptyState`, `PaginationBar` (count line +
prev/next, nav auto-hides at one page), skeleton blocks (`PageHeaderSkeleton`, `TableSkeleton`,
`StatCardSkeleton`, `BarListSkeleton`, `DetailCardSkeleton`) and a client `ErrorState` card. Nine
`loading.tsx` files shaped like their screens (employees/seats skeletons shared with the pages'
`useSearchParams` Suspense fallbacks); three `error.tsx` boundaries wired to Next 16.2's new
`unstable_retry` (falling back to `reset`), logging via `useEffect`. Employees screen rebuilt:
filter → sort → clamp-page → slice pipeline, sortable headers with `aria-sort` + icon state,
removable filter chips with clear-all, designed empty state with a clear-filters action; project
team table paginated via the same bar. `demo-role.tsx` rewritten on `useSyncExternalStore`
(server snapshot = default role, client snapshot reads localStorage, `storage` event syncs tabs).
Dashboard page split into a server `page.tsx` (metadata) + `DashboardScreen` client component;
detail routes gained `generateMetadata` resolving names from the deterministic dataset. Responsive:
dialogs `w-[calc(100%-2rem)]` + `max-h` scroll, topbar search now visible on mobile, floor tabs
scroll instead of clipping, reduced-motion CSS collapses animations and the chat auto-scroll.

**Correct:** Lint (including the carried-over `demo-role.tsx` error) and typecheck clean first
run; pagination/sorting/chips behaved correctly under browser automation on the first pass;
`useSyncExternalStore` produced no hydration mismatch; bundled Next 16 docs (`node_modules/next/
dist/docs`) correctly flagged `unstable_retry` as the 16.2 retry prop before writing the boundaries.

**Incorrect:** First error-boundary test route was named `__boom` — underscore-prefixed folders
are private (excluded from routing) in the App Router, so it 404'd; renamed to `boom-test`. That
throwing test route then broke `next build` (a page that always throws can't be statically
exported) — acceptable since it was verification-only and deleted after the browser test passed.
A dev-mode "skeleton flashes on client navigation" check was flaky (dev router cache makes
navigations instant), so loading verification pivoted to deterministic evidence instead.

**Manual fixes:** None beyond the above (caught and fixed in-session).

**Verification:** `npm run lint` ends with zero problems; `tsc --noEmit` clean; `next build`
green (10 routes). Headless Chrome (playwright-core driving system Chrome against the dev server):
30/31 checks passed — error boundary renders on a thrown route, Try-again re-invokes the segment,
pagination next/prev updates rows/summary/disabled states, header clicks sort asc/desc with
`aria-sort`, chips + clear-all restore the table, seat cells open/close the dialog via
Enter/Escape, allocation fires a toast, all 8 screens show zero horizontal overflow at 375px,
and the seat dialog fits a phone viewport (343px). Loading states proven at the router level
(every route's RSC flight payload contains its rendered loading fallback) and at first paint
(the production `next start` HTML for `/employees` serves the shaped skeleton); per-route
`<title>`s curl-verified, including dynamic "Amit Sharma · Ethara" / "Mydreed · Ethara".

### Phase 7 — Frontend ↔ Backend Integration

**Prompt:** "Replace the mock store with the real API: install TanStack Query, build a typed
fetch client in `src/lib/api/` (one module per resource, base URL from `NEXT_PUBLIC_API_URL`
defaulting to localhost:8000), expose query/mutation hooks covering the mock store's whole hook
surface, wire every screen (dashboard's three endpoints, employees list/detail with **server-side**
search/filters and limit/offset paging, projects list/detail, seat map with per-floor fetching +
allocate/release dialogs, new-joiner queue with `GET /seats/suggestions` and `POST /employees`,
assistant on `POST /ai/query`, topbar `?search=`), drive the Phase 3 loading/empty/error states
from real fetch status, remove `src/lib/mock` and all ×20 display scaling, and keep lint/tsc/build
green. Don't reshape backend responses to fit the UI."

**AI output:** ~25 files. `src/lib/api/`: `client.ts` (URL builder, `ApiError` carrying FastAPI's
`detail` — string or 422 field list — plus abort-signal passthrough), one module per resource
(`employees`/`projects`/`seats`/`allocations`/`dashboard`/`ai`), and `hooks.ts` — the TanStack
Query surface (`useDashboardSummary`/`useProjectUtilization`/`useFloorUtilization`,
`useEmployees`/`useEmployee`/`usePendingJoiners`, `useProjects`/`useProject`/`useProjectEmployees`,
`useSeats`/`useSeatSuggestions`, a `useSeatIndex` that joins ACTIVE `/allocations` with `/seats`
into who-sits-where maps, and `useAllocateSeat`/`useReleaseSeat`/`useAddJoiner`/`useAiQuery`
mutations that invalidate the whole cache so dashboard/seat-map/lists refetch — rule 8
server-side). `QueryClientProvider` replaced `MockDataProvider`; every screen rewired; dashboard
response types added to `src/types/`; `FLOORS`/`ZONES`/`DEPARTMENTS` moved to `lib/constants.ts`;
detail-route `generateMetadata` now fetches the API server-side with a graceful fallback title;
`src/lib/mock/` deleted; `.env.local.example` documents `NEXT_PUBLIC_API_URL`. One additive
backend endpoint (`GET /allocations`) — see Incorrect below.

**Correct:** The Phase 4 decision to mirror types field-for-field paid off — no response
reshaping anywhere, the swap was mechanical (snake_case fields flowed straight into the
components). Server-side filtering replaced the client pipeline (search deferred via
`useDeferredValue`, `keepPreviousData` so typing/paging never flashes skeletons); the seat map
fetches one floor at a time (`?floor=`, 1,120 of 5,600 seats) instead of scaling a 280-seat mock;
lint/tsc/build stayed green on the first full pass after the swap.

**Incorrect:** The brief's REST surface has no way to answer "who sits where" (seat_allocations
was never exposed; the mock store derived it from its own allocation rows) — employee detail/table
seat columns and the seat-dialog occupant were unimplementable. Fixed with one additive
read-only endpoint `GET /allocations?employee_id=&seat_id=&status=` (PROJECT_PLAN §5 explicitly
allows convenience endpoints; existing 47 tests untouched). Second bug caught by the browser pass:
mutation `onSuccess` returned `invalidateQueries()`, TanStack awaited it before firing the
caller's callbacks, and the refetched queue unmounted the joiner card first — so its "Seat
allocated" toast never fired (mutate-level callbacks are skipped after unmount). Fixed by not
awaiting the invalidation. Also, list endpoints return no total count, so "Page X of Y" is
unknowable server-side — `PaginationBar` gained a `hasNext` mode (fetch pageSize+1) and the label
degrades to "Page N"; and seat-cell tooltips dropped the occupant name (resolving 1,120 occupants
per floor would mean loading all 5,000 employees for tooltips — the dialog looks the occupant up
lazily instead).

**Manual fixes:** None beyond the above (all caught and fixed in-session).

**Verification:** Fresh seeded DB + uvicorn :8000 + `next dev` :3000, driven by headless system
Chrome (playwright-core): 25/25 checks — dashboard renders 4,990 / 5,600 / 4,940 @ 88% / 510 / 50;
searching "amit@ethara.ai" finds Amit Sharma (ETH-0001) with seat A1-1 server-side; employee 1
detail shows A1-1 / Floor 1 / Indigo with an API-fetched `<title>`; Indigo detail shows 455
headcount / 450 seated / zone 1A with a 19-page team table; floor 1 renders exactly 1,120 live
seat cells; allocating a pending joiner from a suggestion fires the toast and moves the dashboard
to 4,941 / 509 / 49 pending **without reload**; releasing that seat restores 4,940 / 510; the
assistant answers the brief's amit@ethara.ai question via `POST /ai/query`; topbar search
deep-links to the filtered directory. `npm run lint` zero problems, `tsc --noEmit` clean,
`next build` green (10 routes); backend `pytest` still 47/47; DB reseeded after the destructive
run (`python -m app.seed.run`, 21/21 checks).

---

## 7. Testing

**Prompt:** _(Phase 6)_ "Write pytest coverage for the endpoint contracts and every allocation
rule — happy path and each rejection — alongside the Phase 4 schema smoke suite, on a fresh
in-memory SQLite DB per test."

**AI output:** `tests/test_api.py` (37 tests) + a `client` fixture in `conftest.py` that overrides
the `get_db` dependency with the test's in-memory session. Coverage: an OpenAPI test asserting
every brief path is present verbatim; employees (create 201 with PENDING default + email
normalization, duplicate email 409 case-insensitively [rule 6], unknown project 404, bad status
422, search + every filter param, get/put/delete 404s, PUT dup-email 409, PUT status=EXITED and
DELETE both releasing the seat with history kept [rule 3]); projects (create 201, dup name 409,
list, `/employees` sub-route + 404); seats (seat_code derivation, duplicate position 409 vs. same
position on another floor 201 [rule 7], list filters, `/available`); allocation lifecycle (happy
path 201 with seat→OCCUPIED and PENDING→ACTIVE, rule 1/2/4 rejections each as their own test,
unknown-id 404s, EXITED employee 409, release → re-allocate on the freed seat, release-without-
active 409); suggestions (rule 5 ranking asserted in order, home-zone fallback when no teammates
are seated, 404); dashboard (exact summary/project/floor numbers for the fixture dataset, and a
recompute test asserting counts move after allocate and return after release [rule 8]); AI (the
brief's exact email query, pending-joiner by name, floor availability, project occupancy,
utilization, fallback, empty query 422).

**Correct:** 47/47 on the first full run (0.4s); no flakes across reruns.

**Incorrect / Manual fixes:** None.

**Verification:** `pytest -q` → 47 passed (10 Phase 4 + 37 Phase 6); the same behaviors were then
independently curl-verified against a live server on the full seeded dataset (§3, §4).

---

## 8. Debugging

_Ongoing — significant bugs, their AI-assisted diagnosis, and fixes are logged here and in
`DEBUGGING_NOTES.md`._

---

## 9. Deployment

**Prompt:** _(Phase 9)_ "Deploy the backend + managed Postgres to Render and the frontend to
Vercel, entirely through their APIs (no dashboard clicking): create the Postgres, run
alembic + the seeder against it from local, create the web service with the env vars
(psycopg-scheme DATABASE_URL, Groq key, CORS), create the Vercel project with root dir
`frontend` and NEXT_PUBLIC_API_URL, link the GitHub repo for auto-deploys, point CORS at the
final Vercel URL, then verify live end-to-end — including /ai/query with the Groq key removed."

**AI output:** the full pipeline as `curl`/Python calls against `api.render.com/v1` and
`api.vercel.com`: `POST /v1/postgres` (free, Oregon, PG 17) → external-URL migrate + seed +
21-check verify from local → `POST /v1/services` (web service, root dir `backend`,
`PYTHON_VERSION=3.14.3` pinned to match the local venv, Render's new-service default) →
`POST /v11/projects` on Vercel (framework `nextjs`, `rootDirectory: frontend`, GitHub repo
linked in the same call) → `POST /v13/deployments` from `main` → CORS_ORIGINS_RAW updated to
the three Vercel aliases + localhost and redeployed. All URLs/settings recorded in
[DEPLOYMENT.md](./DEPLOYMENT.md).

**Incorrect / Manual fixes:** three deploy-time surprises, all diagnosed from API responses
and logs (details in [DEBUGGING_NOTES.md](./DEBUGGING_NOTES.md) §Phase 9): API-created
Postgres ships with an **empty IP allow list** (external TLS handshakes silently dropped —
fixed with a `/32` PATCH for the dev machine only); the long-haul bulk seed needed libpq
keepalives appended to the URL; and a deploy that Render reported `live` served
`x-render-routing: no-server` 404s for ~5 minutes of edge-routing lag. Also caught: Render's
env-var API **rejects empty values** (400), so the "blank the Groq key" fallback drill
initially tested nothing — the first attempt still answered via Groq (exposed by an intent
that only the NL layer can answer); redone properly by **deleting** the env var (absent ⇒
pydantic default `""` ⇒ same fallback path), verifying deterministic answers, then restoring.

**Verification:** live `curl` suite against the Render URL (dashboard summary
4,990/5,600/88%, the brief's amit@ethara.ai example answered via Groq, off-topic scoped
refusal, all 12 spec paths present in `openapi.json`, no-key fallback drill); headless-Chrome
pass against the Vercel URL (dashboard metrics, employee search → A1-1, seat map, new-joiner
queue, assistant suggested prompt + free-form Groq phrasing); screenshots of every main
screen captured from production into [screenshots/](./screenshots/).

---

## 10. Refactoring

**Prompt:** _(Phase 7)_ "Swap the Phase 2 mock data source for the real API without disturbing the
screens' behavior: the mock store's hook surface becomes TanStack Query hooks, `src/lib/mock` is
deleted from the app path, and all ×20 `DISPLAY_SCALE` presentation math goes away because the
backend holds real volumes."

**AI output / what changed:** The planned mock→API swap landed as designed. `MockDataProvider`
(client-state store, rule-enforcing actions, derived maps) → `QueryClientProvider` + `src/lib/api/`
hooks with the same conceptual surface (`metrics` → `useDashboardSummary`, `projectStats` →
`useProjectUtilization`, `floorStats` → `useFloorUtilization`, `pendingJoiners` →
`usePendingJoiners`, `seatByEmployee`/`occupantBySeat` → `useSeatIndex`, `suggestSeatsFor` →
`useSeatSuggestions`, `allocateSeat`/`releaseSeat`/`addJoiner` → mutation hooks). Business rules
moved from client code to their real home (the Phase 6 services); the UI now only *reports* rule
violations via the API's 409 details in toasts. Layout constants the seat-map skeleton needed
(`FLOORS`, `ZONES`) and the department list moved from `lib/mock/data.ts` into `lib/constants.ts`.
`generateMetadata` on the detail routes swapped the deterministic dataset lookup for a server-side
API fetch with fallback titles. Net: `src/lib/mock/` (3 files, ~600 lines incl. the PRNG and
generator) deleted; types in `src/types/` unchanged plus three new dashboard response shapes.

**Verification:** `grep -r "lib/mock\|DISPLAY_SCALE\|useMockData"` over `src/` returns nothing;
lint/tsc/build green; the 25-check browser pass in §6 Phase 7 exercised every migrated screen.

---

## 11. UI Design Pass (design-taste skill)

**Prompt:** "/design-taste-frontend according to the assessment brief" followed by "use the skill
to make betterments" — a project-local anti-slop design skill (tracked in
`.claude/skills/design-taste-frontend`, pinned in `skills-lock.json`) applied to the finished app
in redesign-preserve mode.

**AI output / what changed:** (1) Blueprint elevation: per-KPI identity tones (six solid/-soft/
-strong triads in `globals.css`), ambient aurora wash, per-theme elevation shadows, spring motion
easing, gradient brand mark, word-rise page titles and decode-in eyebrows
(`src/components/typography/`). (2) Copy audit: every user-visible em/en-dash removed across ~30
frontend strings (meta title, toasts, empty states, aria-labels, "Showing X-Y" ranges) and the
backend AI answer templates in `ai_nl.py`/`ai_query.py`; bare "—" table placeholders became
"Unassigned"/"No seat". (3) Betterments: the assistant's pristine screen is now a composed empty
state (brand mark + 2x2 toned prompt-card grid) instead of a lone welcome bubble over dead space;
the dashboard utilization donut gained a status-breakdown legend reusing the app-wide status hues;
new-joiner avatars are keyed to project identity tones.

**Correct:** The skill's hard rules (dash ban, consistency locks, motivated motion, composed
empty states) translated cleanly to the dashboard context.

**Incorrect / judgment call:** The skill targets marketing pages and bans numbered section
eyebrows ("01 CAPACITY"); kept them as the app's established Blueprint drafting signature since
dashboards are explicitly out of the skill's scope. One test pinned the old em-dash phrasing
("Yes — 1 person") and was updated in lockstep.

**Verification:** `tsc` + `next build` clean; backend pytest 66/66; Playwright screenshots of all
six screens in light and dark; live end-to-end Groq answer ("Where is Amit Sharma seated?" →
Floor 1, Zone A, Bay 1, Seat A1-1, Project Indigo) and the pristine→conversation transition
driven in headless Chrome.

---

## 12. Data-Viz Refinement (infographic + designer-skills)

**Prompt:** "npx -y skills add claude-office-skills/skills --skill infographic" plus the
Owl-Listener/designer-skills plugin marketplace (ui-design plugin: color-system,
data-visualization, dark-mode-design skills) — "for any possibility of improving our
infographics on the data, and ... if we can improve our color palette."

**AI output / what changed:** Palette audit against the color-system skill found the Blueprint
tokens already compliant (semantic trios with AA contrast in both themes, dark mappings, never
color-alone), so no palette change. The data-visualization skill exposed one real gap: the
dashboard utilization donut drew a single occupied arc while its legend listed four statuses.
`DonutStat` gained an optional `segments` prop rendering a true part-of-whole ring (butt-capped
arcs, 2px surface gaps, contiguous sweep-in via paired dasharray/dashoffset transitions), fed by
the same array as the legend so arc hues and dots cannot drift; legend rows gained share
percentages.

**Correct:** The dataviz palette validator passed CVD separation and 3:1 contrast for the four
status hues on both card surfaces.

**Incorrect / judgment call:** The validator flags Maintenance's gray ("reads gray") and the
bright dark-mode solids (outside its lightness band) — both are deliberate: gray is the app-wide
neutral for inactive stock, the bright solids are the Blueprint dark-theme status tokens, and
identity never rides on color alone (labels + counts beside every hue).

**Verification:** `tsc` + `next build` clean; card screenshots in both themes confirm arcs match
legend hues with visible gaps; validator runs recorded for light and dark surfaces.

---

## 13. Seat Map Elevation (design-taste + ui-ux-pro-max)

**Prompt:** "using /design-taste-frontend and /ui-ux-pro-max look how we can make the seating
view even more impressive... keep in mind these were the delivery requirements (3.3 Seat
Allocation)... we should meet them, but no harm in exceeding them."

**AI output / what changed:** (1) **Project lens** — a "Color by: Status / Project" toggle;
in Project mode occupied cells tint with their project's identity tone (same `id % 6` hue
order as project cards and joiner avatars), with a per-floor project legend + seat counts, so
"allocated project" is now visible at map level, not just in the dialog. (2) **Shared
hover/focus tooltip** (`A2-12 (Occupied) · Indigo`) driven by event delegation and direct
style writes — one portaled element for all 1,120 cells, zero React re-renders on hover,
full aria-labels retained. (3) **Occupancy context** — segmented status strip per zone header
(app-wide status hues) and live occupancy % in each floor tab. (4) **Motion** — bay rows
stagger-rise on floor switch, cells scale up on hover (compositor-only, reduced-motion safe).

**Correct:** ui-ux-pro-max's heatmap guidance (value on hover, legend with counts, pattern
fallback for colorblind users) mapped cleanly onto the existing fill-vs-outline + glyph cell
recipe; the roving-tabindex grid needed no changes.

**Incorrect / judgment call:** with 11 projects and 6 identity tones, two teams on one floor
can share a hue — the legend, tooltip, and dialog disambiguate, and the seeder clusters ~2-3
projects per floor, so collisions are rare in practice. First tooltip attempt anchored 272/88px
off: the route template's `animation-fill-mode: both` retained an identity transform/filter,
making the wrapper a containing block for position:fixed (see DEBUGGING_NOTES).

**Verification:** live geometry probe (tooltip center == cell center, bottom == cell top - 8);
screenshots of both lenses in both themes; requirements 3.3 walked item-by-item (floor, zone,
bay, seat number, 4 statuses, occupant, project, allocation date, duplicate prevention
untouched server-side).

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
