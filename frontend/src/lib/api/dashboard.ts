import type { DashboardSummary, FloorUtilization, ProjectUtilization } from "@/types";
import { apiFetch } from "./client";

export function getDashboardSummary(signal?: AbortSignal) {
  return apiFetch<DashboardSummary>("/dashboard/summary", { signal });
}

export function getProjectUtilization(signal?: AbortSignal) {
  return apiFetch<ProjectUtilization[]>("/dashboard/project-utilization", { signal });
}

export function getFloorUtilization(signal?: AbortSignal) {
  return apiFetch<FloorUtilization[]>("/dashboard/floor-utilization", { signal });
}
