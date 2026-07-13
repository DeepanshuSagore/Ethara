"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
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
}: {
  label: string;
  sortKey: EmployeeSortKey;
  sort: EmployeeSort | null | undefined;
  onSortChange: (key: EmployeeSortKey) => void;
}) {
  const active = sort?.key === sortKey;
  const Icon = active ? (sort.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSortChange(sortKey)}
        className="-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 uppercase tracking-wide transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
        <Icon
          className={active ? "size-3.5 text-primary" : "size-3.5 opacity-50"}
          aria-hidden="true"
        />
        <span className="sr-only">
          {active
            ? sort.dir === "asc"
              ? "— sorted ascending, activate to sort descending"
              : "— sorted descending, activate to sort ascending"
            : "— activate to sort"}
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
    <Table>
      <TableHeader>
        <TableRow>
          {onSortChange ? (
            <>
              <SortableHead label="Employee" sortKey="name" sort={sort} onSortChange={onSortChange} />
              <SortableHead label="Code" sortKey="employee_code" sort={sort} onSortChange={onSortChange} />
              <SortableHead
                label="Department"
                sortKey="department"
                sort={sort}
                onSortChange={onSortChange}
              />
            </>
          ) : (
            <>
              <TableHead>Employee</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Department</TableHead>
            </>
          )}
          <TableHead>Role</TableHead>
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
              onClick={() => router.push(`/employees/${employee.id}`)}
            >
              <TableCell>
                <Link
                  href={`/employees/${employee.id}`}
                  className="font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  {employee.name}
                </Link>
                <p className="text-xs text-muted-foreground">{employee.email}</p>
              </TableCell>
              <TableCell className="text-metric text-muted-foreground">
                {employee.employee_code}
              </TableCell>
              <TableCell>{employee.department}</TableCell>
              <TableCell className="text-muted-foreground">{employee.role}</TableCell>
              {showProject && (
                <TableCell>{projectsById.get(employee.project_id)?.name ?? "—"}</TableCell>
              )}
              <TableCell>
                <EmployeeStatusBadge status={employee.status} />
              </TableCell>
              <TableCell className="text-metric">
                {seat ? (
                  <span className="whitespace-nowrap">
                    {seat.seat_code}
                    <span className="text-xs text-muted-foreground"> · F{seat.floor}</span>
                  </span>
                ) : seatIndexLoading ? (
                  <Skeleton className="h-4 w-14" />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
