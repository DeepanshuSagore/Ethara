import type { Seat, SeatAllocation, SeatStatus, SeatSuggestion } from "@/types";
import { apiFetch } from "./client";

/** GET /seats query params — status/floor/zone filter server-side. */
export interface SeatListParams {
  status?: SeatStatus;
  floor?: number;
  zone?: string;
  limit?: number;
  offset?: number;
}

export function listSeats(params: SeatListParams = {}, signal?: AbortSignal) {
  return apiFetch<Seat[]>("/seats", { params: { ...params }, signal });
}

export function getSeat(id: number, signal?: AbortSignal) {
  return apiFetch<Seat>(`/seats/${id}`, { signal });
}

/** Rule-5 ranking: team zone → same floor → alternate zone. */
export function listSeatSuggestions(employeeId: number, limit = 3, signal?: AbortSignal) {
  return apiFetch<SeatSuggestion[]>("/seats/suggestions", {
    params: { employee_id: employeeId, limit },
    signal,
  });
}

export function allocateSeat(employeeId: number, seatId: number) {
  return apiFetch<SeatAllocation>("/seats/allocate", {
    method: "POST",
    body: { employee_id: employeeId, seat_id: seatId },
  });
}

export function releaseSeat(seatId: number) {
  return apiFetch<SeatAllocation>("/seats/release", {
    method: "POST",
    body: { seat_id: seatId },
  });
}
