"use client";

import * as React from "react";
import type {
  Employee,
  Project,
  Seat,
  SeatAllocation,
  SeatSuggestion,
} from "@/types";
import {
  DISPLAY_SCALE,
  FLOORS,
  generateMockDataset,
  projectHomeZoneKey,
  zoneKey,
  type MockDataset,
} from "./data";

/**
 * Client-side mock data store (Phase 2). Holds the deterministic dataset in
 * React state so seat allocate/release and new-joiner actions update the UI
 * live. Phase 7 replaces this with TanStack Query hooks over the real API —
 * consumers only depend on the hook surface below.
 */

export interface ProjectStats {
  project: Project;
  /** Members not EXITED (matches "mapped to one active project"). */
  headcount: number;
  /** Members currently holding an ACTIVE seat allocation. */
  seated: number;
  homeZone: string;
}

export interface FloorStats {
  floor: number;
  total: number;
  occupied: number;
  available: number;
  reserved: number;
  maintenance: number;
  occupancyPct: number;
}

export interface DashboardMetrics {
  /** Real (browsable) counts. */
  totalEmployees: number;
  totalSeats: number;
  occupied: number;
  available: number;
  reserved: number;
  maintenance: number;
  pendingJoiners: number;
  utilizationPct: number;
  /** Counts × DISPLAY_SCALE — the brief's ~5,000/~5,600 headline volumes. */
  display: {
    totalEmployees: number;
    totalSeats: number;
    occupied: number;
    available: number;
    reserved: number;
    maintenance: number;
    pendingJoiners: number;
  };
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export interface NewJoinerInput {
  name: string;
  email: string;
  department: string;
  role: string;
  project_id: number;
}

interface MockStore {
  employees: Employee[];
  projects: Project[];
  seats: Seat[];
  allocations: SeatAllocation[];

  employeesById: Map<number, Employee>;
  projectsById: Map<number, Project>;
  seatsById: Map<number, Seat>;
  /** employee_id → their currently allocated seat. */
  seatByEmployee: Map<number, Seat>;
  /** seat_id → current occupant + allocation row. */
  occupantBySeat: Map<number, { employee: Employee; allocation: SeatAllocation }>;

  metrics: DashboardMetrics;
  projectStats: ProjectStats[];
  floorStats: FloorStats[];
  pendingJoiners: Employee[];

  suggestSeatsFor: (employee: Employee) => SeatSuggestion[];
  allocateSeat: (employeeId: number, seatId: number) => ActionResult;
  releaseSeat: (seatId: number) => ActionResult;
  addJoiner: (input: NewJoinerInput) => ActionResult;
}

const MockDataContext = React.createContext<MockStore | null>(null);

// Deterministic, so server render and client hydration agree.
const initialDataset = generateMockDataset();

export function MockDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState<MockDataset>(initialDataset);

