"use client";

import Link from "next/link";
import { CircleCheck, CirclePause, Flag, MapPin, UserRound, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";
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

/* Identity tone per project, keyed off its id so the hue is stable across
   screens and reorderings. Differentiation only — status stays in the badge. */
const PROJECT_TONES = [
  { fill: "from-tone-sky/60 to-tone-sky", glow: "dark:shadow-tone-sky/35" },
  { fill: "from-tone-violet/60 to-tone-violet", glow: "dark:shadow-tone-violet/35" },
  { fill: "from-tone-emerald/60 to-tone-emerald", glow: "dark:shadow-tone-emerald/35" },
  { fill: "from-tone-amber/60 to-tone-amber", glow: "dark:shadow-tone-amber/35" },
  { fill: "from-tone-rose/60 to-tone-rose", glow: "dark:shadow-tone-rose/35" },
  { fill: "from-tone-cyan/60 to-tone-cyan", glow: "dark:shadow-tone-cyan/35" },
] as const;

export function ProjectCard({ stats }: { stats: ProjectUtilization }) {
  const { project, headcount, seated, home_zone: homeZone } = stats;
  const seatedPct = headcount === 0 ? 0 : Math.round((seated / headcount) * 100);
  const status = STATUS_BADGES[project.status];
  const StatusIcon = status.icon;
  const tone = PROJECT_TONES[project.id % PROJECT_TONES.length];

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="hover-lift h-full group-hover:border-accent-solid/30">
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
                className={cn(
                  "animate-bar-grow h-full w-full origin-left rounded-full bg-linear-to-r transition-transform duration-200 ease-out dark:shadow-[0_0_10px]",
                  tone.fill,
                  tone.glow
                )}
                style={{ transform: `scaleX(${seatedPct / 100})` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
