"use client";

import Link from "next/link";
import {
  Armchair,
  CircleCheck,
  DoorOpen,
  Lock,
  UserPlus,
  Users,
} from "lucide-react";
import { BarList } from "@/components/charts/bar-list";
import { DonutStat } from "@/components/charts/donut-stat";
import { StatCard } from "@/components/charts/stat-card";
import { ErrorState } from "@/components/layout/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLoading from "@/app/(dashboard)/loading";
import { errorMessage } from "@/lib/api/client";
import {
  useDashboardSummary,
  useFloorUtilization,
  usePendingJoiners,
  useProjects,
  useProjectUtilization,
} from "@/lib/api/hooks";
import { formatDate, formatNumber } from "@/lib/utils";

export function DashboardScreen() {
  const summary = useDashboardSummary();
  const projectUtilization = useProjectUtilization();
  const floorUtilization = useFloorUtilization();
  const pendingJoiners = usePendingJoiners();
  const projects = useProjects();

  if (summary.isError || projectUtilization.isError || floorUtilization.isError) {
    const error =
      summary.error ?? projectUtilization.error ?? floorUtilization.error;
    return (
      <>
        <PageHeader
          title="Dashboard"
          description="Live overview of seats, occupancy and allocation across Ethara."
        />
        <ErrorState
          title="Could not load dashboard metrics"
          description="The Ethara API did not respond. Check that the backend is running, then try again."
          detail={errorMessage(error)}
          onRetry={() => {
            summary.refetch();
            projectUtilization.refetch();
            floorUtilization.refetch();
          }}
        />
      </>
    );
  }

  if (!summary.data || !projectUtilization.data || !floorUtilization.data) {
    return <DashboardLoading />;
  }

  const metrics = summary.data;
  const projectsById = new Map((projects.data ?? []).map((p) => [p.id, p]));
  const joiners = pendingJoiners.data ?? [];
  const seatsPerFloor = floorUtilization.data[0]?.total ?? 0;

  const stats = [
    {
      label: "Total Employees",
      value: formatNumber(metrics.total_employees),
      icon: Users,
      hint: `across ${projectUtilization.data.length} projects`,
    },
    {
      label: "Total Seats",
      value: formatNumber(metrics.total_seats),
      icon: Armchair,
      hint: `${floorUtilization.data.length} floors · ${floorUtilization.data.length * 2} zones`,
    },
    {
      label: "Occupied",
      value: formatNumber(metrics.occupied),
      icon: DoorOpen,
      hint: `${metrics.utilization_pct}% utilization`,
    },
    {
      label: "Available",
      value: formatNumber(metrics.available),
      icon: CircleCheck,
      hint: "ready to allocate",
    },
    {
      label: "Reserved / Maintenance",
      value: formatNumber(metrics.reserved + metrics.maintenance),
      icon: Lock,
      hint: "blocked from allocation",
    },
    {
      label: "Pending Allocation",
      value: formatNumber(metrics.pending_joiners),
      icon: UserPlus,
      hint: "new joiners awaiting seats",
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live overview of seats, occupancy and allocation across Ethara."
        actions={<Badge variant="outline">Live API · recomputed on every allocation</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Project-wise allocation</CardTitle>
            <CardDescription>Headcount and allocated seats per project</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              items={projectUtilization.data.map((stat) => ({
                key: String(stat.project.id),
                label: stat.project.name,
                value: stat.headcount,
                displayValue: `${formatNumber(stat.headcount)} people · ${formatNumber(stat.seated)} seats`,
                href: `/projects/${stat.project.id}`,
              }))}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Seat utilization</CardTitle>
              <CardDescription>Occupied share of all seats</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center pb-8">
              <DonutStat pct={metrics.utilization_pct} label="occupied" />
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="space-y-1.5">
                <CardTitle>New joiners pending</CardTitle>
                <CardDescription>
                  {formatNumber(metrics.pending_joiners)} awaiting seat allocation
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/new-joiners">View queue</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {joiners.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CircleCheck className="size-4 shrink-0 text-success" aria-hidden="true" />
                  {pendingJoiners.isPending
                    ? "Loading the queue…"
                    : "Queue is clear — every new joiner has a seat."}
                </p>
              ) : (
                joiners.slice(0, 4).map((joiner) => (
                  <div key={joiner.id} className="flex items-center justify-between gap-3 text-sm">
                    <Link
                      href={`/employees/${joiner.id}`}
                      className="truncate font-medium hover:underline"
                    >
                      {joiner.name}
                    </Link>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {projectsById.get(joiner.project_id)?.name} · joined{" "}
                      {formatDate(joiner.joining_date)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Floor-wise occupancy</CardTitle>
          <CardDescription>
            Occupied seats per floor (of {formatNumber(seatsPerFloor)} each)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BarList
            items={floorUtilization.data.map((stat) => ({
              key: String(stat.floor),
              label: `Floor ${stat.floor}`,
              value: stat.occupancy_pct,
              displayValue: `${formatNumber(stat.occupied)} / ${formatNumber(stat.total)} · ${stat.occupancy_pct}%`,
              secondary: `${formatNumber(stat.available)} available · ${formatNumber(stat.reserved)} reserved · ${formatNumber(stat.maintenance)} maintenance`,
            }))}
          />
        </CardContent>
      </Card>
    </>
  );
}