  const derived = React.useMemo(() => {
    const employeesById = new Map(data.employees.map((e) => [e.id, e]));
    const projectsById = new Map(data.projects.map((p) => [p.id, p]));
    const seatsById = new Map(data.seats.map((s) => [s.id, s]));

    const seatByEmployee = new Map<number, Seat>();
    const occupantBySeat = new Map<
      number,
      { employee: Employee; allocation: SeatAllocation }
    >();
    for (const alloc of data.allocations) {
      if (alloc.allocation_status !== "ACTIVE") continue;
      const seat = seatsById.get(alloc.seat_id);
      const employee = employeesById.get(alloc.employee_id);
      if (!seat || !employee) continue;
      seatByEmployee.set(employee.id, seat);
      occupantBySeat.set(seat.id, { employee, allocation: alloc });
    }

    const seatCounts = { AVAILABLE: 0, OCCUPIED: 0, RESERVED: 0, MAINTENANCE: 0 };
    for (const seat of data.seats) seatCounts[seat.status]++;

    const activeEmployees = data.employees.filter((e) => e.status !== "EXITED");
    const pendingJoiners = data.employees.filter(
      (e) => e.status === "PENDING_ALLOCATION"
    );

    const metrics: DashboardMetrics = {
      totalEmployees: activeEmployees.length,
      totalSeats: data.seats.length,
      occupied: seatCounts.OCCUPIED,
      available: seatCounts.AVAILABLE,
      reserved: seatCounts.RESERVED,
      maintenance: seatCounts.MAINTENANCE,
      pendingJoiners: pendingJoiners.length,
      utilizationPct: Math.round((seatCounts.OCCUPIED / data.seats.length) * 100),
      display: {
        totalEmployees: activeEmployees.length * DISPLAY_SCALE,
        totalSeats: data.seats.length * DISPLAY_SCALE,
        occupied: seatCounts.OCCUPIED * DISPLAY_SCALE,
        available: seatCounts.AVAILABLE * DISPLAY_SCALE,
        reserved: seatCounts.RESERVED * DISPLAY_SCALE,
        maintenance: seatCounts.MAINTENANCE * DISPLAY_SCALE,
        pendingJoiners: pendingJoiners.length * DISPLAY_SCALE,
      },
    };

    const projectStats: ProjectStats[] = data.projects.map((project) => {
      const members = data.employees.filter(
        (e) => e.project_id === project.id && e.status !== "EXITED"
      );
      const seated = members.filter((m) => seatByEmployee.has(m.id)).length;
      return {
        project,
        headcount: members.length,
        seated,
        homeZone: projectHomeZoneKey(project.id),
      };
    });

    const floorStats: FloorStats[] = FLOORS.map((floor) => {
      const floorSeats = data.seats.filter((s) => s.floor === floor);
      const counts = { AVAILABLE: 0, OCCUPIED: 0, RESERVED: 0, MAINTENANCE: 0 };
      for (const seat of floorSeats) counts[seat.status]++;
      return {
        floor,
        total: floorSeats.length,
        occupied: counts.OCCUPIED,
        available: counts.AVAILABLE,
        reserved: counts.RESERVED,
        maintenance: counts.MAINTENANCE,
        occupancyPct: Math.round((counts.OCCUPIED / floorSeats.length) * 100),
      };
    });

    return {
      employeesById,
      projectsById,
      seatsById,
      seatByEmployee,
      occupantBySeat,
      metrics,
      projectStats,
      floorStats,
      pendingJoiners,
    };
  }, [data]);

  const suggestSeatsFor = React.useCallback(
    (employee: Employee): SeatSuggestion[] => {
      // Team zone = where most of the project's members actually sit,
      // falling back to the project's seeded home zone.
      const zoneTally = new Map<string, number>();
      for (const member of data.employees) {
        if (member.project_id !== employee.project_id) continue;
        const seat = derived.seatByEmployee.get(member.id);
        if (!seat) continue;
        const key = zoneKey(seat.floor, seat.zone);
        zoneTally.set(key, (zoneTally.get(key) ?? 0) + 1);
      }
      let teamZone = projectHomeZoneKey(employee.project_id);
      let best = 0;
      for (const [key, count] of zoneTally) {
        if (count > best) {
          best = count;
          teamZone = key;
        }
      }
      const teamFloor = Number(teamZone[0]);

      const suggestions: SeatSuggestion[] = [];
      const available = data.seats.filter((s) => s.status === "AVAILABLE");
      for (const seat of available) {
        const key = zoneKey(seat.floor, seat.zone);
        if (key === teamZone) suggestions.push({ seat, reason: "team-zone" });
        else if (seat.floor === teamFloor)
          suggestions.push({ seat, reason: "same-floor" });
        else suggestions.push({ seat, reason: "alternate-zone" });
      }
      const order = { "team-zone": 0, "same-floor": 1, "alternate-zone": 2 };
      suggestions.sort((a, b) => order[a.reason] - order[b.reason]);
      return suggestions.slice(0, 3);
    },
    [data, derived.seatByEmployee]
  );

