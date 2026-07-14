"use client";

import Link from "next/link";
import {
  AlertTriangle,
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
import { PageHeader, SectionHeading } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLoading from "@/app/(dashboard)/loading";
import { errorMessage } from "@/lib/api/client";
import {
  useDashboardSummary,
  useFloorUtilization,
  usePendingJoiners,
  useProjects,
  useProjectUtilization,
} from "@/lib/api/hooks";
import { cn, formatDate, formatNumber } from "@/lib/utils";

/* Queue-row skeleton widths — keep in sync with app/(dashboard)/loading.tsx. */
const QUEUE_NAME_WIDTHS = ["w-32", "w-40", "w-28", "w-36"];
const QUEUE_META_WIDTHS = ["w-44", "w-36", "w-48", "w-40"];

/* Seat-status hues shared with the seat-map legend and the analytics floor
   bars (occupied=accent, available=success, reserved=warning, maintenance=
   neutral). One array feeds both the donut arcs and the legend rows. */
const UTILIZATION_BREAKDOWN = [
  { label: "Occupied", key: "occupied", dot: "bg-accent-solid", stroke: "var(--accent-solid)" },
  { label: "Available", key: "available", dot: "bg-success", stroke: "var(--success)" },
  { label: "Reserved", key: "reserved", dot: "bg-warning", stroke: "var(--warning)" },
  {
    label: "Maintenance",
    key: "maintenance",
    dot: "bg-muted-foreground",
    stroke: "var(--muted-foreground)",
  },
] as const;

/**
 * Legend share percentages that sum to exactly 100. Rounding each share
 * independently drifts (88 + 10 + 2 + 1 = 101 on the seeded data): Occupied
 * is anchored to the API's utilization_pct so it always matches the donut
 * center, and the remaining three split the leftover by largest remainder.
 */
function breakdownShares(metrics: {
  total_seats: number;
  utilization_pct: number;
  available: number;
  reserved: number;
  maintenance: number;
}): Record<"occupied" | "available" | "reserved" | "maintenance", number> {
  const total = metrics.total_seats;
  if (!total) return { occupied: 0, available: 0, reserved: 0, maintenance: 0 };
  const rest = ["available", "reserved", "maintenance"] as const;
  const raw = rest.map((key) => (metrics[key] / total) * 100);
  const shares = raw.map(Math.floor);
  let leftover = 100 - metrics.utilization_pct - shares.reduce((sum, n) => sum + n, 0);
  const byFraction = raw
    .map((value, i) => ({ i, fraction: value - shares[i] }))
    .sort((a, b) => b.fraction - a.fraction);
  for (const { i } of byFraction) {
    if (leftover <= 0) break;
    shares[i] += 1;
    leftover -= 1;
  }
  return {
    occupied: metrics.utilization_pct,
    available: shares[0],
    reserved: shares[1],
    maintenance: shares[2],
  };
}

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
          eyebrow="Overview"
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
  const shares = breakdownShares(metrics);
  const projectsById = new Map((projects.data ?? []).map((p) => [p.id, p]));
  const joiners = pendingJoiners.data ?? [];
  const seatsPerFloor = floorUtilization.data[0]?.total ?? 0;
  const queueFailed = pendingJoiners.isError || projects.isError;

  /* Raw numbers, not formatted strings — StatCard counts them up on load.
     Each KPI carries its own tone so the row reads as six distinct signals. */
  const stats = [
    {
      label: "Total Employees",
      value: metrics.total_employees,
      icon: Users,
      hint: `across ${projectUtilization.data.length} projects`,
      tone: "sky",
    },
    {
      label: "Total Seats",
      value: metrics.total_seats,
      icon: Armchair,
      hint: `${floorUtilization.data.length} floors · ${floorUtilization.data.length * 2} zones`,
      tone: "violet",
    },
    {
      label: "Occupied",
      value: metrics.occupied,
      icon: DoorOpen,
      hint: `${metrics.utilization_pct}% utilization`,
      tone: "cyan",
    },
    {
      label: "Available",
      value: metrics.available,
      icon: CircleCheck,
      hint: "ready to allocate",
      tone: "emerald",
    },
    {
      label: "Reserved / Maintenance",
      value: metrics.reserved + metrics.maintenance,
      icon: Lock,
      hint: "blocked from allocation",
      tone: "amber",
    },
    {
      label: "Pending Allocation",
      value: metrics.pending_joiners,
      icon: UserPlus,
      hint: "new joiners awaiting seats",
      tone: "rose",
    },
  ] as const;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Live overview of seats, occupancy and allocation across Ethara."
        actions={
          <Badge variant="outline" className="whitespace-nowrap">
            {/* Sonar pulse — currentColor drives the ring, so text-success
                colors dot and halo together. */}
            <span
              className="animate-pulse-dot size-1.5 shrink-0 rounded-full bg-success text-success"
              aria-hidden="true"
            />
            <span className="sr-only">Live</span>
            Live API
            <span className="hidden text-muted-foreground md:inline">
              · recomputed on every allocation
            </span>
          </Badge>
        }
      />

      <SectionHeading index="01" title="Capacity" />
      <div className="stagger-children grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <SectionHeading index="02" title="Allocation" className="pt-8" />
      <div className="grid gap-4 lg:grid-cols-3">
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
            {/* Segmented part-of-whole donut + status breakdown: same hues as
                the seat map legend and the analytics floor bars, so status
                reads identically app-wide. Arc colors and legend dots come
                from one array so they can never drift apart. */}
            <CardContent className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              <DonutStat
                pct={metrics.utilization_pct}
                label="occupied"
                size={124}
                segments={UTILIZATION_BREAKDOWN.map(({ key, stroke }) => ({
                  value: metrics[key],
                  stroke,
                }))}
              />
              <dl className="min-w-40 space-y-2.5">
                {UTILIZATION_BREAKDOWN.map(({ label, key, dot }) => (
                  <div key={key} className="flex items-center gap-2">
                    <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span
                        aria-hidden="true"
                        className={cn("size-2 shrink-0 rounded-full", dot)}
                      />
                      {label}
                    </dt>
                    <dd className="text-metric ml-auto font-mono text-sm font-medium">
                      {formatNumber(metrics[key])}
                      <span className="text-muted-foreground"> · {shares[key]}%</span>
                    </dd>
                  </div>
                ))}
              </dl>
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
              <Button asChild>
                <Link href="/new-joiners">View queue</Link>
              </Button>
            </CardHeader>
            <CardContent aria-live="polite">
              {queueFailed ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive-strong/20 bg-destructive-soft px-3 py-2.5">
                  <p className="flex items-center gap-2 text-sm text-destructive-strong">
                    <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                    Could not load the pending queue.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (pendingJoiners.isError) void pendingJoiners.refetch();
                      if (projects.isError) void projects.refetch();
                    }}
                  >
                    Retry
                  </Button>
                </div>
              ) : pendingJoiners.isPending ? (
                <div
                  role="status"
                  aria-label="Loading the pending queue…"
                  className="-mx-2 space-y-1"
                >
                  {QUEUE_NAME_WIDTHS.map((width, i) => (
                    <div key={width} className="px-2 py-1.5">
                      <Skeleton className={cn("h-5", width)} />
                      <Skeleton className={cn("mt-0.5 h-4", QUEUE_META_WIDTHS[i])} />
                    </div>
                  ))}
                </div>
              ) : joiners.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CircleCheck className="size-4 shrink-0 text-success" aria-hidden="true" />
                  Queue is clear. Every new joiner has a seat.
                </p>
              ) : (
                <ul className="-mx-2 space-y-1">
                  {joiners.slice(0, 4).map((joiner) => {
                    const projectName = projectsById.get(joiner.project_id)?.name;
                    return (
                      <li key={joiner.id}>
                        <Link
                          href={`/employees/${joiner.id}`}
                          className="block cursor-pointer rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <span className="block truncate text-sm font-medium">
                            {joiner.name}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {projectName ? `${projectName} · ` : ""}joined{" "}
                            <time className="font-mono" dateTime={joiner.joining_date}>
                              {formatDate(joiner.joining_date)}
                            </time>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <SectionHeading index="03" title="Floor occupancy" className="pt-8" />
      <Card>
        <CardHeader>
          <CardTitle>Floor-wise occupancy</CardTitle>
          <CardDescription>
            Occupied seats per floor (of {formatNumber(seatsPerFloor)} each)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BarList
            max={100}
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
