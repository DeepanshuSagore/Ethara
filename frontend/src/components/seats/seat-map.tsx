"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { List, Map as MapIcon, RotateCcw, Sofa } from "lucide-react";
import { ErrorState } from "@/components/layout/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PROJECT_CELL_TONES,
  SEAT_STATUS_STYLES,
} from "@/components/seats/seat-cell";
import { SeatDialog } from "@/components/seats/seat-dialog";
import { SeatLegend } from "@/components/seats/seat-legend";
import { SeatListView } from "@/components/seats/seat-list";
import { SeatMapSkeleton } from "@/components/seats/seat-map-skeleton";
import { ZoneGrid, type MapLens } from "@/components/seats/zone-grid";
import { errorMessage } from "@/lib/api/client";
import {
  useFloorUtilization,
  useProjects,
  useSeatIndex,
  useSeats,
} from "@/lib/api/hooks";
import { useRole } from "@/lib/demo-role";
import { FLOORS, ZONES } from "@/lib/constants";
import { cn, formatNumber } from "@/lib/utils";
import type { Seat, SeatStatus } from "@/types";

/* Zone occupancy strips reuse the app-wide status hues (analytics floor bars,
   dashboard utilization donut) so status color reads identically everywhere. */
const ZONE_SEGMENTS: { key: SeatStatus; className: string }[] = [
  { key: "OCCUPIED", className: "bg-accent-solid" },
  { key: "AVAILABLE", className: "bg-success" },
  { key: "RESERVED", className: "bg-warning" },
  { key: "MAINTENANCE", className: "bg-muted-foreground" },
];

/** Spatial map for orientation; filterable list for inventory work and AT. */
type SeatView = "map" | "list";

interface FloorProject {
  id: number;
  name: string;
  count: number;
  tone: number;
}

