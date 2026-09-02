# Ethara Backend (FastAPI)

REST API for the Ethara Seat Allocation & Project Mapping System.

## Setup
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then fill values
alembic upgrade head          # create the schema (SQLite by default)
python -m app.seed.run        # seed data (see below)
uvicorn app.main:app --reload
```
The DB is `DATABASE_URL`-driven: SQLite locally, PostgreSQL (`postgresql+psycopg://…`,
psycopg v3) in production — see [../DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md).
- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Testing

95 tests: schema smoke + endpoint contracts + every allocation rule + the mocked Groq NL
layer + health, request logging, rate limiting and the parse cache. The suite is fully
offline — an autouse fixture blanks `GROQ_API_KEY`, so it never calls Groq even when
`.env` holds a real key. Coverage is **77%** with branch coverage on, 91% excluding
`app/seed/`.

**Two engine tiers, and the second one is the point.**

```bash
pytest                                  # SQLite only: 95 passed, 95 skipped, ~1s
pytest --cov=app --cov-report=term-missing

# Both engines. Needs a Postgres; compose already provides one on 5433.
docker compose up -d db
docker compose exec db psql -U ethara -d postgres -c "CREATE DATABASE ethara_test OWNER ethara;"
TEST_DATABASE_URL=postgresql+psycopg://ethara:ethara@localhost:5433/ethara_test pytest
# → 190 passed in ~10s
```

| Tier | Engine | Runs | Why |
|---|---|---|---|
| `[sqlite]` | in-memory SQLite, `StaticPool` | always | Fast enough to run on every save |
| `[postgres]` | PostgreSQL 17, psycopg v3 | when `TEST_DATABASE_URL` is set; always in CI | Production is Postgres |

Every test runs on both tiers — nothing is marked SQLite-only. The `engine` fixture drops
and recreates the schema per test, so the tiers cannot leak into each other.

**What the second tier is for.** SQLite and Postgres disagree about `LIKE` case
sensitivity, `VARCHAR(n)` length enforcement, type affinity, and the order rows come back
in without an `ORDER BY`. A green SQLite-only suite proves the SQLite schema is correct
and says nothing about the one actually deployed.

Running it found **no divergences** — the app was already portable: `.ilike()` and
`func.lower()` rather than relying on either engine's collation defaults, and the
one-active-allocation partial unique indexes declared with both `sqlite_where` and
`postgresql_where`. The seeder's `setval()` on the identity sequences is the one place
that is explicitly Postgres-only, and it is exercised by `docker compose up` rather than
by pytest: seeding writes explicit ids, so without it the next API insert would collide
on the primary key.

## Endpoints (Phase 6 — exact paths from the brief, no version prefix)

| Method & path | Purpose | Errors |
|---|---|---|
| `POST /employees` | Create (new joiners default to `PENDING_ALLOCATION`) | 404 unknown project · 409 duplicate email/code (rule 6) · 422 |
| `GET /employees` | List — `?search=&department=&role=&project_id=&status=` (+ optional `limit`/`offset`) | 422 bad status |
| `GET /employees/{id}` | Detail | 404 |
| `PUT /employees/{id}` | Partial update; `status=EXITED` releases the seat | 404 · 409 duplicate email |
| `DELETE /employees/{id}` | **Deactivate** (soft): `EXITED` + seat released, history kept | 404 |
| `POST /projects` | Create | 409 duplicate name |
| `GET /projects` | List | — |
| `GET /projects/{id}` | Detail (convenience) | 404 |
| `GET /projects/{id}/employees` | Team members | 404 |
| `POST /seats` | Create (`seat_code` derived when omitted) | 409 duplicate position (rule 7) |
| `GET /seats` | List — `?status=&floor=&zone=` (+ `limit`/`offset`) | 422 bad status |
| `GET /seats/available` | Available seats (optional `?floor=&zone=`) | — |
| `GET /seats/suggestions` | Rule-5 ranking for a joiner — `?employee_id=&limit=` | 404 |
| `POST /seats/allocate` | `{employee_id, seat_id}` → 201 allocation | 404 · 409 rules 1/2/4 |
| `POST /seats/release` | `{seat_id}` → allocation `RELEASED`, seat `AVAILABLE` (rule 3) | 404 · 409 no active allocation |
| `GET /seats/{id}` | Detail (convenience) | 404 |
| `GET /allocations` | Allocation rows — `?employee_id=&seat_id=&status=` (+ `limit`/`offset`); Phase 7 convenience so the UI can resolve who sits where | 422 bad status |
| `GET /dashboard/summary` | Live headline metrics (rule 8) | — |
| `GET /dashboard/project-utilization` | Headcount/seated/home zone per project | — |
| `GET /dashboard/floor-utilization` | Seat counts + occupancy per floor | — |
| `POST /ai/query` | `{"query": "…"}` → `{"answer": "…"}` — Groq NL parsing over the deterministic keyword engine (Phase 8, see below) | 422 empty or over-long query · 429 rate limited (`Retry-After`) |

