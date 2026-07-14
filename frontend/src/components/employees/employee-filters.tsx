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
import { useProjects } from "@/lib/api/hooks";
import { DEPARTMENTS } from "@/lib/constants";
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

/** Visible label above each filter control — a chosen value always has an
    on-screen name (htmlFor on the select triggers works: they're buttons). */
function FilterLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
      {children}
    </label>
  );
}

export function EmployeeFilters({ filters, onChange }: EmployeeFiltersProps) {
  const { data: projects } = useProjects();

  return (
    // The search input keeps flexible priority width at md+; the three
    // selects get a bounded 9–11rem track each.
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_repeat(3,minmax(9rem,11rem))]">
      <div className="space-y-1.5">
        <FilterLabel htmlFor="employee-search">Search</FilterLabel>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="employee-search"
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search by name, code or email…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <FilterLabel htmlFor="employee-filter-department">Department</FilterLabel>
        <Select
          value={filters.department}
          onValueChange={(department) => onChange({ ...filters, department })}
        >
          <SelectTrigger id="employee-filter-department">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {DEPARTMENTS.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <FilterLabel htmlFor="employee-filter-project">Project</FilterLabel>
        <Select
          value={filters.projectId}
          onValueChange={(projectId) => onChange({ ...filters, projectId })}
        >
          <SelectTrigger id="employee-filter-project">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {(projects ?? []).map((project) => (
              <SelectItem key={project.id} value={String(project.id)}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <FilterLabel htmlFor="employee-filter-status">Status</FilterLabel>
        <Select value={filters.status} onValueChange={(status) => onChange({ ...filters, status })}>
          <SelectTrigger id="employee-filter-status">
            <SelectValue placeholder="All statuses" />
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
    </div>
  );
}

/**
 * "N filters active" affordance: one removable chip per active filter plus a
 * clear-all button. Renders nothing when every filter is at its default.
 */
export function ActiveFilterChips({ filters, onChange }: EmployeeFiltersProps) {
  const { data: projects } = useProjects();
  const projectsById = new Map((projects ?? []).map((p) => [p.id, p]));

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
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {chips.length} {chips.length === 1 ? "filter" : "filters"} active
      </p>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.clear}
          aria-label={`Remove filter — ${chip.label}`}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium transition-colors duration-150 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {chip.label}
          <X className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
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
