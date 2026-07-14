"use client";

import Link from "next/link";
import { ArrowLeft, Armchair, DoorOpen, FolderKanban, UserX } from "lucide-react";
import { EmployeeStatusBadge } from "@/components/employees/employee-status-badge";
import { ErrorState } from "@/components/layout/error-state";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import EmployeeDetailLoading from "@/app/(dashboard)/employees/[id]/loading";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useEmployee, useProject, useReleaseSeat, useSeatIndex } from "@/lib/api/hooks";
import { useRole } from "@/lib/demo-role";
import { cn, formatDate, initials } from "@/lib/utils";
import type { ProjectStatus } from "@/types";

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
};

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  /** IDs, codes and emails render in the mono identifier style. */
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 wrap-break-word text-right text-sm font-medium",
          mono && "font-mono text-xs"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function EmployeeDetail({ id }: { id: number }) {
  const employeeQuery = useEmployee(id);
  const employee = employeeQuery.data;
  const projectQuery = useProject(employee?.project_id ?? 0);
  const { seatByEmployee, isLoading: seatIndexLoading } = useSeatIndex();
  const releaseSeatMutation = useReleaseSeat();
  const { role } = useRole();
  const { toast } = useToast();

  const invalidId = !Number.isInteger(id) || id <= 0;
  if (invalidId || employeeQuery.isError) {
    if (
      invalidId ||
      (employeeQuery.error instanceof ApiError && employeeQuery.error.status === 404)
    ) {
      return (
        <>
          {/* Keep an h1 so the 404 branch's heading outline stays intact. */}
          <PageHeader
            title="Employee not found"
            description="This profile does not exist in the directory."
          />
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
        </>
      );
    }
    return (
      <>
        <PageHeader
          title="Employee"
          description="This profile could not be loaded."
        />
        <ErrorState
          title="Could not load this employee"
          description="The Ethara API did not respond. Check that the backend is running, then try again."
          detail={errorMessage(employeeQuery.error)}
          onRetry={() => employeeQuery.refetch()}
          backHref="/employees"
          backLabel="Back to employees"
        />
      </>
    );
  }

  if (!employee) {
    return <EmployeeDetailLoading />;
  }

  const project = projectQuery.data;
  const seat = seatByEmployee.get(employee.id);
  const canManage = role === "Admin" || role === "HR";

  const handleRelease = () => {
    if (!seat) return;
    releaseSeatMutation.mutate(
      { seatId: seat.id },
      {
        onSuccess: () =>
          toast({
            title: "Seat released",
            description: `Seat ${seat.seat_code} on Floor ${seat.floor} is available again.`,
          }),
        onError: (error) =>
          toast({
            title: "Could not release seat",
            description: errorMessage(error),
            variant: "destructive",
          }),
      }
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Directory"
        title={employee.name}
        description={`${employee.role} · ${employee.department}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/employees">
                <ArrowLeft /> All employees
              </Link>
            </Button>
            {canManage && seat && (
              <Button
                variant="destructive"
                onClick={handleRelease}
                disabled={releaseSeatMutation.isPending}
              >
                <DoorOpen /> {releaseSeatMutation.isPending ? "Releasing…" : "Release seat"}
              </Button>
            )}
            {canManage && employee.status === "PENDING_ALLOCATION" && (
              <Button asChild>
                <Link href="/new-joiners">
                  <Armchair /> Allocate seat
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader className="flex-row items-center gap-4 space-y-0">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-medium text-accent-foreground"
              aria-hidden="true"
            >
              {initials(employee.name)}
            </span>
            <div className="min-w-0 space-y-1">
              <CardTitle as="h2" className="truncate">
                {employee.name}
              </CardTitle>
              <CardDescription className="text-metric font-mono text-xs font-medium">
                {employee.employee_code}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <dl className="divide-y divide-border">
              <Field label="Email" value={employee.email} mono />
              <Field label="Department" value={employee.department} />
              <Field label="Role" value={employee.role} />
              <Field label="Joined" value={formatDate(employee.joining_date)} />
              <Field label="Status" value={<EmployeeStatusBadge status={employee.status} />} />
            </dl>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <Armchair className="size-4 text-primary" aria-hidden="true" /> Seat allocation
            </CardTitle>
            <CardDescription>
              {seat
                ? "Current active allocation"
                : seatIndexLoading
                  ? "Checking the allocation register…"
                  : "No active seat allocation"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {seat ? (
              <>
                <p className="text-metric font-mono text-3xl font-semibold tracking-tight">
                  {seat.seat_code}
                </p>
                <dl className="mt-3 divide-y divide-border">
                  <Field label="Floor" value={`Floor ${seat.floor}`} />
                  <Field label="Zone" value={`Zone ${seat.zone}`} />
                  <Field label="Bay" value={`Bay ${seat.bay}`} />
                </dl>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href={`/seats?floor=${seat.floor}`}>View on seat map</Link>
                </Button>
              </>
            ) : seatIndexLoading ? (
              <div role="status" aria-label="Loading seat allocation" className="space-y-3">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {employee.status === "PENDING_ALLOCATION"
                  ? "This new joiner is waiting in the allocation queue."
                  : employee.status === "EXITED"
                    ? "Employee has exited. Their seat was released."
                    : "No seat is currently assigned."}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <FolderKanban className="size-4 text-primary" aria-hidden="true" /> Project
            </CardTitle>
            <CardDescription>Active project assignment</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {project ? (
              <>
                <Link
                  href={`/projects/${project.id}`}
                  className="inline-block rounded-md font-display text-lg font-semibold tracking-tight text-accent-solid hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {project.name}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
                <dl className="mt-3 divide-y divide-border">
                  <Field label="Manager" value={project.manager_name} />
                  <Field label="Status" value={PROJECT_STATUS_LABELS[project.status]} />
                </dl>
              </>
            ) : projectQuery.isPending ? (
              <div role="status" aria-label="Loading project" className="space-y-3">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No project assigned.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
