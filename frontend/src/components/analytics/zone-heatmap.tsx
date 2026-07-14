"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/client";
import { useProjectUtilization, useSeats } from "@/lib/api/hooks";
import { FLOORS, ZONES } from "@/lib/constants";
import { cn, formatNumber } from "@/lib/utils";

/* Same id % 6 identity order as project cards, joiner avatars and bar lists,
   so a team's dot here matches its hue everywhere else. */
const TEAM_DOTS = [
  "bg-tone-sky",
  "bg-tone-violet",
  "bg-tone-emerald",
  "bg-tone-amber",
  "bg-tone-rose",
  "bg-tone-cyan",
] as const;

/**
 * Sequential tint for a 0-100 occupancy: one hue (the accent), light to dark,
 * on an absolute scale so 80% reads as the same tint on every visit. The
 * exact number is printed in the cell, so hue is reinforcement, not the only
 * encoding.
 */
const cellTint = (pct: number) => ({
  backgroundColor: `color-mix(in srgb, var(--accent-solid) ${Math.round(6 + pct * 0.5)}%, transparent)`,
});

/**
 * Floor × zone occupancy heatmap with each zone's home teams (business rule
 * 5's anchor zones). Answers the two questions the per-floor bars can't:
 * which half of a floor has room, and whose territory it is.
 */
export function ZoneHeatmap() {
  const seatsQuery = useSeats({});
  const projectUtilization = useProjectUtilization();

  const occupancy = React.useMemo(() => {
    const byZone = new Map<string, { total: number; occupied: number }>();
    for (const seat of seatsQuery.data ?? []) {
      const key = `${seat.floor}${seat.zone}`;
      let cell = byZone.get(key);
      if (!cell) byZone.set(key, (cell = { total: 0, occupied: 0 }));
      cell.total++;
      if (seat.status === "OCCUPIED") cell.occupied++;
    }
    return byZone;
  }, [seatsQuery.data]);

  const teamsByZone = React.useMemo(() => {
    const teams = new Map<string, { id: number; name: string }[]>();
    for (const stat of projectUtilization.data ?? []) {
      const list = teams.get(stat.home_zone) ?? [];
      list.push({ id: stat.project.id, name: stat.project.name });
      teams.set(stat.home_zone, list);
    }
    return teams;
  }, [projectUtilization.data]);

  if (seatsQuery.isError) {
    return (
      <div className="space-y-2 py-2">
        <p className="text-sm text-destructive-strong">
          Could not load the seat inventory: {errorMessage(seatsQuery.error)}
        </p>
        <Button variant="outline" size="sm" onClick={() => seatsQuery.refetch()}>
          <RotateCcw /> Try again
        </Button>
      </div>
    );
  }

  if (seatsQuery.isPending) {
    return (
      <div role="status" aria-label="Loading zone occupancy" className="space-y-2">
        {FLOORS.map((floor) => (
          <div key={floor} className="grid grid-cols-[3.5rem_1fr_1fr] gap-2">
            <Skeleton className="h-14 w-12 self-center" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-[3.5rem_1fr_1fr] gap-2">
        {/* Column headers. */}
        <span aria-hidden="true" />
        {ZONES.map((zone) => (
          <span
            key={zone}
            className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Zone {zone}
          </span>
        ))}

        {FLOORS.map((floor) => (
          <React.Fragment key={floor}>
            <span className="self-center text-sm font-medium">Floor {floor}</span>
            {ZONES.map((zone) => {
              const key = `${floor}${zone}`;
              const cell = occupancy.get(key);
              const pct = cell && cell.total > 0 ? Math.round((cell.occupied / cell.total) * 100) : 0;
              const teams = teamsByZone.get(key) ?? [];
              return (
                <div
                  key={zone}
                  role="img"
                  aria-label={`Floor ${floor} Zone ${zone}: ${pct}% occupied, ${formatNumber(
                    cell ? cell.total - cell.occupied : 0
                  )} seats free${teams.length ? `, home zone of ${teams.map((t) => t.name).join(" and ")}` : ""}`}
                  className="rounded-lg border border-border px-3 py-2"
                  style={cellTint(pct)}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-metric font-mono text-sm font-semibold">{pct}%</span>
                    {/* foreground-derived, not muted gray: this text sits on a
                        tinted background, and muted ink loses AA on dark cells. */}
                    <span className="text-metric shrink-0 font-mono text-xs text-foreground/70">
                      {formatNumber(cell ? cell.total - cell.occupied : 0)} free
                    </span>
                  </div>
                  {teams.length > 0 && (
                    <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-foreground/70">
                      {teams.map((team) => (
                        <span key={team.id} className="flex min-w-0 items-center gap-1">
                          <span
                            aria-hidden="true"
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              TEAM_DOTS[team.id % TEAM_DOTS.length]
                            )}
                          />
                          <span className="truncate">{team.name}</span>
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Darker cells are fuller. Listed teams anchor to that zone, so their joiners are
        suggested seats there first.
      </p>
    </div>
  );
}
