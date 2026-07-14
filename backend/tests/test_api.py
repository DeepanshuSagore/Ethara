"""Phase 6 endpoint-contract tests — every spec path + every allocation rule.

Each business rule from PROJECT_PLAN §3 gets a happy path AND its rejection:
rule 1 (one ACTIVE seat per employee), rule 2 (one ACTIVE employee per seat),
rule 3 (release → AVAILABLE, also on deactivate), rule 4 (RESERVED/MAINTENANCE
not allocatable), rule 5 (proximity suggestions), rule 6 (duplicate email),
rule 7 (duplicate seat position), rule 8 (dashboard recomputes live).
"""
from datetime import datetime, timezone

import pytest

from app.models import Employee, Project, Seat, SeatAllocation

NOW = datetime(2026, 7, 13, tzinfo=timezone.utc)

SPEC_PATHS = {
    ("post", "/employees"),
    ("get", "/employees"),
    ("get", "/employees/{id}"),
    ("put", "/employees/{id}"),
    ("delete", "/employees/{id}"),
    ("post", "/projects"),
    ("get", "/projects"),
    ("get", "/projects/{id}/employees"),
    ("post", "/seats"),
    ("get", "/seats"),
    ("get", "/seats/available"),
    ("post", "/seats/allocate"),
    ("post", "/seats/release"),
    ("get", "/dashboard/summary"),
    ("get", "/dashboard/project-utilization"),
    ("get", "/dashboard/floor-utilization"),
    ("post", "/ai/query"),
}


def make_employee(project_id: int, n: int, **overrides) -> Employee:
    defaults = dict(
        employee_code=f"ETH-{n:04d}",
        name=f"Person {n}",
        email=f"person{n}@ethara.ai",
        department="Engineering",
        role="Software Engineer",
        joining_date=NOW,
        status="ACTIVE",
        project_id=project_id,
    )
    return Employee(**{**defaults, **overrides})


def make_seat(floor: int, zone: str, bay: int, n: int, status: str = "AVAILABLE") -> Seat:
    return Seat(
        floor=floor, zone=zone, bay=bay, seat_number=n,
        seat_code=f"{zone}{bay}-{n}", status=status,
    )


@pytest.fixture()
def dataset(db):
    """Two projects, three employees (one seated), seven seats across 2 floors."""
    indigo = Project(name="Indigo", description="Core platform", manager_name="Priya Patel")
    serfy = Project(name="Serfy", description="Support tools", manager_name="Vikram Rao")
    db.add_all([indigo, serfy])
    db.flush()

    seats = {
        "a1": make_seat(1, "A", 1, 1),
        "a2": make_seat(1, "A", 1, 2),
        "b1": make_seat(1, "B", 1, 1),
        "f2": make_seat(2, "A", 1, 1),
        "reserved": make_seat(1, "A", 1, 3, status="RESERVED"),
        "maintenance": make_seat(1, "A", 1, 4, status="MAINTENANCE"),
        "occupied": make_seat(1, "A", 1, 5, status="OCCUPIED"),
    }
    amit = make_employee(indigo.id, 1, name="Amit Sharma", email="amit@ethara.ai")
    priya = make_employee(indigo.id, 2, name="Priya Verma", status="PENDING_ALLOCATION")
    rohan = make_employee(serfy.id, 3, name="Rohan Iyer")
    db.add_all([*seats.values(), amit, priya, rohan])
    db.flush()
    allocation = SeatAllocation(
        employee_id=amit.id, seat_id=seats["occupied"].id, project_id=indigo.id,
        allocation_date=NOW,
    )
    db.add(allocation)
    db.commit()
    return {
        "indigo": indigo, "serfy": serfy, "seats": seats,
        "amit": amit, "priya": priya, "rohan": rohan, "allocation": allocation,
    }


# --- OpenAPI surface ---------------------------------------------------------

