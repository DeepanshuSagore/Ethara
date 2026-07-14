"use client";

import Link from "next/link";
import { CircleCheck, CirclePause, Flag, MapPin, UserRound, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import type { ProjectStatus, ProjectUtilization } from "@/types";

/* Status is never color-alone: each badge pairs its tint with a label and a
   leading icon, and the badge is bound to the live project.status field. */
const STATUS_BADGES: Record<
  ProjectStatus,
  { label: string; variant: "success" | "warning" | "info"; icon: LucideIcon }
> = {
  ACTIVE: { label: "Active", variant: "success", icon: CircleCheck },
  ON_HOLD: { label: "On hold", variant: "warning", icon: CirclePause },
  COMPLETED: { label: "Completed", variant: "info", icon: Flag },
};

export function ProjectCard({ stats }: { stats: ProjectUtilization }) {
  const { project, headcount, seated, home_zone: homeZone } = stats;
  const seatedPct = headcount === 0 ? 0 : Math.round((seated / headcount) * 100);
  const status = STATUS_BADGES[project.status];
  const StatusIcon = status.icon;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="h-full transition-[box-shadow,border-color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:border-accent-solid/30 group-hover:shadow-raised">
        <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
          <div className="min-w-0 space-y-1">
            <CardTitle
              as="h2"
              className="truncate transition-colors duration-150 group-hover:text-accent-solid"
            >
              {project.name}
            </CardTitle>
            <CardDescription className="line-clamp-1">{project.description}</CardDescription>
          </div>
          <Badge variant={status.variant} className="shrink-0">
            <StatusIcon className="size-3" aria-hidden="true" />
            {status.label}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1.5">
              <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate" title={project.manager_name}>
                {project.manager_name}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              Floor {homeZone[0]} · Zone {homeZone[1]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="font-mono text-metric text-2xl font-semibold">
                {formatNumber(headcount)}
              </p>
              <p className="text-xs text-muted-foreground">people</p>
            </div>
            <div>
              <p className="font-mono text-metric text-2xl font-semibold">
                {formatNumber(seated)}
              </p>
              <p className="text-xs text-muted-foreground">seats allocated</p>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-baseline justify-between text-xs text-muted-foreground">
              <span>Team seated</span>
              <span className="font-mono text-metric">{seatedPct}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Share of the team with a seat"
              aria-valuenow={seatedPct}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
            >
              {/* scaleX + bar-grow: compositor-friendly sweep to the live value. */}
              <div
                className="h-full w-full origin-left animate-bar-grow rounded-full bg-accent-solid transition-transform duration-200 ease-out"
                style={{ transform: `scaleX(${seatedPct / 100})` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
