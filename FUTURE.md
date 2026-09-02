# Deferred work

Everything below was deliberately **not** done during the hardening pass, along with the reason.
The pass had a fixed budget and a standing rule against turning it into a rewrite, so each item
here is a decision rather than an oversight.

Ordered by what I would pick up first.

---

## 1. Finish the mypy strictness ladder

`pyproject.toml` runs `app/core/` and `app/services/` under the strict flag set and leaves
`app/api/` at the default level. That was a scope decision: the strict set on `app/api/` wants a
return annotation on every route, which is a wide mechanical diff across files this pass had no
other reason to touch.

**Next:** annotate the route returns, move `app/api/` into the strict override, then `app/seed/`,
then flip the global default to strict and delete the per-module overrides. The staged plan is
recorded in a comment in `pyproject.toml` so it does not get lost.

## 2. Rate limiting does not survive multiple replicas

`app/core/rate_limit.py` is an in-process token bucket. Each replica holds its own buckets, so
with N replicas the effective limit is N times the configured one. That is fine for a single
demo container and was chosen over adding Redis to protect one endpoint.

**Next, only if this is ever scaled out:** move the buckets behind Redis, or terminate the limit
at the edge (Render and Cloudflare both do this) and delete the in-process one rather than
running two limiters that disagree.

## 3. `X-Forwarded-For` is trusted without a proxy allowlist

`_client_key()` in `app/api/ai.py` takes the first entry of `X-Forwarded-For`, which anyone
talking to the API directly can set to anything, giving themselves a fresh bucket per request.
Accepted because this protects a demo budget rather than an auth boundary, and the honest
alternative — an allowlist of trusted proxy IPs — needs the deployment's actual egress ranges.

**Next:** if the assistant ever fronts something that matters, pin the trusted proxy set and
fall back to `request.client.host` for anything else.

## 4. No test asserts CI is green

CI runs ruff, mypy, the suite against Postgres, and both image builds. Every one of those was
run by hand and passes, but the badge cannot go green until the branch is pushed. Nothing in
the repo verifies the workflow file does what it claims beyond YAML validity.

**Next:** push, watch the first run, and fix whatever only shows up on a clean runner —
typically a missing system package or a path assumption that held locally.

## 5. The parse cache is per process and never expires

`app/services/ai_nl.py` holds an LRU of query → parsed intent, seeded with the four suggested
prompts. It is per process, so a restart re-learns everything except the seeded entries, and
entries never expire — a cached parse stays valid indefinitely because a question's *meaning*
does not change even though its answer does.

That last point is the design: the cache stores the parse, never the answer, so business rule 8
still holds. Worth stating clearly because "just cache the answer" is the obvious optimisation
and it would quietly serve stale numbers.

**Next:** if the model or prompt changes, bump a version into the cache key so old parses are
not reused against new intent semantics.

## 6. The canonical prompt list is duplicated across the stack

`_CANONICAL_PARSES` in `app/services/ai_nl.py` hard-codes the same four strings as
`frontend/src/components/assistant/suggested-prompts.tsx`. Change one and the cache silently
stops hitting — no test fails, the demo just quietly starts paying for Groq again. There is a
comment on each side, which is weaker than a mechanism.

**Next:** serve the prompt list from the API so the frontend and the cache read one source, or
add a test that fails when they drift.

## 7. Coverage is a floor, not a target

`fail_under = 70` in `pyproject.toml` is a ratchet against regression, not an aspiration. The
headline is 77% and 91% excluding `app/seed/`; the seed CLI sits at 0% under pytest because it
is verified by `python -m app.seed.verify` (23 invariant checks) and by `docker compose up`
instead.

**Next:** raise the ratchet as coverage genuinely improves. Never lower it to make a run pass.

## 8. `/health` checks the database and nothing else

It runs `SELECT 1` and reports the dialect, version and whether a Groq key is configured. It
deliberately does not check Groq — a provider outage should not take the service out of a load
balancer when the deterministic engine still answers every question.

**Next:** if a real dependency is ever added, split liveness from readiness rather than growing
this one endpoint.

---

## Refactors declined during the pass

Noted at the time and left alone, per the rule against refactoring working code:

| Where | What I would change | Why it was left |
|---|---|---|
| `app/api/*.py` | The `try / commit / except IntegrityError / rollback / 409` block appears four times across three routers | Extracting it touches every write path in the app. A bug fix is not a refactor |
| `app/services/ai_nl.py` | `_execute()` is a long `if intent == ...` chain that would read better as a dispatch table | Purely cosmetic. The chain is correct and each branch is two lines |
| `app/seed/run.py` | `build_rows()` is one long function doing projects, seats, employees and allocations | It is deterministic, covered by 23 verification checks, and splitting it risks the fixed-seed reproducibility that makes reruns identical |
| `tests/test_api.py` | 605 lines in one file; the fixtures could be shared with `test_ai_nl.py` | The two files have deliberately different datasets. Merging them would couple unrelated tests |

## Things that turned out not to be problems

Recorded so nobody re-investigates them:

- **SQLite/Postgres divergence.** The pass expected the two-engine run to surface schema
  differences and treated those failures as the deliverable. It found **none**. The app was
  already portable: `.ilike()` and `func.lower()` instead of relying on collation defaults, and
  the one-active-allocation partial unique indexes declared with both `sqlite_where` and
  `postgresql_where`. The seeder's `setval()` on the identity sequences is the only
  Postgres-specific code, and it is exercised by `docker compose up` rather than by pytest.
- **`Mapped["Project"]` forward references.** Ruff's `UP037` wants the quotes removed. Those
  names are imported under `TYPE_CHECKING` and do not exist at runtime; unquoted, it happens to
  work only because PEP 649 defers annotation evaluation on 3.14. The rule is disabled for
  `app/models/` with the reason recorded, and the quotes should stay.
