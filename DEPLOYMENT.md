# Deployment — Ethara Seat Allocation & Project Mapping

Phase 9 deliverable. The whole deployment was driven through the Render and Vercel **APIs**
(no dashboard clicking); every step below is reproducible with `curl`.

| Resource | Where | URL |
|---|---|---|
| Frontend | Vercel (Hobby) | https://ethara-snowy.vercel.app |
| Backend API | Render (free web service, Oregon) | https://ethara-api-edmu.onrender.com |
| Swagger | — | https://ethara-api-edmu.onrender.com/docs |
| ReDoc | — | https://ethara-api-edmu.onrender.com/redoc |
| Database | Neon PostgreSQL 17 (free, AWS `us-west-2`) | `ep-patient-shape-aftiv077.c-2.us-west-2.aws.neon.tech` |
| Keep-alive | cron-job.org (free) | pings `/health`, job `8360444` |

---

## 1. Architecture

```
Browser ──► Vercel (Next.js static + SSR)  ethara-snowy.vercel.app
                │  fetch (NEXT_PUBLIC_API_URL, inlined at build time)
                ▼
            Render web service (FastAPI/uvicorn)  ethara-api-edmu.onrender.com
                ▲   │  SQLAlchemy (postgresql+psycopg://, TLS, direct endpoint)
                │   ▼
                │  Neon PostgreSQL 17 (free, AWS us-west-2 — same metro as Render)
                │
                └── cron-job.org GET /health every 10 min, 23 h/day
                    (keeps the free web service from idling — §8)
```

- Frontend and backend deploy independently; the contract is the REST surface in
  [backend/README.md](./backend/README.md).
- The database is **Neon**, not Render Postgres: Render's free Postgres is deleted after
  ~30 days no matter what (§5 gotcha 1), which took the live demo down once. Neon's free
  tier does not expire. Both sit in Oregon, so the extra TLS hop costs little.
- Groq is called server-side only; if it is down or the key is absent the deterministic
  engine answers (see [backend/README.md](./backend/README.md) §AI assistant) — the live demo
  never depends on Groq being up.

## 2. Backend — Render

### PostgreSQL — Neon (project `ethara`, `empty-truth-17673890`)

Originally Render's own managed Postgres; migrated to Neon after that instance expired and
was deleted (§5 gotcha 1). Created via `POST https://console.neon.tech/api/v2/projects` —
`region_id: aws-us-west-2`, `pg_version: 17`, free plan.

Two things the connection string must get right:

- **Direct endpoint, not pooled.** `GET /projects/{id}/connection_uri` returns the *pooled*
  host (`…-pooler.…`) by default; pass `pooled=false`. The pooler is PgBouncer in transaction
  mode, which breaks psycopg v3's prepared statements under a long-lived SQLAlchemy pool.
  The pooled host is the right choice for serverless, not for a persistent uvicorn process.
