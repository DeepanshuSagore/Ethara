"use client";

import Link from "next/link";
import { MapPin, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import type { ProjectUtilization } from "@/types";

export function ProjectCard({ stats }: { stats: ProjectUtilization }) {
  const { project, headcount, seated, home_zone: homeZone } = stats;
  const seatedPct = headcount === 0 ? 0 : Math.round((seated / headcount) * 100);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full transition-shadow group-hover:shadow-overlay">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate group-hover:text-primary">{project.name}</CardTitle>
            <CardDescription className="line-clamp-1">{project.description}</CardDescription>
          </div>
          <Badge variant="success">Active</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <UserRound className="size-3.5" aria-hidden="true" />
              {project.manager_name}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden="true" />
              Floor {homeZone[0]} · Zone {homeZone[1]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-metric text-2xl font-semibold">{formatNumber(headcount)}</p>
              <p className="text-xs text-muted-foreground">people</p>
            </div>
            <div>
              <p className="text-metric text-2xl font-semibold">{formatNumber(seated)}</p>
              <p className="text-xs text-muted-foreground">seats allocated</p>
            </div>
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Team seated</span>
              <span className="text-metric">{seatedPct}%</span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${seatedPct}% of the team has a seat`}
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${seatedPct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