def test_openapi_lists_every_spec_path(client):
    spec = client.get("/openapi.json").json()
    for method, path in SPEC_PATHS:
        assert method in spec["paths"].get(path, {}), f"{method.upper()} {path} missing"


# --- Employees ---------------------------------------------------------------

def test_create_employee_201_defaults_to_pending(client, dataset):
    response = client.post("/employees", json={
        "employee_code": "ETH-9001", "name": "Neha Gupta", "email": "Neha.Gupta@ethara.ai",
        "department": "Design", "role": "Product Designer",
        "joining_date": "2026-07-10T00:00:00Z", "project_id": dataset["indigo"].id,
    })
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "PENDING_ALLOCATION"  # new joiners enter the queue
    assert body["email"] == "neha.gupta@ethara.ai"  # normalized
    assert body["id"] > 0 and body["created_at"]


def test_create_employee_duplicate_email_409(client, dataset):
    """Rule 6 — duplicate email rejected, case-insensitively."""
    response = client.post("/employees", json={
        "employee_code": "ETH-9002", "name": "Dup", "email": "AMIT@ethara.ai",
        "department": "Engineering", "role": "Tech Lead",
        "joining_date": "2026-07-10T00:00:00Z", "project_id": dataset["indigo"].id,
    })
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_create_employee_unknown_project_404(client, dataset):
    response = client.post("/employees", json={
        "employee_code": "ETH-9003", "name": "X", "email": "x@ethara.ai",
        "department": "Engineering", "role": "Software Engineer",
        "joining_date": "2026-07-10T00:00:00Z", "project_id": 999,
    })
    assert response.status_code == 404


def test_create_employee_invalid_status_422(client, dataset):
    response = client.post("/employees", json={
        "employee_code": "ETH-9004", "name": "X", "email": "x2@ethara.ai",
        "department": "Engineering", "role": "Software Engineer",
        "joining_date": "2026-07-10T00:00:00Z", "project_id": dataset["indigo"].id,
        "status": "NOT_A_STATUS",
    })
    assert response.status_code == 422


def test_list_employees_search_and_filters(client, dataset):
    assert len(client.get("/employees").json()) == 3
    by_search = client.get("/employees", params={"search": "amit"}).json()
    assert [e["name"] for e in by_search] == ["Amit Sharma"]
    by_project = client.get("/employees", params={"project_id": dataset["serfy"].id}).json()
    assert [e["name"] for e in by_project] == ["Rohan Iyer"]
    by_status = client.get("/employees", params={"status": "PENDING_ALLOCATION"}).json()
    assert [e["name"] for e in by_status] == ["Priya Verma"]
    by_role = client.get(
        "/employees", params={"department": "Engineering", "role": "Software Engineer"}
    ).json()
    assert len(by_role) == 3
    assert client.get("/employees", params={"status": "BOGUS"}).status_code == 422


def test_get_employee_and_404(client, dataset):
    assert client.get(f"/employees/{dataset['amit'].id}").json()["email"] == "amit@ethara.ai"
    assert client.get("/employees/99999").status_code == 404


def test_update_employee(client, dataset):
    response = client.put(f"/employees/{dataset['priya'].id}", json={"department": "Quality"})
    assert response.status_code == 200
    assert response.json()["department"] == "Quality"
    assert client.put("/employees/99999", json={"name": "X"}).status_code == 404
    dup = client.put(f"/employees/{dataset['priya'].id}", json={"email": "amit@ethara.ai"})
    assert dup.status_code == 409


def test_update_to_exited_releases_seat(client, db, dataset):
    """Rule 3 also applies when PUT sets status=EXITED."""
    seat_id = dataset["seats"]["occupied"].id
    response = client.put(f"/employees/{dataset['amit'].id}", json={"status": "EXITED"})
    assert response.status_code == 200
    assert db.get(Seat, seat_id).status == "AVAILABLE"


