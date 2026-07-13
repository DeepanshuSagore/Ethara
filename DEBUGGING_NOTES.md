# Debugging Notes

Issues hit during development and how they were resolved (ongoing, per PROJECT_PLAN §7).
Frontend issues from Phases 1–3 are logged inline in [AI_PROMPTS.md](./AI_PROMPTS.md) §6.

---

## Phase 4 — Backend Foundation + Schema

### psycopg2-binary has no Python 3.14 wheel
- **Symptom:** `pip install -r requirements.txt` failed building `psycopg2-binary==2.9.10`
  from source: `Error: pg_config executable not found` (no cp314 wheel exists, and no local
  PostgreSQL to build against).
- **Fix:** switched to psycopg v3 — `psycopg[binary]==3.2.13` — which ships cp314 wheels.
  The production `DATABASE_URL` scheme becomes `postgresql+psycopg://…` (SQLAlchemy's psycopg3
  dialect); SQLite local dev is unaffected.
- **Related bumps for cp314 wheels / 3.14 support:** `sqlalchemy` 2.0.36 → 2.0.44 (3.14 support
  landed in 2.0.43), `pydantic` 2.10.4 → 2.12.5 (pydantic-core cp314 wheels), `fastapi`
  0.115.6 → 0.128.8 (pydantic 2.12 compatibility), `alembic` 1.14.0 → 1.16.5,
  `pydantic-settings` 2.7.0 → 2.12.0, `uvicorn[standard]` 0.34 → plain `uvicorn` 0.38
  (uvloop/httptools cp314 wheels lag; the standard extras aren't needed for dev, and Render can
  keep plain asyncio workers). Added `pytest==8.4.2` for the Phase 4 smoke suite.
- **Verification:** clean install into a fresh `backend/.venv` on Python 3.14.3; app boots;
  pytest 10/10.

### SQLite doesn't enforce foreign keys by default
- **Symptom:** the smoke test inserting a `seat_allocations` row with nonexistent ids
  committed successfully on SQLite — FK enforcement is off per connection unless
  `PRAGMA foreign_keys=ON` is issued.
- **Fix:** `connect`-event listener on the engine (SQLite dialect only) in
  [backend/app/core/database.py](backend/app/core/database.py), and the same pragma in the test
  fixture engine. PostgreSQL enforces FKs natively, so dev now matches prod.
- **Verification:** `test_fk_integrity_enforced` raises `IntegrityError` as expected.

---

## Phase 5 — Seed Data

No blocking issues — the seeder ran clean on the first attempt (the Python 3.14 dependency work
was already absorbed in Phase 4). Two design notes worth recording:

- **Determinism required banning `now()`:** the models' `created_at`/`updated_at` columns
  default to `utcnow()`, which would make every rerun differ. The seeder sets **all** date
  fields explicitly as offsets from a fixed base date (2026-07-13 UTC, same as the frontend
  mock), so two consecutive runs produce byte-identical `sqlite3 .dump` output (verified by
  SHA-256 comparison).
- **Status math is closed-form:** OCCUPIED must equal the ACTIVE-allocation count, so the seat
  statuses are derived (5,600 − 4,940 occupied − 100 reserved − 50 maintenance = 510 available ≥
  500) rather than sampled — every §5b minimum holds by construction, and the DB's partial
  unique indexes would reject any drift anyway.
