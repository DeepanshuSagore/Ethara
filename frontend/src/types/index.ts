/**
 * Shared domain types — field names mirror the backend DB schema
 * (PROJECT_PLAN.md §3) so the Phase 7 mock→API swap is mechanical.
 */

export const EMPLOYEE_STATUSES = [
  "ACTIVE",
  "ON_LEAVE",
  "EXITED",
  "PENDING_ALLOCATION",
] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const SEAT_STATUSES = [
  "AVAILABLE",
  "OCCUPIED",
  "RESERVED",
  "MAINTENANCE",
] as const;
export type SeatStatus = (typeof SEAT_STATUSES)[number];

export const PROJECT_STATUSES = ["ACTIVE", "ON_HOLD", "COMPLETED"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const ALLOCATION_STATUSES = ["ACTIVE", "RELEASED"] as const;
export type AllocationStatus = (typeof ALLOCATION_STATUSES)[number];

export interface Employee {
  id: number;
  employee_code: string;
  name: string;
  email: string;
  department: string;
  role: string;
  joining_date: string;
  status: EmployeeStatus;
  project_id: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  manager_name: string;
  status: ProjectStatus;
  created_at: string;
}

export interface Seat {
  id: number;
  floor: number;
  zone: string;
  bay: number;
  seat_number: number;
  seat_code: string;
  status: SeatStatus;
  created_at: string;
}

export interface SeatAllocation {
  id: number;
  employee_id: number;
  seat_id: number;
  project_id: number;
  allocation_status: AllocationStatus;
  allocation_date: string;
  released_date: string | null;
}

/** A suggested seat for a pending new joiner, with why it was suggested. */
export interface SeatSuggestion {
  seat: Seat;
  reason: "team-zone" | "same-floor" | "alternate-zone";
}

/** GET /dashboard/summary — live headline metrics (business rule 8). */
export interface DashboardSummary {
  /** Non-EXITED employees. */
  total_employees: number;
  total_seats: number;
  occupied: number;
  available: number;
  reserved: number;
  maintenance: number;
  pending_joiners: number;
  utilization_pct: number;
}

/** GET /dashboard/project-utilization — one row per project. */
export interface ProjectUtilization {
  project: Project;
  /** Members not EXITED. */
  headcount: number;
  /** Members currently holding an ACTIVE seat allocation. */
  seated: number;
  /** Zone the team clusters around, e.g. "1A". */
  home_zone: string;
}

/** GET /dashboard/floor-utilization — one row per floor. */
export interface FloorUtilization {
  floor: number;
  total: number;
  occupied: number;
  available: number;
  reserved: number;
  maintenance: number;
  occupancy_pct: number;
}
