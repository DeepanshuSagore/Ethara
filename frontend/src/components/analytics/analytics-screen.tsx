"use client";

import { BadgeCheck, Gauge, Layers, UserRoundMinus } from "lucide-react";
import { BarList } from "@/components/charts/bar-list";
import { StatCard } from "@/components/charts/stat-card";
import { ErrorState } from "@/components/layout/error-state";
import { PageHeader, SectionHeading } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AnalyticsLoading from "@/app/(dashboard)/analytics/loading";
import { errorMessage } from "@/lib/api/client";
import { useFloorUtilization, useProjectUtilization } from "@/lib/api/hooks";
import { cn, formatNumber } from "@/lib/utils";
import type { ProjectUtilization } from "@/types";

/* Stacked-bar segments per floor. Order = left-to-right; identity is carried
   by the legend and the per-row numbers, never hue alone. */
const FLOOR_SEGMENTS = [
  { key: "occupied", label: "Occupied", className: "bg-accent-solid" },
  { key: "available", label: "Available", className: "bg-success" },
  { key: "reserved", label: "Reserved", className: "bg-warning" },
  { key: "maintenance", label: "Maintenance", className: "bg-muted-foreground" },
] as const;

const seatedPct = (stat: ProjectUtilization) =>
  stat.headcount === 0 ? 0 : Math.round((stat.seated / stat.headcount) * 100);

export function AnalyticsScreen() {
  const projectUtilization = useProjectUtilization();
  const floorUtilization = useFloorUtilization();

  const header = (
    <PageHeader
      eyebrow="Insights"
      title="Analytics"
      description="Deeper utilization charts by project, floor and team."
    />
  );

  if (projectUtilization.isError || floorUtilization.isError) {
    return (
      <>
        {header}
        <ErrorState
          title="Could not load analytics"
          description="The Ethara API did not respond. Check that the backend is running, then try again."
          detail={errorMessage(projectUtilization.error ?? floorUtilization.error)}
          onRetry={() => {
            if (projectUtilization.isError) void projectUtilization.refetch();
            if (floorUtilization.isError) void floorUtilization.refetch();
          }}
        />
      </>
    );
  }

  if (!projectUtilization.data || !floorUtilization.data) {
    return <AnalyticsLoading />;
  }

  const projects = projectUtilization.data;
  const floors = floorUtilization.data;

  /* Derived signals — the aggregates the dashboard doesn't show. */
  const staffed = projects.filter((stat) => stat.headcount > 0);
  const avgSeated = staffed.length
    ? Math.round(
        staffed.reduce((sum, stat) => sum + (stat.seated / stat.headcount) * 100, 0) /
          staffed.length
      )
    : 0;
  const fullySeated = staffed.filter((stat) => stat.seated >= stat.headcount).length;
  const unseated = projects.reduce(
    (sum, stat) => sum + Math.max(0, stat.headcount - stat.seated),
    0
  );
  const occupancies = floors.map((stat) => stat.occupancy_pct);
  const spread = floors.length
    ? `${Math.min(...occupancies)}–${Math.max(...occupancies)}%`
    : "—";

  const signals = [
    {
      label: "Avg team seated",
      value: avgSeated,
      format: (v: number) => `${Math.round(v)}%`,
      icon: Gauge,
      hint: "mean share of each team with a seat",
    },
    {
      label: "Fully seated projects",
      value: fullySeated,
      icon: BadgeCheck,
      hint: `of ${formatNumber(staffed.length)} staffed projects`,
    },
    {
      label: "People without a seat",
      value: unseated,
      icon: UserRoundMinus,
      hint: "headcount minus allocated seats",
    },
    {
      label: "Floor occupancy spread",
      value: spread,
      icon: Layers,
      hint: "quietest vs busiest floor",
    },
  ];

  return (
    <>
      {header}

      <SectionHeading index="01" title="Signals" />
      <div className="stagger-children grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {signals.map((signal) => (
          <StatCard key={signal.label} {...signal} />
        ))}
      </div>

      <SectionHeading index="02" title="Project coverage" className="pt-8" />
      <Card>
        <CardHeader>
          <CardTitle>Seating coverage by project</CardTitle>
          <CardDescription>
            Share of each team with an allocated seat — lowest coverage first
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BarList
            max={100}
            emptyMessage="No projects in the directory yet."
            items={[...projects]
              .sort((a, b) => seatedPct(a) - seatedPct(b))
              .map((stat) => ({
                key: String(stat.project.id),
                label: stat.project.name,
                value: seatedPct(stat),
                displayValue: `${formatNumber(stat.seated)} / ${formatNumber(stat.headcount)} seated · ${seatedPct(stat)}%`,
                href: `/projects/${stat.project.id}`,
              }))}
          />
        </CardContent>
      </Card>

      <SectionHeading index="03" title="Floor composition" className="pt-8" />
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-x-4 gap-y-2 space-y-0">
          <div className="space-y-1.5">
            <CardTitle>Seat status by floor</CardTitle>
            <CardDescription>How each floor&apos;s seats split across statuses</CardDescription>
          </div>
          {/* Legend is presentational — every row narrates its own numbers. */}
          <div aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
            {FLOOR_SEGMENTS.map((segment) => (
              <span
                key={segment.key}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span className={cn("size-2 shrink-0 rounded-full", segment.className)} />
                {segment.label}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ol className="stagger-children space-y-4">
            {floors.map((stat) => (
              <li key={stat.floor}>
                {/* One aria-label carries the real values; role="img" makes the
                    visuals inside presentational, so AT hears the data once. */}
                <div
                  role="img"
                  aria-label={`Floor ${stat.floor}: ${stat.occupancy_pct}% occupied — ${formatNumber(stat.occupied)} occupied, ${formatNumber(stat.available)} available, ${formatNumber(stat.reserved)} reserved, ${formatNumber(stat.maintenance)} in maintenance, of ${formatNumber(stat.total)} seats`}
                  className="px-1 py-0.5"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium">Floor {stat.floor}</span>
                    <span className="text-metric shrink-0 font-mono text-sm text-muted-foreground">
                      {stat.occupancy_pct}% occupied
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {formatNumber(stat.occupied)} occupied · {formatNumber(stat.available)}{" "}
                    available · {formatNumber(stat.reserved)} reserved ·{" "}
                    {formatNumber(stat.maintenance)} maintenance
                  </p>
                  <div className="mt-1.5 flex h-2.5 w-full gap-px overflow-hidden rounded-full bg-muted">
                    {FLOOR_SEGMENTS.map((segment) => {
                      const share =
                        stat.total === 0 ? 0 : (stat[segment.key] / stat.total) * 100;
                      if (share === 0) return null;
                      return (
                        <span
                          key={segment.key}
                          className={segment.className}
                          style={{ width: `${share}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </>
  );
}
