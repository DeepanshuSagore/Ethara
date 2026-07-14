"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { RotateCcw, Sofa } from "lucide-react";
import { ErrorState } from "@/components/layout/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeatCell } from "@/components/seats/seat-cell";
import { SeatDialog } from "@/components/seats/seat-dialog";
import { SeatLegend } from "@/components/seats/seat-legend";
import { SeatMapSkeleton } from "@/components/seats/seat-map-skeleton";
import { errorMessage } from "@/lib/api/client";
import { useSeats } from "@/lib/api/hooks";
import { useRole } from "@/lib/demo-role";
import { FLOORS, ZONES } from "@/lib/constants";
import type { Seat, SeatStatus } from "@/types";

export function SeatMap() {
  const { role } = useRole();
  const searchParams = useSearchParams();

  const floorParam = Number(searchParams.get("floor"));
  const initialFloor = (FLOORS as readonly number[]).includes(floorParam)
    ? floorParam
    : FLOORS[0];

  const [floor, setFloor] = React.useState(initialFloor);
  const [selectedSeatId, setSelectedSeatId] = React.useState<number | null>(null);
  // Survives the dialog's close (selectedSeatId is null by then) so focus can
  // return to the cell that opened it.
  const lastSeatIdRef = React.useRef<number | null>(null);
  const canManage = role === "Admin" || role === "HR";

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
          {FLOORS.map((f) => (
            <TabsTrigger key={f} value={String(f)} className="snap-start">
              Floor {f}
            </TabsTrigger>
          ))}
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
              <SeatLegend counts={counts} className="mb-4" />

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {ZONES.map((zone) => {
                  const bays = byZone.get(zone);
                  const sortedBays = [...(bays ?? new Map<number, Seat[]>()).entries()].sort(
                    ([a], [b]) => a - b
                  );
                  const zoneSeats = sortedBays.reduce((n, [, seats]) => n + seats.length, 0);
                  const zoneAvailable = sortedBays
                    .flatMap(([, seats]) => seats)
                    .filter((s) => s.status === "AVAILABLE").length;
                  return (
                    <Card key={zone}>
                      <CardHeader>
                        <CardTitle as="h2">Zone {zone}</CardTitle>
                        {zoneSeats > 0 && (
                          <CardDescription className="text-metric font-mono text-xs">
                            {zoneAvailable} / {zoneSeats} available
                          </CardDescription>
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
                            selectedSeatId={selectedSeatId}
                            onSelect={(seat) => {
                              lastSeatIdRef.current = seat.id;
                              setSelectedSeatId(seat.id);
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

      <SeatDialog
        seatId={selectedSeatId}
        onOpenChange={(open) => {
          if (!open) setSelectedSeatId(null);
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

interface ZoneGridProps {
  zone: string;
  /** Bay entries sorted by bay number; each row holds that bay's seats. */
  bays: [number, Seat[]][];
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
function ZoneGrid({ zone, bays, selectedSeatId, onSelect }: ZoneGridProps) {
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
    // p-1/-m-1 gives focus rings room to draw inside the scroll clip.
    <div
      role="grid"
      aria-label={`Zone ${zone} seat map`}
      onKeyDown={handleKeyDown}
      className="-m-1 space-y-3 overflow-x-auto p-1"
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
            {baySeats.map((seat, colIndex) => (
              <span key={seat.id} role="gridcell">
                <SeatCell
                  seat={seat}
                  onSelect={onSelect}
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
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
