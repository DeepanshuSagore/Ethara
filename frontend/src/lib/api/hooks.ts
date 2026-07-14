"use client";

import * as React from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Seat, SeatAllocation } from "@/types";
import { listAllocations } from "./allocations";
import { askAssistant, type AiChatTurn } from "./ai";
import {
  getDashboardSummary,
  getFloorUtilization,
  getProjectUtilization,
} from "./dashboard";
import {
  createEmployee,
  getEmployee,
  listEmployees,
  type EmployeeCreatePayload,
  type EmployeeListParams,
} from "./employees";
import { getProject, listProjectEmployees, listProjects } from "./projects";
import {
  allocateSeat,
  listSeats,
  listSeatSuggestions,
  releaseSeat,
  type SeatListParams,
} from "./seats";

/**
 * TanStack Query hooks — the Phase 7 replacement for the mock store's hook
 * surface. Screens consume these; the fetch wrappers live beside them in
 * src/lib/api/. Mutations invalidate the whole cache (see useDirectoryMutation)
 * so dashboard metrics, seat map and lists refetch after every allocation,
 * release or new joiner (business rule 8, now computed server-side).
 */

// --- Dashboard ---------------------------------------------------------------

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: ({ signal }) => getDashboardSummary(signal),
  });
}

export function useProjectUtilization() {
  return useQuery({
    queryKey: ["dashboard", "project-utilization"],
    queryFn: ({ signal }) => getProjectUtilization(signal),
  });
}

export function useFloorUtilization() {
  return useQuery({
    queryKey: ["dashboard", "floor-utilization"],
    queryFn: ({ signal }) => getFloorUtilization(signal),
  });
}

// --- Employees ---------------------------------------------------------------

export function useEmployees(params: EmployeeListParams = {}, enabled = true) {
  return useQuery({
    queryKey: ["employees", params],
    queryFn: ({ signal }) => listEmployees(params, signal),
    // Keep the previous page on screen while the next one loads, so paging
    // and typing in the search box never flash a skeleton.
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useEmployee(id: number) {
  return useQuery({
    queryKey: ["employees", "detail", id],
    queryFn: ({ signal }) => getEmployee(id, signal),
    enabled: Number.isInteger(id) && id > 0,
    // A 404 is a real answer ("not found" empty state) — don't retry into it.
    retry: false,
  });
}

/** The pending-allocation queue (~50 rows) — shared by dashboard, dialogs & queue. */
export function usePendingJoiners(enabled = true) {
  return useEmployees({ status: "PENDING_ALLOCATION" }, enabled);
}

// --- Projects ----------------------------------------------------------------

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: ({ signal }) => listProjects(signal),
  });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: ["projects", "detail", id],
    queryFn: ({ signal }) => getProject(id, signal),
    enabled: Number.isInteger(id) && id > 0,
    retry: false,
  });
}

export function useProjectEmployees(id: number) {
  return useQuery({
    queryKey: ["projects", "detail", id, "employees"],
    queryFn: ({ signal }) => listProjectEmployees(id, signal),
    enabled: Number.isInteger(id) && id > 0,
  });
}

// --- Seats ---------------------------------------------------------------------

export function useSeats(params: SeatListParams = {}, enabled = true) {
  return useQuery({
    queryKey: ["seats", params],
    queryFn: ({ signal }) => listSeats(params, signal),
    placeholderData: keepPreviousData,
    // The allocation dialog mounts on every project page — its seat-map
    // query must not fire until the seat step is actually shown.
    enabled,
  });
}

export function useSeatSuggestions(employeeId: number, limit = 3) {
  return useQuery({
    queryKey: ["seats", "suggestions", employeeId, limit],
    queryFn: ({ signal }) => listSeatSuggestions(employeeId, limit, signal),
    // The allocation dialog mounts this before a joiner is picked (id 0) —
    // same guard as useEmployee so we never fetch a nonsense id.
    enabled: Number.isInteger(employeeId) && employeeId > 0,
  });
}

// --- Seat index — who sits where ----------------------------------------------

export interface SeatIndex {
  /** employee_id → their currently allocated seat. */
  seatByEmployee: Map<number, Seat>;
  /** seat_id → current occupant's id + allocation row. */
  occupantBySeat: Map<number, { employeeId: number; allocation: SeatAllocation }>;
}

/**
 * Joins ACTIVE allocations with the seat inventory client-side — the REST
 * surface keeps employees and seats separate, so this pair of cached queries
 * backs every "which seat / whose seat" lookup (employee table & detail,
 * seat-dialog occupant). Both refetch after any allocate/release mutation.
 */
export function useSeatIndex() {
  const allocations = useQuery({
    queryKey: ["allocations", { status: "ACTIVE" }],
    queryFn: ({ signal }) => listAllocations({ status: "ACTIVE" }, signal),
  });
  const seats = useQuery({
    queryKey: ["seats", {}],
    queryFn: ({ signal }) => listSeats({}, signal),
  });

  const index = React.useMemo<SeatIndex>(() => {
    const seatByEmployee = new Map<number, Seat>();
    const occupantBySeat = new Map<
      number,
      { employeeId: number; allocation: SeatAllocation }
    >();
    if (allocations.data && seats.data) {
      const seatsById = new Map(seats.data.map((s) => [s.id, s]));
      for (const allocation of allocations.data) {
        const seat = seatsById.get(allocation.seat_id);
        if (!seat) continue;
        seatByEmployee.set(allocation.employee_id, seat);
        occupantBySeat.set(seat.id, { employeeId: allocation.employee_id, allocation });
      }
    }
    return { seatByEmployee, occupantBySeat };
  }, [allocations.data, seats.data]);

  return {
    ...index,
    isLoading: allocations.isLoading || seats.isLoading,
    isError: allocations.isError || seats.isError,
  };
}

// --- Mutations -----------------------------------------------------------------

/**
 * Every write changes seat statuses, allocation rows AND the live dashboard
 * metrics, so on success we simply invalidate the entire cache — active
 * screens refetch immediately, everything else refetches on next mount.
 */
function useDirectoryMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      // Deliberately not returned/awaited: awaiting would delay the caller's
      // onSuccess until refetches land — and if the refetch unmounts the
      // calling component (e.g. an allocated joiner's card leaving the
      // queue), its toast callback would never fire.
      void queryClient.invalidateQueries();
    },
  });
}

export function useAllocateSeat() {
  return useDirectoryMutation((vars: { employeeId: number; seatId: number }) =>
    allocateSeat(vars.employeeId, vars.seatId)
  );
}

export function useReleaseSeat() {
  return useDirectoryMutation((vars: { seatId: number }) => releaseSeat(vars.seatId));
}

export function useAddJoiner() {
  return useDirectoryMutation((payload: EmployeeCreatePayload) => createEmployee(payload));
}

// --- Assistant -------------------------------------------------------------------

export function useAiQuery() {
  return useMutation({
    mutationFn: (vars: { query: string; history?: AiChatTurn[] }) =>
      askAssistant(vars.query, vars.history),
  });
}
