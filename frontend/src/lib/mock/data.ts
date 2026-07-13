import type {
  Employee,
  EmployeeStatus,
  Project,
  Seat,
  SeatAllocation,
  SeatStatus,
} from "@/types";
import { createRng } from "./random";

/**
 * Deterministic mock dataset (Phase 2). Mirrors the DB schema in
 * PROJECT_PLAN.md §3 so Phase 7 swaps this for API calls without reshaping.
 *
 * The browsable dataset is intentionally small (~250 employees / 280 seats)
 * for UI realism; dashboard aggregates are multiplied by DISPLAY_SCALE to
 * present the brief's production volumes (~5,000 employees / ~5,600 seats).
 */

export const FLOORS = [1, 2, 3, 4, 5] as const;
export const ZONES = ["A", "B"] as const;
export const BAYS_PER_ZONE = 4;
export const SEATS_PER_BAY = 7;
export const DISPLAY_SCALE = 20;

/** Fixed reference date so generated dates never drift between renders. */
const BASE_TS = Date.UTC(2026, 6, 13);

const DAY = 86_400_000;

function isoDaysFromBase(days: number) {
  return new Date(BASE_TS + days * DAY).toISOString();
}

export function zoneKey(floor: number, zone: string) {
  return `${floor}${zone}`;
}

/** All 10 (floor, zone) combinations, in floor order. */
export const ZONE_KEYS = FLOORS.flatMap((floor) =>
  ZONES.map((zone) => zoneKey(floor, zone))
);

const PROJECT_SEEDS: Array<{ name: string; description: string }> = [
  { name: "Indigo", description: "Core booking & reservations platform" },
  { name: "Indreed", description: "Talent acquisition and referrals suite" },
  { name: "Mydreed", description: "Employee self-service portal" },
  { name: "Preed", description: "Payments and reconciliation engine" },
  { name: "Serfy", description: "Customer support & ticketing tools" },
  { name: "Oreed", description: "Order orchestration microservices" },
  { name: "bedegreed", description: "Learning & certification platform" },
  { name: "Opreed", description: "Ops analytics and reporting" },
  { name: "Serry", description: "Logistics & fleet tracking" },
  { name: "Kaary", description: "Mobile companion apps" },
  { name: "Mered", description: "Data platform & warehouse services" },
];

const FIRST_NAMES = [
  "Amit", "Priya", "Rahul", "Sneha", "Arjun", "Kavya", "Vikram", "Ananya",
  "Rohan", "Ishita", "Karan", "Meera", "Aditya", "Pooja", "Nikhil", "Divya",
  "Siddharth", "Neha", "Varun", "Riya", "Manish", "Shreya", "Deepak", "Tanvi",
  "Harsh", "Aisha", "Gaurav", "Nandini", "Sameer", "Lakshmi", "Farhan", "Zara",
  "Kabir", "Sana", "Dev", "Mira", "Yash", "Anjali", "Omar", "Leah",
  "Ethan", "Sofia", "Daniel", "Maya", "Lucas", "Elena", "Noah", "Grace",
];

const LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Reddy", "Iyer", "Nair", "Gupta", "Mehta",
  "Singh", "Kumar", "Joshi", "Desai", "Kulkarni", "Chopra", "Malhotra", "Bose",
  "Banerjee", "Rao", "Menon", "Pillai", "Kapoor", "Bhat", "Sethi", "Ahuja",
  "Khan", "Ali", "Fernandes", "D'Souza", "Thomas", "George", "Mathew", "Das",
  "Roy", "Mukherjee", "Saxena", "Tiwari",
];

const DEPARTMENT_ROLES: Record<string, string[]> = {
  Engineering: [
    "Software Engineer",
    "Senior Software Engineer",
    "Staff Engineer",
    "Tech Lead",
    "Engineering Manager",
  ],
  Product: ["Product Manager", "Senior Product Manager", "Business Analyst"],
  Design: ["Product Designer", "UX Researcher", "Design Lead"],
  Quality: ["QA Engineer", "Automation Engineer", "QA Lead"],
  "Data & AI": ["Data Analyst", "Data Scientist", "ML Engineer"],
  DevOps: ["DevOps Engineer", "Site Reliability Engineer", "Platform Engineer"],
  Operations: ["Operations Manager", "Program Manager", "Facilities Analyst"],
  People: ["HR Partner", "Talent Acquisition Lead", "People Ops Analyst"],
};

const DEPARTMENTS = Object.keys(DEPARTMENT_ROLES);

// Dataset composition — chosen so ×DISPLAY_SCALE meets the brief's seed
// minimums (≥500 available, ≥100 reserved, ≥50 pending allocation).
const TOTAL_EMPLOYEES = 250;
const PENDING_COUNT = 10;
const EXITED_COUNT = 4;
const ON_LEAVE_COUNT = 6;
const SEATED_COUNT = TOTAL_EMPLOYEES - PENDING_COUNT - EXITED_COUNT; // 236
const AVAILABLE_COUNT = 26;
const RESERVED_COUNT = 12;
const MAINTENANCE_COUNT = 6;

export interface MockDataset {
  employees: Employee[];
  projects: Project[];
  seats: Seat[];
  allocations: SeatAllocation[];
}

/** Home (floor, zone) each project's team clusters around. */
export function projectHomeZoneKey(projectId: number) {
  return ZONE_KEYS[(projectId - 1) % ZONE_KEYS.length];
}

