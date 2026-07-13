"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeatCell } from "@/components/seats/seat-cell";
import { SeatDialog } from "@/components/seats/seat-dialog";
import { SeatLegend } from "@/components/seats/seat-legend";
import { useRole } from "@/lib/demo-role";
import { BAYS_PER_ZONE, FLOORS, ZONES } from "@/lib/mock/data";
import { useMockData } from "@/lib/mock/store";
import type { Seat, SeatStatus } from "@/types";

export function SeatMap() {
  const { seats, occupantBySeat } = useMockData();
  const { role } = useRole();
  const searchParams = useSearchParams();

  const floorParam = Number(searchParams.get("floor"));
  const initialFloor = (FLOORS as readonly number[]).includes(floorParam) ? floorParam : FLOORS[0];

  const [selectedSeatId, setSelectedSeatId] = React.useState<number | null>(null);
  const canManage = role === "Admin" || role === "HR";

  const seatsByFloor = React.useMemo(() => {
    const byFloor = new Map<number, Seat[]>();
    for (const floor of FLOORS) byFloor.set(floor, []);
    for (const seat of seats) byFloor.get(seat.floor)?.push(seat);
    return byFloor;
  }, [seats]);

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

      <Tabs defaultValue={String(initialFloor)}>
        <TabsList>
          {FLOORS.map((floor) => (
            <TabsTrigger key={floor} value={String(floor)}>
              Floor {floor}
            </TabsTrigger>
          ))}
        </TabsList>

        {FLOORS.map((floor) => {
          const floorSeats = seatsByFloor.get(floor) ?? [];
          const counts: Record<SeatStatus, number> = {
            AVAILABLE: 0,
            OCCUPIED: 0,
            RESERVED: 0,
            MAINTENANCE: 0,
          };
          for (const seat of floorSeats) counts[seat.status]++;

          return (
            <TabsContent key={floor} value={String(floor)}>
              <SeatLegend counts={counts} className="mb-4" />

              <div className="grid gap-4 lg:grid-cols-2">
                {ZONES.map((zone) => {
                  const zoneSeats = floorSeats.filter((seat) => seat.zone === zone);
                  return (
                    <Card key={zone}>
                      <CardHeader>
                        <CardTitle>Zone {zone}</CardTitle>
                        <CardDescription>
                          {zoneSeats.filter((s) => s.status === "AVAILABLE").length} of{" "}
                          {zoneSeats.length} seats available
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {Array.from({ length: BAYS_PER_ZONE }, (_, i) => i + 1).map((bay) => (
                          <div key={bay} className="flex items-center gap-3">
                            <span className="w-12 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Bay {bay}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {zoneSeats
                                .filter((seat) => seat.bay === bay)
                                .map((seat) => (
                                  <SeatCell
                                    key={seat.id}
                                    seat={seat}
                                    occupantName={occupantBySeat.get(seat.id)?.employee.name}
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
            </TabsContent>
          );
        })}
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
