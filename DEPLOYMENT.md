# Deployment — Ethara Seat Allocation & Project Mapping

Phase 9 deliverable. The whole deployment was driven through the Render and Vercel **APIs**
(no dashboard clicking); every step below is reproducible with `curl`.

| Resource | Where | URL |
|---|---|---|
| Frontend | Vercel (Hobby) | https://ethara-snowy.vercel.app |
| Backend API | Render (free web service, Oregon) | https://ethara-api-edmu.onrender.com |
| Swagger | — | https://ethara-api-edmu.onrender.com/docs |
| ReDoc | — | https://ethara-api-edmu.onrender.com/redoc |
| Database | Render managed PostgreSQL 17 (free) | internal to Render |

---

## 1. Architecture

```
Browser ──► Vercel (Next.js static + SSR)  ethara-snowy.vercel.app
                │  fetch (NEXT_PUBLIC_API_URL, inlined at build time)
                ▼
            Render web service (FastAPI/uvicorn)  ethara-api-edmu.onrender.com
                │  SQLAlchemy (postgresql+psycopg://, internal network)
                ▼
            Render PostgreSQL 17 (ethara-db, same region: Oregon)
                ▲
                └── one-time migrate + seed, run from the dev machine over the
                    external connection string (IP-allowlisted)
```

- Frontend and backend deploy independently; the contract is the REST surface in
  [backend/README.md](./backend/README.md).
- The backend talks to Postgres over Render's **internal** network (no TLS hop, same region).
- Groq is called server-side only; if it is down or the key is absent the deterministic
  engine answers (see [backend/README.md](./backend/README.md) §AI assistant) — the live demo
  never depends on Groq being up.

## 2. Backend — Render

### PostgreSQL (`ethara-db`)

Created via `POST https://api.render.com/v1/postgres` — plan `free`, region `oregon`,
`version: "17"`. Then, **from the dev machine**, against the *external* connection string:

```bash
cd backend
export DATABASE_URL="postgresql+psycopg://…external…?sslmode=require"   # see §5 gotchas
.venv/bin/alembic upgrade head        # schema (single initial migration)
.venv/bin/python -m app.seed.run      # deterministic seed: 5,000 employees / 5,600 seats
.venv/bin/python -m app.seed.verify   # 21 hard checks — all passed against prod
```

### Web service (`ethara-api`)

Created via `POST https://api.render.com/v1/services`:

| Setting | Value |
|---|---|
| Type / plan / region | `web_service` / `free` / `oregon` |
| Repo / branch / root dir | `DeepanshuSagore/Ethara` / `main` / `backend` |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Auto-deploy | on push to `main` |

Environment variables:

| Key | Value / note |
|---|---|
| `DATABASE_URL` | **internal** connection string, scheme rewritten to `postgresql+psycopg://` |
| `GROQ_API_KEY` | Groq key (set via API, never committed) |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` |
| `CORS_ORIGINS_RAW` | `https://ethara-snowy.vercel.app,https://ethara-deepanshus-projects-129a43e3.vercel.app,https://ethara-git-main-deepanshus-projects-129a43e3.vercel.app,http://localhost:3000` |
| `PYTHON_VERSION` | `3.14.3` — matches the local venv and the requirements pins exactly |

Render's default Python for new services is already 3.14.3, so the Phase 4 pins
(psycopg v3, SQLAlchemy 2.0.44, pydantic 2.12) run unchanged — pinned anyway so a future
default bump can't drift the runtime.

## 3. Frontend — Vercel

Project `ethara` created via `POST https://api.vercel.com/v11/projects` (team scope
"Deepanshu's projects"), with the GitHub repo linked in the same call:

| Setting | Value |
|---|---|
| Framework preset / root directory | `nextjs` / `frontend` |
| Git repository | `github.com/DeepanshuSagore/Ethara` → auto-deploys `main` |
| Env var (all targets) | `NEXT_PUBLIC_API_URL=https://ethara-api-edmu.onrender.com` |

First production deploy triggered via `POST https://api.vercel.com/v13/deployments` with
`gitSource: {ref: "main"}`. Production alias: **https://ethara-snowy.vercel.app**.

`NEXT_PUBLIC_API_URL` is inlined at **build** time (see
[frontend/src/lib/api/client.ts](./frontend/src/lib/api/client.ts)) — changing it requires a
redeploy, not just an env edit.

## 4. CORS

`CORS_ORIGINS_RAW` (comma-separated, parsed in
[backend/app/core/config.py](./backend/app/core/config.py)) lists the Vercel production alias,
the two stable team aliases, and localhost for dev. Set via
`PUT /v1/services/{srv}/env-vars/CORS_ORIGINS_RAW`, then a manual deploy — **Render env-var
edits via API do not restart the service by themselves** (`POST /v1/services/{srv}/deploys`).

## 5. Free-tier gotchas (by design, documented not fought)

1. **Postgres expires after ~30 days** — `ethara-db` was created 2026-07-13 and Render will
   suspend it around **2026-08-12** unless upgraded. Re-creating is cheap: new instance →
   `alembic upgrade head` → `python -m app.seed.run` (deterministic — identical data) →
   update `DATABASE_URL` on the web service. One free Postgres per workspace.
2. **Cold starts** — the free web service spins down after ~15 min idle; the first request
   then takes **~50 s** (the frontend shows its loading skeletons until data lands). Subsequent
   requests are normal.
3. **`postgres://` vs `postgresql+psycopg://`** — Render hands out `postgres://…` connection
   strings; SQLAlchemy + psycopg v3 (the only driver with Python 3.14 wheels, see
   [DEBUGGING_NOTES.md](./DEBUGGING_NOTES.md) Phase 4) needs the scheme rewritten to
   `postgresql+psycopg://`. Both the seeded external URL and the service's internal URL were
   rewritten this way.
4. **External DB access is blocked by default** — a Render Postgres created via API has an
   empty IP allow list; external connections die mid-handshake with
   `SSL connection has been closed unexpectedly` (no helpful error). Fix: PATCH the instance
   with the connecting machine's `/32` in `ipAllowList` (kept that narrow on purpose —
   only the one-time migrate/seed needs external access; the API uses the internal URL).
5. **Long-haul external connections drop** — bulk-seeding 15k rows from a distant machine hit
   `SSL SYSCALL error: Operation timed out`; appending
   `sslmode=require&keepalives=1&keepalives_idle=30&keepalives_interval=10&keepalives_count=9`
   to the external URL made the migrate + seed reliable.

## 6. Post-deploy verification (all against production)

- `GET /dashboard/summary` → `4,990 employees / 5,600 seats / 88% utilization` (§5b targets).
- `python -m app.seed.verify` against the prod DB → **21/21 checks pass**.
- `POST /ai/query` with the brief's example (*"Where is my seat? My email is amit@ethara.ai"*)
  → Groq-parsed answer naming Floor 1 / Zone A / seat A1-1.
- Off-topic prompt → scoped refusal; **fallback drill**: `GROQ_API_KEY` temporarily **deleted**
  on Render (its env-var API 400s on empty values — see DEBUGGING_NOTES §Phase 9) → the same
  endpoint still answers deterministically, probed with a query only the Groq layer can parse →
  key restored, Groq answers again.
- Headless-Chrome pass against https://ethara-snowy.vercel.app: dashboard numbers, employee
  search (amit@ethara.ai → A1-1), seat map grid, new-joiner queue, assistant suggested prompt
  + free-form Groq phrasing. Screenshots in [screenshots/](./screenshots/).
