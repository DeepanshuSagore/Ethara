"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeeStatusBadge } from "@/components/employees/employee-status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects, useSeatIndex } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";

export type EmployeeSortKey = "name" | "employee_code" | "department";

export interface EmployeeSort {
  key: EmployeeSortKey;
  dir: "asc" | "desc";
}

interface EmployeeTableProps {
  employees: Employee[];
  /** Hide the project column on a project's own page. */
  showProject?: boolean;
  /** Current sort — pass with onSortChange to make columns sortable. */
  sort?: EmployeeSort | null;
  onSortChange?: (key: EmployeeSortKey) => void;
}

function SortableHead({
  label,
  sortKey,
  sort,
  onSortChange,
  className,
}: {
  label: string;
  sortKey: EmployeeSortKey;
  sort: EmployeeSort | null | undefined;
  onSortChange: (key: EmployeeSortKey) => void;
  className?: string;
}) {
  const active = sort?.key === sortKey;
  const Icon = active ? (sort.dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;

  return (
    <TableHead
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={className}
    >
      {/* -mx-3 + h-10 grow the button to the full header cell so the sorting
          control isn't a cramped sub-30px target. */}
      <button
        type="button"
        onClick={() => onSortChange(sortKey)}
        className="-mx-3 inline-flex h-10 cursor-pointer items-center gap-1 rounded-lg px-3 uppercase tracking-wider transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {label}
        <Icon
          className={cn("size-3.5 shrink-0", active ? "text-foreground" : "text-muted-foreground")}
          aria-hidden="true"
        />
        <span className="sr-only">
          {active
            ? sort.dir === "asc"
              ? ", sorted ascending, activate to sort descending"
              : ", sorted descending, activate to sort ascending"
            : ", activate to sort"}
        </span>
      </button>
    </TableHead>
  );
}

export function EmployeeTable({
  employees,
  showProject = true,
  sort,
  onSortChange,
}: EmployeeTableProps) {
  const router = useRouter();
  const { data: projects } = useProjects();
  const { seatByEmployee, isLoading: seatIndexLoading } = useSeatIndex();
  const projectsById = new Map((projects ?? []).map((p) => [p.id, p]));

  return (
    // The explicit min-w makes the primitive's overflow-x-auto wrapper scroll
    // on phones instead of crushing columns; department/role fold away below
    // md (role moves into the name cell's second line).
    <Table aria-label="Employees" className="min-w-160 md:min-w-4xl">
      <TableHeader>
        <TableRow>
          {onSortChange ? (
            <>
              <SortableHead label="Employee" sortKey="name" sort={sort} onSortChange={onSortChange} />
              <SortableHead
                label="Code"
                sortKey="employee_code"
                sort={sort}
                onSortChange={onSortChange}
              />
              <SortableHead
                label="Department"
                sortKey="department"
                sort={sort}
                onSortChange={onSortChange}
                className="hidden md:table-cell"
              />
            </>
          ) : (
            <>
              <TableHead>Employee</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="hidden md:table-cell">Department</TableHead>
            </>
          )}
          <TableHead className="hidden md:table-cell">Role</TableHead>
          {showProject && <TableHead>Project</TableHead>}
          <TableHead>Status</TableHead>
          <TableHead>Seat</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => {
          const seat = seatByEmployee.get(employee.id);
          return (
            <TableRow
              key={employee.id}
              className="cursor-pointer"
              onClick={() => {
                // Don't hijack a text selection (emails, codes) as navigation.
                if (window.getSelection()?.toString()) return;
                router.push(`/employees/${employee.id}`);
              }}
            >
              <TableCell>
                <Link
                  href={`/employees/${employee.id}`}
                  className="rounded-md font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  onClick={(e) => e.stopPropagation()}
                >
                  {employee.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  <span className="md:hidden">{employee.role} · </span>
                  <span className="font-mono">{employee.email}</span>
                </p>
              </TableCell>
              <TableCell className="text-metric whitespace-nowrap font-mono text-xs font-medium text-muted-foreground">
                {employee.employee_code}
              </TableCell>
              <TableCell className="hidden md:table-cell">{employee.department}</TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {employee.role}
              </TableCell>
              {showProject && (
                <TableCell>
                  {projectsById.get(employee.project_id)?.name ?? (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
              )}
              <TableCell>
                <EmployeeStatusBadge status={employee.status} />
              </TableCell>
              <TableCell className="text-metric font-mono text-xs font-medium">
                {seat ? (
                  <span className="whitespace-nowrap">
                    {seat.seat_code}
                    <span className="text-muted-foreground"> · F{seat.floor}</span>
                  </span>
                ) : seatIndexLoading ? (
                  <Skeleton className="h-4 w-14" />
                ) : (
                  <span className="text-muted-foreground">No seat</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