export function generateMockDataset(): MockDataset {
  const rng = createRng(20260713);

  // --- Projects -------------------------------------------------------------
  const projects: Project[] = PROJECT_SEEDS.map((seed, i) => ({
    id: i + 1,
    name: seed.name,
    description: seed.description,
    manager_name: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
    status: "ACTIVE",
    created_at: isoDaysFromBase(-rng.int(400, 900)),
  }));

  // --- Seats ----------------------------------------------------------------
  const seats: Seat[] = [];
  let seatId = 1;
  for (const floor of FLOORS) {
    for (const zone of ZONES) {
      for (let n = 1; n <= BAYS_PER_ZONE * SEATS_PER_BAY; n++) {
        const bay = Math.ceil(n / SEATS_PER_BAY);
        seats.push({
          id: seatId++,
          floor,
          zone,
          bay,
          seat_number: n,
          seat_code: `${zone}${bay}-${n}`,
          status: "OCCUPIED", // provisional; scattered statuses assigned below
          created_at: isoDaysFromBase(-1000),
        });
      }
    }
  }

  // Scatter non-occupied statuses across the building.
  const scattered = rng.shuffle(seats.map((s) => s.id));
  const statusFor = new Map<number, SeatStatus>();
  scattered.slice(0, AVAILABLE_COUNT).forEach((id) => statusFor.set(id, "AVAILABLE"));
  scattered
    .slice(AVAILABLE_COUNT, AVAILABLE_COUNT + RESERVED_COUNT)
    .forEach((id) => statusFor.set(id, "RESERVED"));
  scattered
    .slice(AVAILABLE_COUNT + RESERVED_COUNT, AVAILABLE_COUNT + RESERVED_COUNT + MAINTENANCE_COUNT)
    .forEach((id) => statusFor.set(id, "MAINTENANCE"));
  for (const seat of seats) {
    const status = statusFor.get(seat.id);
    if (status) seat.status = status;
  }

  // --- Employees --------------------------------------------------------------
  const usedEmails = new Set<string>();
  const employees: Employee[] = [];

  const makeEmail = (name: string) => {
    const base = name
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .trim()
      .split(/\s+/)
      .join(".");
    let email = `${base}@ethara.ai`;
    let suffix = 2;
    while (usedEmails.has(email)) {
      email = `${base}${suffix++}@ethara.ai`;
    }
    usedEmails.add(email);
    return email;
  };

  for (let i = 0; i < TOTAL_EMPLOYEES; i++) {
    const id = i + 1;
    let status: EmployeeStatus;
    if (i >= TOTAL_EMPLOYEES - PENDING_COUNT) status = "PENDING_ALLOCATION";
    else if (i >= SEATED_COUNT) status = "EXITED";
    else status = "ACTIVE"; // a few flipped to ON_LEAVE below

    // Pending joiners joined (or join) around the base date; others earlier.
    const joinedDaysAgo =
      status === "PENDING_ALLOCATION" ? rng.int(-10, 5) : rng.int(45, 1600);
    const joiningDate = isoDaysFromBase(-joinedDaysAgo);

    const department = rng.pick(DEPARTMENTS);
    const name =
      id === 1 ? "Amit Sharma" : `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;

    employees.push({
      id,
      employee_code: `ETH-${String(id).padStart(4, "0")}`,
      name,
      // Employee #1 matches the brief's AI-assistant example query.
      email: id === 1 ? makeEmail("amit") : makeEmail(name),
      department,
      role: rng.pick(DEPARTMENT_ROLES[department]),
      joining_date: joiningDate,
      status,
      project_id: (i % projects.length) + 1,
      created_at: joiningDate,
      updated_at: isoDaysFromBase(-rng.int(0, 30)),
    });
  }

  // Flip a few seated employees to ON_LEAVE (they keep their seats).
  rng
    .shuffle(employees.slice(1, SEATED_COUNT).map((e) => e.id))
    .slice(0, ON_LEAVE_COUNT)
    .forEach((id) => {
      employees[id - 1].status = "ON_LEAVE";
    });

  // --- Allocations — teams cluster around their project's home zone -----------
  const occupiableByZone = new Map<string, Seat[]>();
  for (const key of ZONE_KEYS) occupiableByZone.set(key, []);
  for (const seat of seats) {
    if (seat.status === "OCCUPIED") {
      occupiableByZone.get(zoneKey(seat.floor, seat.zone))!.push(seat);
    }
  }

  const takeSeatNear = (projectId: number): Seat | undefined => {
    const home = projectHomeZoneKey(projectId);
    const start = ZONE_KEYS.indexOf(home);
    for (let offset = 0; offset < ZONE_KEYS.length; offset++) {
      const queue = occupiableByZone.get(
        ZONE_KEYS[(start + offset) % ZONE_KEYS.length]
      )!;
      if (queue.length > 0) return queue.shift();
    }
    return undefined;
  };

  const allocations: SeatAllocation[] = [];
  let allocationId = 1;
  for (const project of projects) {
    const members = employees.filter(
      (e) =>
        e.project_id === project.id &&
        (e.status === "ACTIVE" || e.status === "ON_LEAVE")
    );
    for (const member of members) {
      const seat = takeSeatNear(project.id);
      if (!seat) break;
      allocations.push({
        id: allocationId++,
        employee_id: member.id,
        seat_id: seat.id,
        project_id: project.id,
        allocation_status: "ACTIVE",
        allocation_date: member.joining_date,
        released_date: null,
      });
    }
  }

  return { employees, projects, seats, allocations };
}
