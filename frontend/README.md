# Ethara Frontend (Next.js)

Admin console for the Ethara Seat Allocation & Project Mapping System — Next.js App Router +
TypeScript + Tailwind CSS v4, fetching live data from the FastAPI backend with TanStack Query.

## Run it

The UI expects the backend on **http://localhost:8000** (see
[../backend/README.md](../backend/README.md) — migrate + seed + `uvicorn` first).

```bash
npm install
cp .env.local.example .env.local   # optional — defaults already point at localhost:8000
npm run dev                        # http://localhost:3000
```

| Env var | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Base URL of the FastAPI backend (inlined at build time) |

Checks: `npm run lint` · `npx tsc --noEmit` · `npm run build`.

## How data flows (Phase 7)

- `src/lib/api/client.ts` — typed `apiFetch` wrapper: query-string builder, abort-signal
  passthrough, `ApiError` carrying the API's `detail` message (409s surface business-rule
  violations verbatim in toasts).
- `src/lib/api/{employees,projects,seats,allocations,dashboard,ai}.ts` — one module per resource,
  exact backend paths only.
- `src/lib/api/hooks.ts` — the TanStack Query surface every screen consumes: dashboard metrics,
  employees (server-side `?search=&department=&project_id=&status=` + `limit`/`offset`), projects,
  per-floor seats, rule-5 suggestions, a `useSeatIndex()` joining ACTIVE `/allocations` with
  `/seats` for who-sits-where lookups, and allocate/release/add-joiner mutations that invalidate
  the cache so the dashboard, seat map and lists refetch live (business rule 8).
- Screens: Dashboard, Employees (list + detail), Projects (list + detail), Seats (floor-tab map +
  allocate/release dialog), New Joiners (pending queue + suggestions), Assistant (`POST /ai/query`).
  Loading skeletons / empty states / error states with retry are driven by real fetch status.
- Demo-mode role switcher (Admin / HR / Project / Employee) is UI-only and gates the
  allocate/release/add actions.

## Structure

```
src/
├── app/                # App Router: (dashboard) route group, providers, loading/error states
├── components/         # ui primitives · layout shell · charts · per-domain screens
├── lib/
│   ├── api/            # typed fetch client + TanStack Query hooks (Phase 7)
│   ├── constants.ts    # nav, roles, floors/zones, departments
│   └── demo-role.tsx   # demo-mode role store
└── types/              # shared domain types mirroring the DB schema
```
