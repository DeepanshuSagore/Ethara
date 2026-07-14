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

# --- Employee composition (~5,000 per the brief; deliberately non-round) -----
# Uniform round-robin produced eleven near-identical 454-person teams and a
# flat 88% on every floor — instantly fake. These figures are messy on
# purpose while still clearing every §6 minimum.
TOTAL_EMPLOYEES = 4_987
PENDING_COUNT = 57   # ≥50 PENDING_ALLOCATION, no seat
EXITED_COUNT = 23    # a few EXITED, no seat
ON_LEAVE_COUNT = 31  # a few ON_LEAVE, keep their seats
# Employees holding an ACTIVE allocation (ACTIVE + ON_LEAVE statuses):
SEATED_COUNT = TOTAL_EMPLOYEES - PENDING_COUNT - EXITED_COUNT  # 4,907

# Team sizes follow a rough power curve (largest ≈ 5× the smallest) instead of
# an even split. Weights sum to 1.0; largest-remainder turns them into counts.
PROJECT_SIZE_WEIGHTS = (
    0.187,  # Indigo — core platform, biggest org
    0.153,  # Indreed
    0.128,  # Mydreed
    0.104,  # Preed
    0.092,  # Serfy
    0.081,  # Oreed
    0.068,  # bedegreed
    0.057,  # Opreed
    0.049,  # Serry
    0.043,  # Kaary
    0.038,  # Mered — small data-platform crew
)


def project_member_counts(total: int = TOTAL_EMPLOYEES) -> list[int]:
    """Largest-remainder split of `total` across PROJECT_SIZE_WEIGHTS."""
    raw = [weight * total for weight in PROJECT_SIZE_WEIGHTS]
    counts = [int(x) for x in raw]
    leftover = total - sum(counts)
    by_fraction = sorted(range(len(raw)), key=lambda i: raw[i] - counts[i], reverse=True)
    for i in by_fraction[:leftover]:
        counts[i] += 1
    return counts


# --- Seat status mix per floor (uneven on purpose) ----------------------------
# Floors read 79–95% occupied — busy lower floors, an emptier fourth — rather
# than a uniform scatter that lands every floor on the same percentage.
FLOOR_STATUS_MIX: dict[int, dict[str, int]] = {
    1: {"AVAILABLE": 39, "RESERVED": 31, "MAINTENANCE": 9},
    2: {"AVAILABLE": 26, "RESERVED": 12, "MAINTENANCE": 14},
    3: {"AVAILABLE": 141, "RESERVED": 24, "MAINTENANCE": 4},
    4: {"AVAILABLE": 187, "RESERVED": 38, "MAINTENANCE": 7},
    5: {"AVAILABLE": 141, "RESERVED": 13, "MAINTENANCE": 7},
}

AVAILABLE_COUNT = sum(mix["AVAILABLE"] for mix in FLOOR_STATUS_MIX.values())      # 534, ≥500
RESERVED_COUNT = sum(mix["RESERVED"] for mix in FLOOR_STATUS_MIX.values())        # 118, ≥100
MAINTENANCE_COUNT = sum(mix["MAINTENANCE"] for mix in FLOOR_STATUS_MIX.values())  # 41
OCCUPIED_COUNT = TOTAL_SEATS - AVAILABLE_COUNT - RESERVED_COUNT - MAINTENANCE_COUNT  # 4,907

# The seats marked OCCUPIED must be exactly the seats an ACTIVE allocation
# will claim — the whole seed pipeline hangs off this equality.
assert OCCUPIED_COUNT == SEATED_COUNT, (OCCUPIED_COUNT, SEATED_COUNT)
assert sum(project_member_counts()) == TOTAL_EMPLOYEES

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
