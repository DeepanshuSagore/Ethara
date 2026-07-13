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
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DISPLAY_SCALE } from "@/lib/mock/data";
import { useMockData } from "@/lib/mock/store";
import { formatDate, formatNumber } from "@/lib/utils";

export function DashboardScreen() {
  const { metrics, projectStats, floorStats, pendingJoiners, projectsById } = useMockData();
  const d = metrics.display;

  const stats = [
    {
      label: "Total Employees",
      value: formatNumber(d.totalEmployees),
      icon: Users,
      hint: "across 11 projects",
    },
    {
      label: "Total Seats",
      value: formatNumber(d.totalSeats),
      icon: Armchair,
      hint: "5 floors · 10 zones",
    },
    {
      label: "Occupied",
      value: formatNumber(d.occupied),
      icon: DoorOpen,
      hint: `${metrics.utilizationPct}% utilization`,
    },
    {
      label: "Available",
      value: formatNumber(d.available),
      icon: CircleCheck,
      hint: "ready to allocate",
    },
    {
      label: "Reserved / Maintenance",
      value: formatNumber(d.reserved + d.maintenance),
      icon: Lock,
      hint: "blocked from allocation",
    },
    {
      label: "Pending Allocation",
      value: formatNumber(d.pendingJoiners),
      icon: UserPlus,
      hint: "new joiners awaiting seats",
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live overview of seats, occupancy and allocation across Ethara."
        actions={<Badge variant="outline">Mock data · updates on every allocation</Badge>}
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
              items={projectStats.map((stat) => ({
                key: String(stat.project.id),
                label: stat.project.name,
                value: stat.headcount,
                displayValue: `${formatNumber(stat.headcount * DISPLAY_SCALE)} people · ${formatNumber(stat.seated * DISPLAY_SCALE)} seats`,
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
              <DonutStat pct={metrics.utilizationPct} label="occupied" />
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="space-y-1.5">
                <CardTitle>New joiners pending</CardTitle>
                <CardDescription>
                  {formatNumber(d.pendingJoiners)} awaiting seat allocation
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/new-joiners">View queue</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingJoiners.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CircleCheck className="size-4 shrink-0 text-success" aria-hidden="true" />
                  Queue is clear — every new joiner has a seat.
                </p>
              ) : (
                pendingJoiners.slice(0, 4).map((joiner) => (
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
            Occupied seats per floor (of {formatNumber(d.totalSeats / 5)} each)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BarList
            items={floorStats.map((stat) => ({
              key: String(stat.floor),
              label: `Floor ${stat.floor}`,
              value: stat.occupancyPct,
              displayValue: `${formatNumber(stat.occupied * DISPLAY_SCALE)} / ${formatNumber(stat.total * DISPLAY_SCALE)} · ${stat.occupancyPct}%`,
              secondary: `${formatNumber(stat.available * DISPLAY_SCALE)} available · ${formatNumber(stat.reserved * DISPLAY_SCALE)} reserved · ${formatNumber(stat.maintenance * DISPLAY_SCALE)} maintenance`,
            }))}
          />
        </CardContent>
      </Card>
    </>
  );
}
