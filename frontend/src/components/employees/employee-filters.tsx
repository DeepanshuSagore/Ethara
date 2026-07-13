"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMockData } from "@/lib/mock/store";
import { EMPLOYEE_STATUSES, type EmployeeStatus } from "@/types";

export interface EmployeeFilterState {
  search: string;
  department: string; // "all" | department name
  projectId: string; // "all" | project id
  status: string; // "all" | EmployeeStatus
}

export const DEFAULT_EMPLOYEE_FILTERS: EmployeeFilterState = {
  search: "",
  department: "all",
  projectId: "all",
  status: "all",
};

const STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On leave",
  EXITED: "Exited",
  PENDING_ALLOCATION: "Pending allocation",
};

interface EmployeeFiltersProps {
  filters: EmployeeFilterState;
  onChange: (filters: EmployeeFilterState) => void;
}

export function EmployeeFilters({ filters, onChange }: EmployeeFiltersProps) {
  const { projects, employees } = useMockData();
  const departments = [...new Set(employees.map((e) => e.department))].sort();

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,180px))]">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search by name, code or email…"
          className="pl-9"
          aria-label="Search employees"
        />
      </div>

      <Select
        value={filters.department}
        onValueChange={(department) => onChange({ ...filters, department })}
      >
        <SelectTrigger aria-label="Filter by department">
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All departments</SelectItem>
          {departments.map((dept) => (
            <SelectItem key={dept} value={dept}>
              {dept}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.projectId}
        onValueChange={(projectId) => onChange({ ...filters, projectId })}
      >
        <SelectTrigger aria-label="Filter by project">
          <SelectValue placeholder="Project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All projects</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={String(project.id)}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(status) => onChange({ ...filters, status })}>
        <SelectTrigger aria-label="Filter by status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {EMPLOYEE_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
