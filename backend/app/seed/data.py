"""Seed vocabularies and exact targets (PROJECT_PLAN §5b).

Mirrors frontend/src/lib/mock/data.ts so the seeded database matches the
conventions the UI was built against: same 11 projects, same department→roles
mapping, same seat_code format `{zone}{bay}-{seat_number}` with seat_number
running 1..N across bays within a floor+zone, same per-project home-zone
clustering, and Amit Sharma / amit@ethara.ai as employee #1 (the brief's
AI-assistant example query).
"""
from datetime import datetime, timezone

SEED = 20260713  # same fixed seed as the frontend mock generator

# Fixed reference date so reruns produce byte-identical data (no now() drift).
BASE_DATE = datetime(2026, 7, 13, tzinfo=timezone.utc)

# --- Building layout: 5 floors × 2 zones × 80 bays × 7 seats = 5,600 seats ---
FLOORS = (1, 2, 3, 4, 5)
ZONES = ("A", "B")
BAYS_PER_ZONE = 80
SEATS_PER_BAY = 7
TOTAL_SEATS = len(FLOORS) * len(ZONES) * BAYS_PER_ZONE * SEATS_PER_BAY  # 5,600

# --- Employee composition (5,000 total) --------------------------------------
TOTAL_EMPLOYEES = 5_000
PENDING_COUNT = 50   # ≥50 PENDING_ALLOCATION, no seat
EXITED_COUNT = 10    # a few EXITED, no seat
ON_LEAVE_COUNT = 25  # a few ON_LEAVE, keep their seats
# Employees holding an ACTIVE allocation (ACTIVE + ON_LEAVE statuses):
SEATED_COUNT = TOTAL_EMPLOYEES - PENDING_COUNT - EXITED_COUNT  # 4,940

# --- Seat status targets (must sum with OCCUPIED to TOTAL_SEATS) --------------
RESERVED_COUNT = 100     # ≥100
MAINTENANCE_COUNT = 50   # ~50
OCCUPIED_COUNT = SEATED_COUNT  # exactly the seats with an ACTIVE allocation
AVAILABLE_COUNT = TOTAL_SEATS - OCCUPIED_COUNT - RESERVED_COUNT - MAINTENANCE_COUNT  # 510, ≥500

PROJECT_SEEDS: list[dict[str, str]] = [
    {"name": "Indigo", "description": "Core booking & reservations platform"},
    {"name": "Indreed", "description": "Talent acquisition and referrals suite"},
    {"name": "Mydreed", "description": "Employee self-service portal"},
    {"name": "Preed", "description": "Payments and reconciliation engine"},
    {"name": "Serfy", "description": "Customer support & ticketing tools"},
    {"name": "Oreed", "description": "Order orchestration microservices"},
    {"name": "bedegreed", "description": "Learning & certification platform"},
    {"name": "Opreed", "description": "Ops analytics and reporting"},
    {"name": "Serry", "description": "Logistics & fleet tracking"},
    {"name": "Kaary", "description": "Mobile companion apps"},
    {"name": "Mered", "description": "Data platform & warehouse services"},
]

DEPARTMENT_ROLES: dict[str, list[str]] = {
    "Engineering": [
        "Software Engineer",
        "Senior Software Engineer",
        "Staff Engineer",
        "Tech Lead",
        "Engineering Manager",
    ],
    "Product": ["Product Manager", "Senior Product Manager", "Business Analyst"],
    "Design": ["Product Designer", "UX Researcher", "Design Lead"],
    "Quality": ["QA Engineer", "Automation Engineer", "QA Lead"],
    "Data & AI": ["Data Analyst", "Data Scientist", "ML Engineer"],
    "DevOps": ["DevOps Engineer", "Site Reliability Engineer", "Platform Engineer"],
    "Operations": ["Operations Manager", "Program Manager", "Facilities Analyst"],
    "People": ["HR Partner", "Talent Acquisition Lead", "People Ops Analyst"],
}

DEPARTMENTS = list(DEPARTMENT_ROLES)

# All 10 (floor, zone) combinations in floor order, e.g. "1A", "1B", "2A", …
ZONE_KEYS = [f"{floor}{zone}" for floor in FLOORS for zone in ZONES]


def zone_key(floor: int, zone: str) -> str:
    return f"{floor}{zone}"


def project_home_zone_key(project_id: int) -> str:
    """Home (floor, zone) each project's team clusters around — mirrors the mock."""
    return ZONE_KEYS[(project_id - 1) % len(ZONE_KEYS)]
