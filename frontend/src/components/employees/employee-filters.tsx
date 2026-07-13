"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function countActiveFilters(filters: EmployeeFilterState) {
  return (
    Number(filters.search.trim() !== "") +
    Number(filters.department !== "all") +
    Number(filters.projectId !== "all") +
    Number(filters.status !== "all")
  );
}

export const STATUS_LABELS: Record<EmployeeStatus, string> = {
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

/**
 * "N filters active" affordance: one removable chip per active filter plus a
 * clear-all button. Renders nothing when every filter is at its default.
 */
export function ActiveFilterChips({ filters, onChange }: EmployeeFiltersProps) {
  const { projectsById } = useMockData();

  const chips: Array<{ key: string; label: string; clear: () => void }> = [];
  if (filters.search.trim() !== "") {
    chips.push({
      key: "search",
      label: `Search: “${filters.search.trim()}”`,
      clear: () => onChange({ ...filters, search: "" }),
    });
  }
  if (filters.department !== "all") {
    chips.push({
      key: "department",
      label: `Department: ${filters.department}`,
      clear: () => onChange({ ...filters, department: "all" }),
    });
  }
  if (filters.projectId !== "all") {
    chips.push({
      key: "project",
      label: `Project: ${projectsById.get(Number(filters.projectId))?.name ?? filters.projectId}`,
      clear: () => onChange({ ...filters, projectId: "all" }),
    });
  }
  if (filters.status !== "all") {
    chips.push({
      key: "status",
      label: `Status: ${STATUS_LABELS[filters.status as EmployeeStatus] ?? filters.status}`,
      clear: () => onChange({ ...filters, status: "all" }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {chips.length} {chips.length === 1 ? "filter" : "filters"} active
      </span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.clear}
          aria-label={`Remove filter — ${chip.label}`}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-3 pr-2 text-xs font-medium shadow-soft transition-colors hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {chip.label}
          <X className="size-3 text-muted-foreground" aria-hidden="true" />
        </button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(DEFAULT_EMPLOYEE_FILTERS)}
        className="text-muted-foreground"
      >
        Clear all
      </Button>
    </div>
  );
}