- **`postgresql+psycopg://` scheme** (same rewrite as Render's, §5 gotcha 3) and Neon's
  mandatory `sslmode=require`.

Migrate + seed run **on Render**, in-region, via the temporary start command in §7 — no local
Python or IP allowlist needed. Seed against Neon: 23/23 checks, ~19 s.

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

1. **Render's free Postgres expires after ~30 days — and is deleted, not suspended.**
   ~~Fought.~~ **Resolved by leaving Render Postgres entirely (§2).** The original `ethara-db`
   (created 2026-07-13) was gone by 2026-08-31: it no longer appeared under `GET /v1/postgres`
   for any workspace, while the web service kept its now-dangling `DATABASE_URL`. Symptom:
   `/health` stays green (no DB touched) but every DB-backed route 500s with
   `failed to resolve host 'dpg-…'`. No amount of traffic prevents this — the timer is
   calendar-based, so a keep-alive ping does **not** help. Neon's free tier has no such expiry.
   §7 keeps the recovery runbook for reference.
2. **Cold starts** — the free web service spins down after ~15 min idle and the first request
   then takes **~50 s**. Mitigated by the keep-alive in §8; the cost is ~721 of the 750 free
   instance-hours/month, which only works because `ethara-api` is the sole free service in its
   workspace. Neon *also* scales to zero (after 5 min), but wakes in well under a second — a
   measured first-hit-after-idle was **0.38 s**, so it is not worth burning CU-hours to prevent.
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

## 7. Recovering from an expired database

Run when §5 gotcha 1 fires (`/health` ok, everything DB-backed 500s). Nothing to delete — the
expired instance is already gone — so this is create → seed → repoint → redeploy.

1. **Create the replacement** — `POST /v1/postgres` with plan `free`, region `oregon` (must
   match the web service, or there is no internal network between them), `version: "17"`,
   `databaseName`/`databaseUser` `ethara`. Poll until `status: available`.
2. **Repoint the API** — `PUT /v1/services/{srv}/env-vars/DATABASE_URL` to the new
   **internal** connection string, scheme rewritten to `postgresql+psycopg://` (§5 gotcha 3),
   then `POST /v1/services/{srv}/deploys` (§4: env edits alone do not restart).
3. **Migrate + seed in-region.** The database name changes on every new instance
   (`ethara_pgvm`, …), so the URL cannot be reused from an older note — always read it back
   from `/connection-info`.

   Two routes that do *not* work on free tier:
   - one-off jobs — `POST /v1/services/{srv}/jobs` → `400 new paid services not allowed`;
   - seeding from a dev machine (the original Phase 9 route) — needs a local Python matching
     the 3.14 pins, plus the IP allowlist and keepalives of §5 gotchas 4-5.

   What works: temporarily prepend the work to the start command, deploy, then **put the
   start command back and redeploy** — otherwise every free-tier spin-up re-seeds.
   ```
   alembic upgrade head && python -m app.seed.run && python -m app.seed.verify && uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
   In-region over the internal network the whole seed takes ~19 s, and the deploy log carries
   the `seed.verify` output (23/23 checks). Restore to
   `uvicorn app.main:app --host 0.0.0.0 --port $PORT` and redeploy.
4. **Verify** — `GET /dashboard/summary` returns real counts, `POST /ai/query` with the brief's
   example names a floor/zone/seat, and the Vercel frontend renders live numbers with a clean
   console. The frontend needs **no** redeploy as long as the API hostname is unchanged
   (`NEXT_PUBLIC_API_URL` is baked at build time — §3).

Done 2026-08-31: seed restored 11 projects · 5,600 seats · 4,987 employees · 4,907 allocations,
all 23 checks green. The same start-command trick seeded Neon during the migration off Render
Postgres — it works against any `DATABASE_URL`, not just an internal one.

## 8. Keep-alive (no cold starts)

Render free spins down after 15 min idle, and the next visitor waits ~50 s. For a portfolio
link that reads as "the site is broken", so the service is pinged instead.

**Primary — cron-job.org** (free, no card, job `8360444`):

| Setting | Value |
|---|---|
| URL | `https://ethara-api-edmu.onrender.com/health` |
| Method / interval | `GET` · every 10 min at `:00 :10 :20 :30 :40 :50` |
| Hours (UTC) | all except **22** — 138 pings/day, ~23 h/day warm |

Two deliberate choices:

- **`/health`, not a data route.** It touches no database
  ([main.py](./backend/app/main.py)), so it keeps *Render* warm while letting Neon scale to
  zero. Pinging a DB-backed route around the clock would need ~186 CU-hours/month against
  Neon's 100 free — over budget, to save ~0.4 s.
- **23 h/day, not 24.** Staying warm every hour of a 31-day month costs 744 of Render's 750
  free instance-hours. Blowing that budget **suspends** the service until the month rolls
  over, which is far worse than one slow load. Skipping 22:00 UTC (03:30 IST) brings it to
  ~721 h with real headroom; the exposed window is ~45 min at the least likely visiting hour.

**Backup — [.github/workflows/keep-alive.yml](./.github/workflows/keep-alive.yml).** This was
the original primary and could not do the job: GitHub throttles shared-runner crons, and on
this repo a `*/10` schedule actually fired with a **median gap of 136 min and a worst case of
739 min** against 45 min of coverage per run — hours of daily exposure. GitHub also disables
scheduled workflows after 60 days of repo inactivity. It is kept only as a one-request safety
net (the 45-minute sleep loop was removed).

Measured after the switch, Render warm and Neon idle 6 min: first DB-backed request **0.38 s**,
steady state 0.33-0.80 s.