def test_delete_employee_soft_deactivate(client, db, dataset):
    """DELETE = deactivate: EXITED + seat released (rule 3), history kept."""
    amit, seat = dataset["amit"], dataset["seats"]["occupied"]
    response = client.delete(f"/employees/{amit.id}")
    assert response.status_code == 200
    assert response.json()["status"] == "EXITED"
    assert db.get(Seat, seat.id).status == "AVAILABLE"
    allocation = db.get(SeatAllocation, dataset["allocation"].id)
    assert allocation.allocation_status == "RELEASED"
    assert allocation.released_date is not None
    # Soft: the employee row and allocation history both survive.
    assert db.get(Employee, amit.id) is not None
    assert client.get(f"/employees/{amit.id}").status_code == 200
    assert client.delete("/employees/99999").status_code == 404


# --- Projects ----------------------------------------------------------------

def test_create_project_and_duplicate_name_409(client):
    response = client.post("/projects", json={"name": "Kaary", "manager_name": "Asha Nair"})
    assert response.status_code == 201
    assert response.json()["status"] == "ACTIVE"
    dup = client.post("/projects", json={"name": "kaary", "manager_name": "Someone"})
    assert dup.status_code == 409


def test_list_projects(client, dataset):
    names = [p["name"] for p in client.get("/projects").json()]
    assert names == ["Indigo", "Serfy"]


def test_project_employees_and_404(client, dataset):
    members = client.get(f"/projects/{dataset['indigo'].id}/employees").json()
    assert sorted(m["name"] for m in members) == ["Amit Sharma", "Priya Verma"]
    assert client.get("/projects/99999/employees").status_code == 404


# --- Seats -------------------------------------------------------------------

def test_create_seat_derives_seat_code(client):
    response = client.post("/seats", json={"floor": 3, "zone": "A", "bay": 9, "seat_number": 61})
    assert response.status_code == 201
    body = response.json()
    assert body["seat_code"] == "A9-61" and body["status"] == "AVAILABLE"


def test_create_seat_duplicate_position_409(client, dataset):
    """Rule 7 — duplicate seat position within the same floor/zone rejected."""
    response = client.post(
        "/seats", json={"floor": 1, "zone": "A", "bay": 1, "seat_number": 1}
    )
    assert response.status_code == 409
    # Same position on another floor is fine.
    ok = client.post("/seats", json={"floor": 5, "zone": "A", "bay": 1, "seat_number": 1})
    assert ok.status_code == 201


def test_list_seats_filters(client, dataset):
    assert len(client.get("/seats").json()) == 7
    floor1_a = client.get("/seats", params={"floor": 1, "zone": "A"}).json()
    assert len(floor1_a) == 5
    reserved = client.get("/seats", params={"status": "RESERVED"}).json()
    assert [s["seat_code"] for s in reserved] == ["A1-3"]
    assert client.get("/seats", params={"status": "BOGUS"}).status_code == 422


def test_seats_available(client, dataset):
    codes = {s["seat_code"] for s in client.get("/seats/available").json()}
    assert codes == {"A1-1", "A1-2", "B1-1"}  # A1-1 repeats on floor 2
    floor2 = client.get("/seats/available", params={"floor": 2}).json()
    assert len(floor2) == 1 and floor2[0]["floor"] == 2


