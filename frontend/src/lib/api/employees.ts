import type { Employee, EmployeeStatus } from "@/types";
import { apiFetch } from "./client";

/** GET /employees query params — filters run server-side over all 5,000 rows. */
export interface EmployeeListParams {
  search?: string;
  department?: string;
  role?: string;
  project_id?: number;
  status?: EmployeeStatus;
  limit?: number;
  offset?: number;
}

export function listEmployees(params: EmployeeListParams = {}, signal?: AbortSignal) {
  return apiFetch<Employee[]>("/employees", { params: { ...params }, signal });
}

export function getEmployee(id: number, signal?: AbortSignal) {
  return apiFetch<Employee>(`/employees/${id}`, { signal });
}

/** POST /employees body — status defaults to PENDING_ALLOCATION server-side. */
export interface EmployeeCreatePayload {
  employee_code: string;
  name: string;
  email: string;
  department: string;
  role: string;
  joining_date: string;
  project_id: number;
}

export function createEmployee(payload: EmployeeCreatePayload) {
  return apiFetch<Employee>("/employees", { method: "POST", body: payload });
}