Example:
```bash
curl -X POST localhost:8000/ai/query -H 'Content-Type: application/json' \
  -d '{"query": "Where is my seat? My email is amit@ethara.ai"}'
# → {"answer":"Amit Sharma is seated on Floor 1, Zone A, Bay 1, Seat A1-1. …"}
```

## AI assistant (Phase 8)

`POST /ai/query` runs NL → structured query: Groq (`GROQ_MODEL`, default
`openai/gpt-oss-120b`, JSON mode via its OpenAI-compatible API) parses the question into an
intent + entities, `app/services/ai_nl.py` executes that intent against the database, and the
answer is composed from real DB rows — the model never free-generates facts. On any failure
(no `GROQ_API_KEY`, HTTP error, timeout, rate limit, bad JSON, unknown intent, low confidence)
it falls back to the Phase 6 deterministic keyword engine (`app/services/ai_query.py`), so the
endpoint works offline and never 500s. Off-topic or prompt-injection queries get a scoped
refusal, and conversational openers ("hey", "what can you do?") get a short greeting - both
live in the Groq layer *and*, independently, in the deterministic engine, so they survive a
Groq outage. Queries over 500 chars skip Groq entirely.

No extra dependency: the Groq call is a single `httpx` POST (the groq SDK warns on
Python 3.14 — see [../DEBUGGING_NOTES.md](../DEBUGGING_NOTES.md)). Set `GROQ_API_KEY` in
`.env` (see `.env.example`); leave it empty to run purely deterministic.

### Protecting the endpoint

The demo is public and carries a real key, so `/ai/query` is the one route that is metered.

| Guard | Behaviour |
|---|---|
| Per-IP rate limit | `AI_RATE_LIMIT_REQUESTS` (20) per `AI_RATE_LIMIT_WINDOW_SECONDS` (60), then **429 with `Retry-After`** |
| Body cap | `query` is capped at 2,000 chars and `history` at 20 turns, so a payload cannot exceed ~42 KB → 422 |
| Parse cache | The four suggested prompts are pre-seeded, so the demo's common path never calls Groq |

The limiter is an in-process token bucket (`app/core/rate_limit.py`) rather than Redis: this
runs as a single container, and an extra service to protect one endpoint would cost more to
operate than the spend it saves. The trade-off is explicit — across multiple replicas the
limit is per replica, not global. Buckets refill continuously rather than resetting on a
fixed window, so a caller who waits is served immediately instead of queueing for a boundary.

The cache stores the **parse**, not the answer. Answers are composed from live rows and
business rule 8 requires them to move the instant a seat is allocated, so caching answers
would serve a reviewer stale numbers. Caching the intent skips the provider call without
touching freshness — `test_a_cached_parse_still_answers_from_live_rows` pins that down.
Follow-ups are never served from cache: history changes what a question means.

