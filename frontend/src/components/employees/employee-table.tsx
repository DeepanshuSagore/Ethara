"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeeStatusBadge } from "@/components/employees/employee-status-badge";
import { useMockData } from "@/lib/mock/store";
import type { Employee } from "@/types";

interface EmployeeTableProps {
  employees: Employee[];
  /** Hide the project column on a project's own page. */
  showProject?: boolean;
}

export function EmployeeTable({ employees, showProject = true }: EmployeeTableProps) {
  const router = useRouter();
  const { projectsById, seatByEmployee } = useMockData();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Department</TableHead>
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
                  className="font-medium hover:underline"
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
                  <span>
                    {seat.seat_code}
                    <span className="text-xs text-muted-foreground"> · F{seat.floor}</span>
                  </span>
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
