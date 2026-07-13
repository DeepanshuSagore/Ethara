"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { ErrorState } from "@/components/layout/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeatCell } from "@/components/seats/seat-cell";
import { SeatDialog } from "@/components/seats/seat-dialog";
import { SeatLegend } from "@/components/seats/seat-legend";
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
  const canManage = role === "Admin" || role === "HR";

  // One floor at a time, filtered server-side (?floor=) — each floor holds
  // 1,120 of the 5,600 seats, so we never pull the whole building at once.
  const seatsQuery = useSeats({ floor });
  const floorSeats = React.useMemo(() => seatsQuery.data ?? [], [seatsQuery.data]);

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
        title="Seats"
        description={
          canManage
            ? "Click any seat to view details, allocate a new joiner or release it."
            : "Click any seat to see who sits there. Switch to Admin/HR to manage allocations."
        }
      />

      <Tabs value={String(floor)} onValueChange={(value) => setFloor(Number(value))}>
        {/* Five floor triggers overflow a phone viewport — scroll, don't clip. */}
        <TabsList className="max-w-full justify-start overflow-x-auto">
          {FLOORS.map((f) => (
            <TabsTrigger key={f} value={String(f)}>
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
            <FloorSkeleton />
          ) : floorSeats.length === 0 ? (
            <Card>
              <CardContent className="p-0">
                <EmptyState
                  icon={AlertTriangle}
                  title="No seats on this floor"
                  description="The seat inventory returned nothing for this floor."
                  action={
                    <Button variant="outline" onClick={() => seatsQuery.refetch()}>
                      <RotateCcw /> Refresh
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <SeatLegend counts={counts} className="mb-4" />

              <div className="grid gap-4 lg:grid-cols-2">
                {ZONES.map((zone) => {
                  const bays = byZone.get(zone);
                  const zoneSeats = bays
                    ? [...bays.values()].reduce((n, seats) => n + seats.length, 0)
                    : 0;
                  const zoneAvailable = bays
                    ? [...bays.values()]
                        .flat()
                        .filter((s) => s.status === "AVAILABLE").length
                    : 0;
                  return (
                    <Card key={zone}>
                      <CardHeader>
                        <CardTitle>Zone {zone}</CardTitle>
                        <CardDescription>
                          {zoneAvailable} of {zoneSeats} seats available
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[...(bays ?? new Map<number, Seat[]>()).entries()]
                          .sort(([a], [b]) => a - b)
                          .map(([bay, baySeats]) => (
                            <div key={bay} className="flex items-center gap-3">
                              <span className="w-12 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Bay {bay}
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {baySeats.map((seat) => (
                                  <SeatCell
                                    key={seat.id}
                                    seat={seat}
                                    onSelect={(s) => setSelectedSeatId(s.id)}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
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
      />
    </>
  );
}

/** In-tab loading shape while a floor's 1,120 seats fetch. */
function FloorSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading floor…</span>
      <div className="mb-4 mt-1 flex flex-wrap items-center gap-x-5 gap-y-2">
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className="flex items-center gap-2">
            <Skeleton className="size-3.5 rounded" />
            <Skeleton className="h-4 w-20" />
          </span>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {ZONES.map((zone) => (
          <Card key={zone}>
            <CardHeader>
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 8 }, (_, bay) => (
                <div key={bay} className="flex items-center gap-3">
                  <Skeleton className="h-3 w-12 shrink-0" />
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: 7 }, (_, seat) => (
                      <Skeleton key={seat} className="size-9 rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
