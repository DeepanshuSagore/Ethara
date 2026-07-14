"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { RotateCcw, Sofa } from "lucide-react";
import { ErrorState } from "@/components/layout/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PROJECT_CELL_TONES,
  SEAT_STATUS_STYLES,
  SeatCell,
} from "@/components/seats/seat-cell";
import { SeatDialog } from "@/components/seats/seat-dialog";
import { SeatLegend } from "@/components/seats/seat-legend";
import { SeatMapSkeleton } from "@/components/seats/seat-map-skeleton";
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

/** How cells are colored: by seat status, or by the occupant's project. */
type MapLens = "status" | "project";

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
                {lens === "status" ? (
                  <SeatLegend counts={counts} />
                ) : (
                  <ProjectLegend items={floorProjects} />
                )}
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
              </div>

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

interface ZoneGridProps {
  zone: string;
  /** Bay entries sorted by bay number; each row holds that bay's seats. */
  bays: [number, Seat[]][];
  lens: MapLens;
  /** seat id → occupant's project name + tone (occupied seats only). */
  seatMeta: Map<number, { name: string; tone: number }>;
  selectedSeatId: number | null;
  onSelect: (seat: Seat) => void;
}

/**
 * Roving-tabindex grid (WAI-ARIA grid pattern): one tab stop per zone, arrow
 * keys move seat focus (left/right within a bay row, up/down across bays),
 * Home/End jump within the row, and Enter/Space keep the native button
 * activation that opens the seat dialog. Below md the whole bay list scrolls
 * horizontally so every bay stays one 7-across line.
 */
function ZoneGrid({ zone, bays, lens, seatMeta, selectedSeatId, onSelect }: ZoneGridProps) {
  const [pos, setPos] = React.useState<[number, number]>([0, 0]);
  const cellRefs = React.useRef(new Map<string, HTMLButtonElement>());

  // Clamp against the current data so a refetch can never strand the tab stop.
  const focusRow = Math.min(pos[0], bays.length - 1);
  const focusCol = Math.min(pos[1], bays[focusRow][1].length - 1);

  const focusCell = (row: number, col: number) => {
    const cell = cellRefs.current.get(`${row}:${col}`);
    if (!cell) return;
    setPos([row, col]);
    cell.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    let next: [number, number] | null = null;
    switch (event.key) {
      case "ArrowRight":
        next = [focusRow, Math.min(focusCol + 1, bays[focusRow][1].length - 1)];
        break;
      case "ArrowLeft":
        next = [focusRow, Math.max(focusCol - 1, 0)];
        break;
      case "ArrowDown": {
        const row = Math.min(focusRow + 1, bays.length - 1);
        next = [row, Math.min(focusCol, bays[row][1].length - 1)];
        break;
      }
      case "ArrowUp": {
        const row = Math.max(focusRow - 1, 0);
        next = [row, Math.min(focusCol, bays[row][1].length - 1)];
        break;
      }
      case "Home":
        next = [focusRow, 0];
        break;
      case "End":
        next = [focusRow, bays[focusRow][1].length - 1];
        break;
      default:
        return;
    }
    event.preventDefault();
    focusCell(next[0], next[1]);
  };

  return (
    // p-1/-m-1 gives focus rings room to draw inside the scroll clip;
    // stagger-children rises the bay rows in on mount/floor switch.
    <div
      role="grid"
      aria-label={`Zone ${zone} seat map`}
      onKeyDown={handleKeyDown}
      className="stagger-children -m-1 space-y-3 overflow-x-auto p-1"
    >
      {bays.map(([bay, baySeats], rowIndex) => (
        <div key={bay} role="row" className="flex w-max min-w-full items-center gap-3">
          <span
            role="rowheader"
            className="sticky left-0 z-10 flex w-12 shrink-0 items-center self-stretch bg-card text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Bay {bay}
          </span>
          <div role="presentation" className="flex gap-2 md:gap-1.5">
            {baySeats.map((seat, colIndex) => {
              const meta = seatMeta.get(seat.id);
              return (
                <span key={seat.id} role="gridcell">
                  <SeatCell
                    seat={seat}
                    onSelect={onSelect}
                    projectName={meta?.name}
                    projectTone={lens === "project" ? (meta?.tone ?? null) : null}
                    dimmed={
                      lens === "project" &&
                      (seat.status === "RESERVED" || seat.status === "MAINTENANCE")
                    }
                    isOpen={selectedSeatId === seat.id}
                    tabIndex={focusRow === rowIndex && focusCol === colIndex ? 0 : -1}
                    onFocus={() => setPos([rowIndex, colIndex])}
                    ref={(el) => {
                      const key = `${rowIndex}:${colIndex}`;
                      if (el) cellRefs.current.set(key, el);
                      else cellRefs.current.delete(key);
                    }}
                  />
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
