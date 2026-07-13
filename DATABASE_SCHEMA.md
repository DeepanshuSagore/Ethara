# Database Schema — Ethara Seat Allocation & Project Mapping

Phase 4 deliverable. Four tables (`employees`, `projects`, `seats`, `seat_allocations`)
managed by SQLAlchemy 2.0 typed models ([backend/app/models/](backend/app/models/)) and a single
Alembic migration ([backend/alembic/versions/](backend/alembic/versions/)).

**Portability:** the same migration runs on SQLite (local dev, `sqlite:///./ethara.db`) and
PostgreSQL (Render, `postgresql+psycopg://…`). Only portable column types are used
(`Integer`/`String`/`Text`/`DateTime`); status enums are `String` + `CHECK` constraints rather
than native enums; the one-ACTIVE-row rules use **partial unique indexes**, which both engines
support. All timestamps are stored as UTC (`DateTime(timezone=True)`, Python-side
`datetime.now(timezone.utc)` defaults). On SQLite the engine turns on `PRAGMA foreign_keys` per
connection so FK enforcement matches Postgres.

All constraint/index names come from a `MetaData` naming convention
(`pk_…`, `fk_…`, `uq_…`, `ck_…`, `ix_…`) so Alembic autogenerate stays deterministic.

---

## ER overview

```
projects 1 ──── * employees          (employees.project_id)
projects 1 ──── * seat_allocations   (seat_allocations.project_id, denormalized for reporting)
employees 1 ─── * seat_allocations   (seat_allocations.employee_id)
seats 1 ─────── * seat_allocations   (seat_allocations.seat_id)
```

- Seat location is **flat**: Floor → Zone → Bay → Seat as columns on `seats` (per the brief).
- `seat_allocations` is the single source of truth for "who sits where": an employee's current
  seat is their (at most one) `ACTIVE` row; releases keep the row as history
  (`RELEASED` + `released_date`), so the table is an audit log too.

---

## Tables

### `employees`

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK |
| employee_code | VARCHAR(20) | NOT NULL, UNIQUE |
| name | VARCHAR(120) | NOT NULL |
| email | VARCHAR(255) | NOT NULL, **UNIQUE** |
| department | VARCHAR(80) | NOT NULL |
| role | VARCHAR(80) | NOT NULL |
| joining_date | DATETIME (UTC) | NOT NULL |
| status | VARCHAR(30) | NOT NULL, CHECK ∈ {ACTIVE, ON_LEAVE, EXITED, PENDING_ALLOCATION} |
| project_id | INTEGER | NOT NULL, FK → projects.id |
| created_at | DATETIME (UTC) | NOT NULL |
| updated_at | DATETIME (UTC) | NOT NULL (refreshed on update) |

Indexes: `ix_employees_department`, `ix_employees_status`, `ix_employees_project_id`
(the Phase 6 `GET /employees` filter params), plus the unique indexes behind
`uq_employees_email` / `uq_employees_employee_code`.

### `projects`

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK |
| name | VARCHAR(100) | NOT NULL, UNIQUE |
| description | TEXT | NOT NULL (default "") |
| manager_name | VARCHAR(120) | NOT NULL |
| status | VARCHAR(20) | NOT NULL, CHECK ∈ {ACTIVE, ON_HOLD, COMPLETED} |
| created_at | DATETIME (UTC) | NOT NULL |

### `seats`

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK |
| floor | INTEGER | NOT NULL |
| zone | VARCHAR(10) | NOT NULL |
| bay | INTEGER | NOT NULL |
| seat_number | INTEGER | NOT NULL |
| seat_code | VARCHAR(20) | NOT NULL, indexed (`{zone}{bay}-{seat_number}`, e.g. `B4-23`; repeats across floors so **not** unique) |
| status | VARCHAR(20) | NOT NULL, CHECK ∈ {AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE} |
| created_at | DATETIME (UTC) | NOT NULL |

Constraints/indexes: `uq_seats_floor_zone_bay_seat_number` **UNIQUE(floor, zone, bay,
seat_number)**; `ix_seats_floor_zone`, `ix_seats_status` (Phase 6 `GET /seats?status=&floor=&zone=`),
`ix_seats_seat_code`.

### `seat_allocations`

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK |
| employee_id | INTEGER | NOT NULL, FK → employees.id, indexed |
| seat_id | INTEGER | NOT NULL, FK → seats.id, indexed |
| project_id | INTEGER | NOT NULL, FK → projects.id, indexed |
| allocation_status | VARCHAR(20) | NOT NULL, CHECK ∈ {ACTIVE, RELEASED} |
| allocation_date | DATETIME (UTC) | NOT NULL |
| released_date | DATETIME (UTC) | NULL (set on release) |

**Partial unique indexes** (the schema-level heart of the allocation rules):

```sql
CREATE UNIQUE INDEX uq_seat_allocations_one_active_per_employee
  ON seat_allocations (employee_id) WHERE allocation_status = 'ACTIVE';
CREATE UNIQUE INDEX uq_seat_allocations_one_active_per_seat
  ON seat_allocations (seat_id) WHERE allocation_status = 'ACTIVE';
```

Any number of `RELEASED` history rows may exist per employee/seat; at most one `ACTIVE` row each.

---

## DDL (as created by `alembic upgrade head` on SQLite; Postgres output is equivalent)

