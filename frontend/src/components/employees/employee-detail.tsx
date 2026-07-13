"use client";

import Link from "next/link";
import { ArrowLeft, Armchair, DoorOpen, FolderKanban, UserX } from "lucide-react";
import { EmployeeStatusBadge } from "@/components/employees/employee-status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/use-toast";
import { useRole } from "@/lib/demo-role";
import { useMockData } from "@/lib/mock/store";
import { formatDate, initials } from "@/lib/utils";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

export function EmployeeDetail({ id }: { id: number }) {
  const { employeesById, projectsById, seatByEmployee, releaseSeat } = useMockData();
  const { role } = useRole();
  const { toast } = useToast();

  const employee = employeesById.get(id);

  if (!employee) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={UserX}
            title="Employee not found"
            description={`No employee with id ${id} exists in the directory.`}
            action={
              <Button asChild variant="outline">
                <Link href="/employees">
                  <ArrowLeft /> Back to employees
                </Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const project = projectsById.get(employee.project_id);
  const seat = seatByEmployee.get(employee.id);
  const canManage = role === "Admin" || role === "HR";

  const handleRelease = () => {
    if (!seat) return;
    const result = releaseSeat(seat.id);
    toast(
      result.ok
        ? {
            title: "Seat released",
            description: `Seat ${seat.seat_code} on Floor ${seat.floor} is available again.`,
          }
        : { title: "Could not release seat", description: result.error, variant: "destructive" }
    );
  };

  return (
    <>
      <PageHeader
        title={employee.name}
        description={`${employee.role} · ${employee.department}`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/employees">
                <ArrowLeft /> All employees
              </Link>
            </Button>
            {canManage && seat && (
              <Button variant="destructive" size="sm" onClick={handleRelease}>
                <DoorOpen /> Release seat
              </Button>
            )}
            {canManage && employee.status === "PENDING_ALLOCATION" && (
              <Button asChild size="sm">
                <Link href="/new-joiners">
                  <Armchair /> Allocate seat
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center gap-4 space-y-0">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-sm font-semibold text-accent-foreground">
              {initials(employee.name)}
            </span>
            <div className="min-w-0 space-y-1">
              <CardTitle className="truncate">{employee.name}</CardTitle>
              <CardDescription className="text-metric">
                {employee.employee_code}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <Field label="Email" value={employee.email} />
              <Field label="Department" value={employee.department} />
              <Field label="Role" value={employee.role} />
              <Field label="Joined" value={formatDate(employee.joining_date)} />
              <Field label="Status" value={<EmployeeStatusBadge status={employee.status} />} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Armchair className="size-4 text-primary" /> Seat allocation
            </CardTitle>
            <CardDescription>
              {seat ? "Current active allocation" : "No active seat allocation"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {seat ? (
              <>
                <p className="text-metric text-3xl font-semibold">{seat.seat_code}</p>
                <dl className="mt-3 divide-y divide-border">
                  <Field label="Floor" value={`Floor ${seat.floor}`} />
                  <Field label="Zone" value={`Zone ${seat.zone}`} />
                  <Field label="Bay" value={`Bay ${seat.bay}`} />
                </dl>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href={`/seats?floor=${seat.floor}`}>View on seat map</Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {employee.status === "PENDING_ALLOCATION"
                  ? "This new joiner is waiting in the allocation queue."
                  : employee.status === "EXITED"
                    ? "Employee has exited — their seat was released."
                    : "No seat is currently assigned."}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="size-4 text-primary" /> Project
            </CardTitle>
            <CardDescription>Active project assignment</CardDescription>
          </CardHeader>
          <CardContent>
            {project ? (
              <>
                <Link
                  href={`/projects/${project.id}`}
                  className="text-xl font-semibold hover:underline"
                >
                  {project.name}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
                <dl className="mt-3 divide-y divide-border">
                  <Field label="Manager" value={project.manager_name} />
                  <Field label="Status" value={project.status === "ACTIVE" ? "Active" : project.status} />
                </dl>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No project assigned.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