export function SeatMap() {
  const { role } = useRole();
  const searchParams = useSearchParams();

  const floorParam = Number(searchParams.get("floor"));
  const initialFloor = (FLOORS as readonly number[]).includes(floorParam)
    ? floorParam
    : FLOORS[0];

  const [floor, setFloor] = React.useState(initialFloor);
  const [lens, setLens] = React.useState<MapLens>("status");
  // ?view= survives refresh/share so a facilities person can bookmark the list.
  const [view, setView] = React.useState<SeatView>(
    searchParams.get("view") === "list" ? "list" : "map"
  );
  const [spotlight, setSpotlight] = React.useState<SeatStatus | null>(null);
  const [selectedSeat, setSelectedSeat] = React.useState<Seat | null>(null);
  // Survives the dialog's close (selectedSeat is null by then) so focus can
  // return to the cell that opened it.
  const lastSeatIdRef = React.useRef<number | null>(null);
  const canManage = role === "Admin" || role === "HR";

  // Warm the occupant register (allocations + full seat inventory) while the
  // user is still looking at the map, so the seat dialog can name occupants
  // on first paint instead of resolving them after it opens. The same index
  // also powers the project lens and the hover tooltips.
  const { occupantBySeat, isLoading: registerLoading } = useSeatIndex();
  const { data: projects } = useProjects();
  const floorUtilization = useFloorUtilization();

  // One floor at a time, filtered server-side (?floor=) — each floor holds
  // 1,120 of the 5,600 seats, so we never pull the whole building at once.
  const seatsQuery = useSeats({ floor });
  const floorSeats = React.useMemo(() => seatsQuery.data ?? [], [seatsQuery.data]);

  // Keep ?floor= in sync so refresh/back/shared links restore the same floor.
  // Native replaceState integrates with the Next.js router (shallow update).
  const handleFloorChange = (value: string) => {
    setFloor(Number(value));
    const params = new URLSearchParams(window.location.search);
    params.set("floor", value);
    window.history.replaceState(null, "", `?${params.toString()}`);
  };

  const handleViewChange = (value: SeatView) => {
    setView(value);
    const params = new URLSearchParams(window.location.search);
    params.set("view", value);
    window.history.replaceState(null, "", `?${params.toString()}`);
  };

  const occupancyByFloor = React.useMemo(
    () => new Map((floorUtilization.data ?? []).map((s) => [s.floor, s.occupancy_pct])),
    [floorUtilization.data]
  );

  const { counts, byZone } = React.useMemo(() => {
    const counts: Record<SeatStatus, number> = {
      AVAILABLE: 0,
      OCCUPIED: 0,
      RESERVED: 0,
      MAINTENANCE: 0,
    };
    // zone → bay → seats, in seat_number order (the API returns id order).
    const byZone = new Map<string, Map<number, Seat[]>>();
    for (const seat of floorSeats) {
      counts[seat.status]++;
      let bays = byZone.get(seat.zone);
      if (!bays) byZone.set(seat.zone, (bays = new Map()));
      let baySeats = bays.get(seat.bay);
      if (!baySeats) bays.set(seat.bay, (baySeats = []));
      baySeats.push(seat);
    }
    return { counts, byZone };
  }, [floorSeats]);

  // seat id → occupant's project (name for tooltips, tone for the lens),
  // plus the floor's project roster for the lens legend, largest team first.
  const { seatMeta, floorProjects } = React.useMemo(() => {
    const projectsById = new Map((projects ?? []).map((p) => [p.id, p]));
    const seatMeta = new Map<number, { name: string; tone: number }>();
    const counts = new Map<number, number>();
    for (const seat of floorSeats) {
      const occupant = occupantBySeat.get(seat.id);
      if (!occupant) continue;
      const projectId = occupant.allocation.project_id;
      seatMeta.set(seat.id, {
        name: projectsById.get(projectId)?.name ?? `Project ${projectId}`,
        tone: projectId % PROJECT_CELL_TONES.length,
      });
      counts.set(projectId, (counts.get(projectId) ?? 0) + 1);
    }
    const floorProjects: FloorProject[] = [...counts.entries()]
      .map(([id, count]) => ({
        id,
        count,
        name: projectsById.get(id)?.name ?? `Project ${id}`,
        tone: id % PROJECT_CELL_TONES.length,
      }))
      .sort((a, b) => b.count - a.count);
    return { seatMeta, floorProjects };
  }, [floorSeats, occupantBySeat, projects]);

  // One shared tooltip for all 1,120 cells, driven by event delegation and
  // direct style writes — zero React re-renders on hover. Cells keep full
  // aria-labels, so AT never depends on this layer.
  const tipRef = React.useRef<HTMLDivElement>(null);
  const moveTip = (target: EventTarget | null) => {
    const tip = tipRef.current;
    if (!tip) return;
    const cell = target instanceof Element ? target.closest<HTMLElement>("[data-tip]") : null;
    if (!cell) {
      tip.style.opacity = "0";
      return;
    }
    const rect = cell.getBoundingClientRect();
    tip.textContent = cell.dataset.tip ?? "";
    const half = tip.offsetWidth / 2;
    const x = Math.min(
      Math.max(rect.left + rect.width / 2, half + 8),
      window.innerWidth - half - 8
    );
    tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(rect.top - 8)}px) translate(-50%, -100%)`;
    tip.style.opacity = "1";
  };

  const lensReady = !registerLoading && (projects?.length ?? 0) > 0;

  // Portal target exists only client-side; the tooltip is decorative anyway.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Seats"
        description={
          canManage
            ? "Click any seat to view details, allocate a new joiner or release it."
            : "Click any seat to see who sits there. Switch to Admin/HR to manage allocations."
        }
      />

      <Tabs value={String(floor)} onValueChange={handleFloorChange}>
        {/* Five floor triggers overflow a phone viewport — scroll, don't clip. */}
        <TabsList className="max-w-full snap-x justify-start overflow-x-auto">
          {FLOORS.map((f) => {
            const pct = occupancyByFloor.get(f);
            return (
              <TabsTrigger key={f} value={String(f)} className="snap-start gap-1.5">
                Floor {f}
                {pct != null && (
                  <span className="text-metric font-mono text-[10px] font-medium text-muted-foreground">
                    {pct}%
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={String(floor)}>
          {seatsQuery.isError ? (
            <ErrorState
              title="Could not load the seat map"
              description="The Ethara API did not respond. Check that the backend is running, then try again."
              detail={errorMessage(seatsQuery.error)}
              onRetry={() => seatsQuery.refetch()}
            />
          ) : seatsQuery.isPending ? (
            <SeatMapSkeleton scope="floor" />
          ) : floorSeats.length === 0 ? (
            // Not an error — the API answered with an empty inventory, so the
            // icon chip keeps the standard accent tone.
            <Card>
              <CardContent className="p-0">
                <EmptyState
                  icon={Sofa}
                  title="No seats on this floor"
                  description="The seat inventory returned nothing for this floor."
                  action={
                    <Button variant="outline" onClick={() => seatsQuery.refetch()}>
                      <RotateCcw /> Try again
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                {view === "list" ? (
                  <span aria-hidden="true" />
                ) : lens === "status" ? (
                  <SeatLegend counts={counts} spotlight={spotlight} onSpotlight={setSpotlight} />
                ) : (
                  <ProjectLegend items={floorProjects} />
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {view === "map" && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Color by</span>
                      <div
                        role="group"
                        aria-label="Color seats by"
                        className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5"
                      >
                        {(
                          [
                            { value: "status", label: "Status" },
                            { value: "project", label: "Project" },
                          ] as const
                        ).map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={lens === value}
                            disabled={value === "project" && !lensReady}
                            onClick={() => setLens(value)}
                            className={cn(
                              "cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
                              lens === value
                                ? "bg-card text-foreground shadow-soft"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div
                    role="group"
                    aria-label="View"
                    className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5"
                  >
                    {(
                      [
                        { value: "map", label: "Map", icon: MapIcon },
                        { value: "list", label: "List", icon: List },
                      ] as const
                    ).map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={view === value}
                        onClick={() => handleViewChange(value)}
                        className={cn(
                          "flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          view === value
                            ? "bg-card text-foreground shadow-soft"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="size-3.5" aria-hidden="true" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {view === "list" ? (
                <SeatListView
                  key={floor}
                  seats={floorSeats}
                  seatMeta={seatMeta}
                  occupantBySeat={occupantBySeat}
                  onSelect={(seat) => {
                    lastSeatIdRef.current = seat.id;
                    setSelectedSeat(seat);
                  }}
                />
              ) : (
              <div
                className="grid grid-cols-1 gap-4 xl:grid-cols-2"
                onMouseOver={(e) => moveTip(e.target)}
                onMouseLeave={() => moveTip(null)}
                onFocus={(e) => moveTip(e.target)}
                onBlur={() => moveTip(null)}
              >
                {ZONES.map((zone) => {
                  const bays = byZone.get(zone);
                  const sortedBays = [...(bays ?? new Map<number, Seat[]>()).entries()].sort(
                    ([a], [b]) => a - b
                  );
                  const zoneSeatList = sortedBays.flatMap(([, seats]) => seats);
                  const zoneSeats = zoneSeatList.length;
                  const zoneAvailable = zoneSeatList.filter(
                    (s) => s.status === "AVAILABLE"
                  ).length;
                  return (
                    <Card key={zone}>
                      <CardHeader>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <CardTitle as="h2">Zone {zone}</CardTitle>
                          {zoneSeats > 0 && (
                            <CardDescription className="text-metric font-mono text-xs">
                              {zoneAvailable} / {zoneSeats} available
                            </CardDescription>
                          )}
                        </div>
                        {/* Zone occupancy at a glance — same segment hues as
                            the analytics floor bars. Numbers live in the
                            description and legend, so this strip is décor. */}
                        {zoneSeats > 0 && (
                          <div
                            aria-hidden="true"
                            className="flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-muted"
                          >
                            {ZONE_SEGMENTS.map(({ key, className }) => {
                              const share =
                                (zoneSeatList.filter((s) => s.status === key).length /
                                  zoneSeats) *
                                100;
                              if (share === 0) return null;
                              return (
                                <span key={key} className={className} style={{ width: `${share}%` }} />
                              );
                            })}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent>
                        {zoneSeats === 0 ? (
                          <EmptyState
                            icon={Sofa}
                            title={`No seats in Zone ${zone}`}
                            description="The inventory has no seats for this zone on this floor."
                            className="py-10"
                          />
                        ) : (
                          <ZoneGrid
                            key={`${floor}-${zone}`}
                            zone={zone}
                            bays={sortedBays}
                            lens={lens}
                            spotlight={spotlight}
                            seatMeta={seatMeta}
                            selectedSeatId={selectedSeat?.id ?? null}
                            onSelect={(seat) => {
                              lastSeatIdRef.current = seat.id;
                              setSelectedSeat(seat);
                            }}
                          />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Shared cell tooltip — positioned via direct style writes; portaled
          to <body> so no animated ancestor can become its containing block,
          and fixed so the bay rows' overflow scroll can't clip it. */}
      {mounted &&
        createPortal(
          <div
            ref={tipRef}
            aria-hidden="true"
            className="text-metric pointer-events-none fixed left-0 top-0 z-50 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 font-mono text-xs font-medium text-popover-foreground opacity-0 shadow-overlay transition-opacity duration-100"
          />,
          document.body
        )}

      <SeatDialog
        seat={selectedSeat}
        onOpenChange={(open) => {
          if (!open) setSelectedSeat(null);
        }}
        onCloseAutoFocus={(event) => {
          // No Radix trigger exists to restore focus to — send it back to
          // the seat cell that opened the dialog instead of <body>.
          if (lastSeatIdRef.current == null) return;
          const cell = document.querySelector<HTMLButtonElement>(
            `[data-seat-id="${lastSeatIdRef.current}"]`
          );
          if (cell) {
            event.preventDefault();
            cell.focus();
          }
        }}
      />
    </>
  );
}

/**
 * Project-lens key: the floor's teams by seat count (largest first), plus the
 * outlined Available swatch so free seats stay explained. Swatches reuse the
 * exact cell recipes, so the key always matches the map.
 */
function ProjectLegend({ items }: { items: FloorProject[] }) {
  const shown = items.slice(0, 6);
  const more = items.length - shown.length;
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      {shown.map((project) => (
        <li key={project.id} className="flex h-5 items-center gap-2">
          <span
            className={cn("size-4 shrink-0 rounded-lg", PROJECT_CELL_TONES[project.tone])}
            aria-hidden="true"
          />
          <span className="text-muted-foreground">
            {project.name}{" "}
            <span className="text-metric font-mono font-medium text-foreground">
              {formatNumber(project.count)}
            </span>
          </span>
        </li>
      ))}
      <li className="flex h-5 items-center gap-2">
        <span
          className={cn("size-4 shrink-0 rounded-lg", SEAT_STATUS_STYLES.AVAILABLE)}
          aria-hidden="true"
        />
        <span className="text-muted-foreground">Available</span>
      </li>
      {more > 0 && <li className="text-xs text-muted-foreground">+{more} more</li>}
    </ul>
  );
}