```sql
CREATE TABLE projects (
    id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    manager_name VARCHAR(120) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT pk_projects PRIMARY KEY (id),
    CONSTRAINT ck_projects_status_valid CHECK (status IN ('ACTIVE', 'ON_HOLD', 'COMPLETED')),
    CONSTRAINT uq_projects_name UNIQUE (name)
);

CREATE TABLE seats (
    id INTEGER NOT NULL,
    floor INTEGER NOT NULL,
    zone VARCHAR(10) NOT NULL,
    bay INTEGER NOT NULL,
    seat_number INTEGER NOT NULL,
    seat_code VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT pk_seats PRIMARY KEY (id),
    CONSTRAINT ck_seats_status_valid
        CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE')),
    CONSTRAINT uq_seats_floor_zone_bay_seat_number UNIQUE (floor, zone, bay, seat_number)
);
CREATE INDEX ix_seats_floor_zone ON seats (floor, zone);
CREATE INDEX ix_seats_seat_code ON seats (seat_code);
CREATE INDEX ix_seats_status ON seats (status);

CREATE TABLE employees (
    id INTEGER NOT NULL,
    employee_code VARCHAR(20) NOT NULL,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    department VARCHAR(80) NOT NULL,
    role VARCHAR(80) NOT NULL,
    joining_date DATETIME NOT NULL,
    status VARCHAR(30) NOT NULL,
    project_id INTEGER NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT pk_employees PRIMARY KEY (id),
    CONSTRAINT ck_employees_status_valid
        CHECK (status IN ('ACTIVE', 'ON_LEAVE', 'EXITED', 'PENDING_ALLOCATION')),
    CONSTRAINT fk_employees_project_id_projects FOREIGN KEY(project_id) REFERENCES projects (id),
    CONSTRAINT uq_employees_email UNIQUE (email),
    CONSTRAINT uq_employees_employee_code UNIQUE (employee_code)
);
CREATE INDEX ix_employees_department ON employees (department);
CREATE INDEX ix_employees_project_id ON employees (project_id);
CREATE INDEX ix_employees_status ON employees (status);

CREATE TABLE seat_allocations (
    id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    seat_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    allocation_status VARCHAR(20) NOT NULL,
    allocation_date DATETIME NOT NULL,
    released_date DATETIME,
    CONSTRAINT pk_seat_allocations PRIMARY KEY (id),
    CONSTRAINT ck_seat_allocations_status_valid
        CHECK (allocation_status IN ('ACTIVE', 'RELEASED')),
    CONSTRAINT fk_seat_allocations_employee_id_employees
        FOREIGN KEY(employee_id) REFERENCES employees (id),
    CONSTRAINT fk_seat_allocations_project_id_projects
        FOREIGN KEY(project_id) REFERENCES projects (id),
    CONSTRAINT fk_seat_allocations_seat_id_seats FOREIGN KEY(seat_id) REFERENCES seats (id)
);
CREATE INDEX ix_seat_allocations_employee_id ON seat_allocations (employee_id);
CREATE INDEX ix_seat_allocations_project_id ON seat_allocations (project_id);
CREATE INDEX ix_seat_allocations_seat_id ON seat_allocations (seat_id);
CREATE UNIQUE INDEX uq_seat_allocations_one_active_per_employee
    ON seat_allocations (employee_id) WHERE allocation_status = 'ACTIVE';
CREATE UNIQUE INDEX uq_seat_allocations_one_active_per_seat
    ON seat_allocations (seat_id) WHERE allocation_status = 'ACTIVE';
```

---

## The 8 business rules — schema vs. service enforcement

| # | Rule | Schema (DB) | Service (Phase 6) |
|---|------|-------------|-------------------|
| 1 | One employee → at most one ACTIVE allocation | ✅ partial unique index `uq_…_one_active_per_employee` | Pre-checks for a friendly 409/400 before hitting the index |
| 2 | One seat → at most one ACTIVE employee | ✅ partial unique index `uq_…_one_active_per_seat` | Same pre-check; DB is the last line of defense |
| 3 | Releasing a seat sets it back to AVAILABLE | — (cross-table state transition) | ✅ release service: mark allocation RELEASED + `released_date`, set seat AVAILABLE, in one transaction |
| 4 | RESERVED / MAINTENANCE seats cannot be allocated | CHECK guarantees only valid statuses exist | ✅ allocation service rejects seats whose status ≠ AVAILABLE |
| 5 | New joiners prioritized near their project team (same floor/zone, alternate-zone fallback) | Supported by `ix_seats_floor_zone` + `ix_seats_status` | ✅ suggestion ranking is pure business logic |
| 6 | Duplicate employee email rejected | ✅ `uq_employees_email` | Pre-check to return a clean validation error |
| 7 | Duplicate seat_number within the same floor/zone rejected | ✅ `uq_seats_floor_zone_bay_seat_number` (bay-precise, which implies floor/zone/seat_number dedupe for a given bay) | Pre-check on seat creation |
| 8 | Dashboard metrics recompute on every allocation/release | Indexes on `seats.status`, `employees.status`, FK columns keep the aggregates cheap | ✅ metrics are computed live per request — no stale cache to invalidate |

Rules that are *state transitions* or *rankings* (3, 4, 5, 8) live in the Phase 6 allocation
service; rules that are *uniqueness invariants* (1, 2, 6, 7) are enforced by the database itself,
so no code path — including the seed script — can violate them.

---

## Alembic

- `backend/alembic/env.py` reads `DATABASE_URL` from app settings (pydantic-settings), so
  migrations always target the same database as the app.
- Initial revision `7ee664189008` creates all four tables; verified both directions:
  `alembic upgrade head` → schema above; `alembic downgrade base` → clean; `alembic check`
  reports no model/migration drift.
- The Pydantic API schemas ([backend/app/schemas/](backend/app/schemas/)) mirror
  [frontend/src/types/index.ts](frontend/src/types/index.ts) field-for-field (snake_case names,
  identical status literals) so the Phase 7 mock→API swap is mechanical.