  const allocateSeat = React.useCallback(
    (employeeId: number, seatId: number): ActionResult => {
      let result: ActionResult = { ok: true };
      setData((prev) => {
        const seat = prev.seats.find((s) => s.id === seatId);
        const employee = prev.employees.find((e) => e.id === employeeId);
        if (!seat || !employee) {
          result = { ok: false, error: "Seat or employee not found." };
          return prev;
        }
        if (seat.status !== "AVAILABLE") {
          // Business rules 2 & 4: only AVAILABLE seats can be allocated.
          result = {
            ok: false,
            error: `Seat ${seat.seat_code} is ${seat.status.toLowerCase()} and cannot be allocated.`,
          };
          return prev;
        }
        const hasActive = prev.allocations.some(
          (a) => a.employee_id === employeeId && a.allocation_status === "ACTIVE"
        );
        if (hasActive) {
          // Business rule 1: one active seat per employee.
          result = { ok: false, error: `${employee.name} already has an active seat.` };
          return prev;
        }
        const now = new Date().toISOString();
        return {
          ...prev,
          seats: prev.seats.map((s) =>
            s.id === seatId ? { ...s, status: "OCCUPIED" } : s
          ),
          employees: prev.employees.map((e) =>
            e.id === employeeId ? { ...e, status: "ACTIVE", updated_at: now } : e
          ),
          allocations: [
            ...prev.allocations,
            {
              id: prev.allocations.length + 1,
              employee_id: employeeId,
              seat_id: seatId,
              project_id: employee.project_id,
              allocation_status: "ACTIVE",
              allocation_date: now,
              released_date: null,
            },
          ],
        };
      });
      return result;
    },
    []
  );

  const releaseSeat = React.useCallback((seatId: number): ActionResult => {
    let result: ActionResult = { ok: true };
    setData((prev) => {
      const active = prev.allocations.find(
        (a) => a.seat_id === seatId && a.allocation_status === "ACTIVE"
      );
      if (!active) {
        result = { ok: false, error: "This seat has no active allocation." };
        return prev;
      }
      const now = new Date().toISOString();
      return {
        ...prev,
        // Business rule 3: released seats become available again.
        seats: prev.seats.map((s) =>
          s.id === seatId ? { ...s, status: "AVAILABLE" } : s
        ),
        allocations: prev.allocations.map((a) =>
          a.id === active.id
            ? { ...a, allocation_status: "RELEASED", released_date: now }
            : a
        ),
      };
    });
    return result;
  }, []);

  const addJoiner = React.useCallback((input: NewJoinerInput): ActionResult => {
    let result: ActionResult = { ok: true };
    setData((prev) => {
      const email = input.email.trim().toLowerCase();
      if (prev.employees.some((e) => e.email.toLowerCase() === email)) {
        // Business rule 6: duplicate employee email is rejected.
        result = { ok: false, error: `An employee with ${email} already exists.` };
        return prev;
      }
      const id = prev.employees.length + 1;
      const now = new Date().toISOString();
      return {
        ...prev,
        employees: [
          ...prev.employees,
          {
            id,
            employee_code: `ETH-${String(id).padStart(4, "0")}`,
            name: input.name.trim(),
            email,
            department: input.department,
            role: input.role.trim(),
            joining_date: now,
            status: "PENDING_ALLOCATION",
            project_id: input.project_id,
            created_at: now,
            updated_at: now,
          },
        ],
      };
    });
    return result;
  }, []);

  const value = React.useMemo<MockStore>(
    () => ({
      ...data,
      ...derived,
      suggestSeatsFor,
      allocateSeat,
      releaseSeat,
      addJoiner,
    }),
    [data, derived, suggestSeatsFor, allocateSeat, releaseSeat, addJoiner]
  );

  return <MockDataContext.Provider value={value}>{children}</MockDataContext.Provider>;
}

export function useMockData() {
  const ctx = React.useContext(MockDataContext);
  if (!ctx) throw new Error("useMockData must be used within a MockDataProvider");
  return ctx;
}