def test_allocate_happy_path(client, db, dataset):
    """Pending joiner gets a seat: allocation ACTIVE, seat OCCUPIED, employee ACTIVE."""
    priya, seat = dataset["priya"], dataset["seats"]["a1"]
    response = client.post(
        "/seats/allocate", json={"employee_id": priya.id, "seat_id": seat.id}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["allocation_status"] == "ACTIVE" and body["released_date"] is None
    assert body["employee_id"] == priya.id and body["seat_id"] == seat.id
    assert db.get(Seat, seat.id).status == "OCCUPIED"
    assert db.get(Employee, priya.id).status == "ACTIVE"


def test_allocate_second_seat_rejected(client, dataset):
    """Rule 1 — one employee → at most one ACTIVE allocation."""
    response = client.post(
        "/seats/allocate",
        json={"employee_id": dataset["amit"].id, "seat_id": dataset["seats"]["a1"].id},
    )
    assert response.status_code == 409
    assert "already has an active seat" in response.json()["detail"]


def test_allocate_occupied_seat_rejected(client, dataset):
    """Rule 2 — one seat → at most one ACTIVE employee."""
    response = client.post(
        "/seats/allocate",
        json={"employee_id": dataset["rohan"].id, "seat_id": dataset["seats"]["occupied"].id},
    )
    assert response.status_code == 409
    assert "occupied" in response.json()["detail"]


@pytest.mark.parametrize("seat_key", ["reserved", "maintenance"])
def test_allocate_reserved_or_maintenance_rejected(client, dataset, seat_key):
    """Rule 4 — RESERVED / MAINTENANCE seats cannot be allocated."""
    response = client.post(
        "/seats/allocate",
        json={"employee_id": dataset["rohan"].id, "seat_id": dataset["seats"][seat_key].id},
    )
    assert response.status_code == 409
    assert seat_key in response.json()["detail"]


def test_allocate_unknown_ids_404(client, dataset):
    assert client.post(
        "/seats/allocate", json={"employee_id": 99999, "seat_id": dataset["seats"]["a1"].id}
    ).status_code == 404
    assert client.post(
        "/seats/allocate", json={"employee_id": dataset["rohan"].id, "seat_id": 99999}
    ).status_code == 404


def test_allocate_exited_employee_rejected(client, db, dataset):
    client.delete(f"/employees/{dataset['rohan'].id}")
    response = client.post(
        "/seats/allocate",
        json={"employee_id": dataset["rohan"].id, "seat_id": dataset["seats"]["a1"].id},
    )
    assert response.status_code == 409


def test_release_happy_path_then_reallocate(client, db, dataset):
    """Rule 3 — release marks RELEASED + released_date and frees the seat."""
    seat = dataset["seats"]["occupied"]
    response = client.post("/seats/release", json={"seat_id": seat.id})
    assert response.status_code == 200
    body = response.json()
    assert body["allocation_status"] == "RELEASED" and body["released_date"] is not None
    assert db.get(Seat, seat.id).status == "AVAILABLE"
    # History row doesn't block a new allocation on the same seat.
    again = client.post(
        "/seats/allocate", json={"employee_id": dataset["rohan"].id, "seat_id": seat.id}
    )
    assert again.status_code == 201


def test_release_without_active_allocation_409(client, dataset):
    response = client.post("/seats/release", json={"seat_id": dataset["seats"]["a1"].id})
    assert response.status_code == 409
    assert "no active allocation" in response.json()["detail"]
    assert client.post("/seats/release", json={"seat_id": 99999}).status_code == 404


def test_suggestions_rank_team_zone_then_floor_then_alternate(client, dataset):
    """Rule 5 — Priya's team (Amit) sits in 1A → 1A seats first, then floor 1."""
    response = client.get("/seats/suggestions", params={"employee_id": dataset["priya"].id})
    assert response.status_code == 200
    suggestions = response.json()
    assert [s["reason"] for s in suggestions] == ["team-zone", "team-zone", "same-floor"]
    assert {s["seat"]["seat_code"] for s in suggestions[:2]} == {"A1-1", "A1-2"}
    assert suggestions[2]["seat"]["seat_code"] == "B1-1"
    # limit=4 exposes the alternate-zone fallback (floor 2).
    four = client.get(
        "/seats/suggestions", params={"employee_id": dataset["priya"].id, "limit": 4}
    ).json()
    assert four[3]["reason"] == "alternate-zone" and four[3]["seat"]["floor"] == 2
    assert client.get("/seats/suggestions", params={"employee_id": 99999}).status_code == 404


def test_suggestions_fall_back_to_home_zone_without_seated_teammates(client, dataset):
    """Rohan (Serfy, project #2) has no seated teammates → home zone 1B first."""
    suggestions = client.get(
        "/seats/suggestions", params={"employee_id": dataset["rohan"].id}
    ).json()
    assert suggestions[0]["reason"] == "team-zone"
    assert suggestions[0]["seat"]["seat_code"] == "B1-1"


# --- Dashboard (rule 8: live recompute) ---------------------------------------

def test_dashboard_summary(client, dataset):
    summary = client.get("/dashboard/summary").json()
    assert summary == {
        "total_employees": 3, "total_seats": 7, "occupied": 1, "available": 4,
        "reserved": 1, "maintenance": 1, "pending_joiners": 1, "utilization_pct": 14,
    }


def test_dashboard_project_utilization(client, dataset):
    rows = {r["project"]["name"]: r for r in client.get("/dashboard/project-utilization").json()}
    assert rows["Indigo"]["headcount"] == 2 and rows["Indigo"]["seated"] == 1
    assert rows["Indigo"]["home_zone"] == "1A"
    assert rows["Serfy"]["headcount"] == 1 and rows["Serfy"]["seated"] == 0


def test_dashboard_floor_utilization(client, dataset):
    floors = {r["floor"]: r for r in client.get("/dashboard/floor-utilization").json()}
    assert floors[1]["total"] == 6 and floors[1]["occupied"] == 1
    assert floors[1]["occupancy_pct"] == 17
    assert floors[2] == {
        "floor": 2, "total": 1, "occupied": 0, "available": 1,
        "reserved": 0, "maintenance": 0, "occupancy_pct": 0,
    }


def test_dashboard_recomputes_after_allocate_and_release(client, dataset):
    """Rule 8 — metrics change immediately with every allocation/release."""
    before = client.get("/dashboard/summary").json()
    client.post(
        "/seats/allocate",
        json={"employee_id": dataset["priya"].id, "seat_id": dataset["seats"]["a1"].id},
    )
    after_allocate = client.get("/dashboard/summary").json()
    assert after_allocate["occupied"] == before["occupied"] + 1
    assert after_allocate["available"] == before["available"] - 1
    assert after_allocate["pending_joiners"] == before["pending_joiners"] - 1

    client.post("/seats/release", json={"seat_id": dataset["seats"]["a1"].id})
    after_release = client.get("/dashboard/summary").json()
    assert after_release["occupied"] == before["occupied"]
    assert after_release["available"] == before["available"]


# --- AI assistant --------------------------------------------------------------

def test_ai_query_seat_lookup_by_email(client, dataset):
    """The brief's exact example query, answered from the DB."""
    response = client.post(
        "/ai/query", json={"query": "Where is my seat? My email is amit@ethara.ai"}
    )
    assert response.status_code == 200
    answer = response.json()["answer"]
    assert "Amit Sharma" in answer and "A1-5" in answer and "Indigo" in answer


def test_ai_query_pending_joiner_by_name(client, dataset):
    answer = client.post(
        "/ai/query", json={"query": "Where does Priya Verma sit?"}
    ).json()["answer"]
    assert "waiting for a seat" in answer


def test_ai_query_floor_availability(client, dataset):
    answer = client.post(
        "/ai/query", json={"query": "available seats on floor 1"}
    ).json()["answer"]
    assert "Floor 1 has 3 available seats" in answer and "A1-1" in answer


def test_ai_query_project_occupancy(client, dataset):
    answer = client.post(
        "/ai/query", json={"query": "seats occupied for Serfy"}
    ).json()["answer"]
    assert "Serfy" in answer and "1 member" in answer and "0 seats" in answer


def test_ai_query_utilization_and_fallback(client, dataset):
    answer = client.post("/ai/query", json={"query": "what is the utilization?"}).json()["answer"]
    assert "14%" in answer and "7" in answer
    fallback = client.post("/ai/query", json={"query": "sing me a song"}).json()["answer"]
    assert "couldn't match" in fallback
    assert client.post("/ai/query", json={"query": ""}).status_code == 422