## Logging

Every log record is one JSON object on stdout (`app/core/logging.py`), which is what the
container runtime collects. `LOG_LEVEL` sets the root level, default `INFO`.

**Per request** — one `ethara.request` line, carrying a request id. An inbound
`X-Request-ID` is honoured so a trace survives the hop from the frontend or a proxy;
otherwise one is minted. Either way it comes back on the response, which is what makes a
user-reported error findable.

```json
{"ts":"2026-09-02T02:53:51+0530","level":"INFO","logger":"ethara.request","message":"request",
 "request_id":"cbae0c1e8ff34ecc","method":"GET","path":"/health","status":200,"duration_ms":1.65}
```

**Per Groq call** — a `groq_call` line with the stage (`parse` or `chat`), the outcome, and
the latency. When the deterministic engine takes over, a second `ai_fallback` line records
*why*:

```json
{"level":"INFO","logger":"app.services.ai_nl","message":"groq call","event":"groq_call",
 "stage":"parse","outcome":"error","latency_ms":4001.2,"model":"openai/gpt-oss-120b","error":"ReadTimeout"}
{"level":"WARNING","logger":"app.services.ai_nl","message":"deterministic fallback engaged",
 "event":"ai_fallback","reason":"parse_unusable","provider_called":true}
```

The severity split is the useful part. `provider_called: false` at `INFO` means the call was
never made — no key configured, or the query was over the length cap; that is configuration,
not an incident. `provider_called: true` at `WARNING` means Groq was called and the answer was
unusable, and a burst of those is provider degradation. `reason` separates *failed*
(`parse_unusable` after an HTTP error or timeout) from *answered unhelpfully* (`parse_unusable`
after a low-confidence parse, distinguishable by the preceding `groq_call` outcome).

**Deliberately not logged, anywhere:**

| Omitted | Why |
|---|---|
| `GROQ_API_KEY` | `/health` reports the boolean `groq_configured`, never the value |
| Query strings | `?search=` carries free text, and the assistant carries whatever the user typed |
| Request and response bodies | The AI question and the employee payloads both hold personal data |
| Employee names and emails | Answers are composed from them; the logs record shape and timing only |

`test_query_strings_never_reach_the_logs` asserts the second row against the real formatter
output rather than the record attributes, so a field that leaks fails the suite.

## Seed data
```bash
python -m app.seed.run        # wipe + repopulate all four tables, then verify
python -m app.seed.verify     # re-run just the verification (summary + asserts)
```
Deterministic (fixed seed + fixed base date — reruns produce identical data) and idempotent
(each run wipes and repopulates in one transaction). Targets from PROJECT_PLAN §5b:
**11 projects** (exact names, all ACTIVE) · **5,600 seats** (5 floors × 2 zones × 80 bays × 7,
`seat_code = {zone}{bay}-{seat_number}`) · **5,000 employees** (unique `@ethara.ai` emails,
employee #1 = Amit Sharma / amit@ethara.ai) · **4,940 ACTIVE allocations** clustered around each
project's home zone · seat statuses 510 AVAILABLE / 100 RESERVED / 50 MAINTENANCE / 4,940 OCCUPIED.
`verify` exits non-zero if any §5b target or invariant fails. Works unchanged against Postgres
(`DATABASE_URL`-driven).

## Structure
```
app/
├── main.py        # FastAPI entrypoint (CORS, routers)
├── core/          # config + db session
├── models/        # SQLAlchemy models
├── schemas/       # Pydantic schemas
├── api/           # REST routers, mounted at root paths (thin — Phase 6)
├── services/      # business logic: allocation rules, dashboard, AI query (Phase 6) + Groq NL layer (Phase 8)
└── seed/          # Faker seed generator   (Phase 5)
```

See [../PROJECT_PLAN.md](../PROJECT_PLAN.md) for the full plan.
