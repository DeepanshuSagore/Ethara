import type { AllocationStatus, SeatAllocation } from "@/types";
import { apiFetch } from "./client";

export interface AllocationListParams {
  employee_id?: number;
  seat_id?: number;
  status?: AllocationStatus;
  limit?: number;
  offset?: number;
}

/** GET /allocations — resolves who sits where (employee ↔ seat links). */
export function listAllocations(params: AllocationListParams = {}, signal?: AbortSignal) {
  return apiFetch<SeatAllocation[]>("/allocations", { params: { ...params }, signal });
}
