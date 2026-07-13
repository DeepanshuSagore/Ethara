import type { Employee, Project } from "@/types";
import { apiFetch } from "./client";

export function listProjects(signal?: AbortSignal) {
  return apiFetch<Project[]>("/projects", { signal });
}

export function getProject(id: number, signal?: AbortSignal) {
  return apiFetch<Project>(`/projects/${id}`, { signal });
}

export function listProjectEmployees(id: number, signal?: AbortSignal) {
  return apiFetch<Employee[]>(`/projects/${id}/employees`, { signal });
}
