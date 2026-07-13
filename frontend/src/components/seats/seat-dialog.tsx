"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { SeatStatusBadge } from "@/components/seats/seat-status-badge";
import { useRole } from "@/lib/demo-role";
import { useMockData } from "@/lib/mock/store";
import { formatDate } from "@/lib/utils";

interface SeatDialogProps {
  seatId: number | null;
  onOpenChange: (open: boolean) => void;
}

export function SeatDialog({ seatId, onOpenChange }: SeatDialogProps) {
  const { seatsById, occupantBySeat, projectsById, pendingJoiners, allocateSeat, releaseSeat } =
    useMockData();
  const { role } = useRole();
  const { toast } = useToast();
  const [selectedJoiner, setSelectedJoiner] = React.useState("");

  // Look the seat up live so the dialog reflects allocate/release immediately.
  const seat = seatId !== null ? seatsById.get(seatId) : undefined;
  const occupant = seat ? occupantBySeat.get(seat.id) : undefined;
  const canManage = role === "Admin" || role === "HR";

  const handleAllocate = () => {
    if (!seat || !selectedJoiner) return;
    const joiner = pendingJoiners.find((j) => j.id === Number(selectedJoiner));
    const result = allocateSeat(Number(selectedJoiner), seat.id);
    toast(
      result.ok
        ? {
            title: "Seat allocated",
            description: `${joiner?.name ?? "Employee"} is now seated at ${seat.seat_code} on Floor ${seat.floor}.`,
          }
        : { title: "Allocation failed", description: result.error, variant: "destructive" }
    );
    if (result.ok) setSelectedJoiner("");
  };

  const handleRelease = () => {
    if (!seat || !occupant) return;
    const name = occupant.employee.name;
    const result = releaseSeat(seat.id);
    toast(
      result.ok
        ? {
            title: "Seat released",
            description: `${seat.seat_code} is available again — ${name} no longer holds it.`,
          }
        : { title: "Release failed", description: result.error, variant: "destructive" }
    );
  };

  return (
    <Dialog open={seatId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {seat && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <DialogTitle className="text-metric text-2xl">{seat.seat_code}</DialogTitle>
                <SeatStatusBadge status={seat.status} />
              </div>
              <DialogDescription>
                Floor {seat.floor} · Zone {seat.zone} · Bay {seat.bay} · Seat {seat.seat_number}
              </DialogDescription>
            </DialogHeader>

            {occupant ? (
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Allocated to
                </p>
                <Link
                  href={`/employees/${occupant.employee.id}`}
                  className="mt-1 block font-semibold hover:underline"
                  onClick={() => onOpenChange(false)}
                >
                  {occupant.employee.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {occupant.employee.employee_code} ·{" "}
                  {projectsById.get(occupant.allocation.project_id)?.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Allocated {formatDate(occupant.allocation.allocation_date)}
                </p>
              </div>
            ) : seat.status === "AVAILABLE" ? (
              canManage ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Allocate to a pending new joiner</p>
                  {pendingJoiners.length > 0 ? (
                    <Select value={selectedJoiner} onValueChange={setSelectedJoiner}>
                      <SelectTrigger aria-label="Select new joiner">
                        <SelectValue placeholder="Select new joiner" />
                      </SelectTrigger>
                      <SelectContent>
                        {pendingJoiners.map((joiner) => (
                          <SelectItem key={joiner.id} value={String(joiner.id)}>
                            {joiner.name} — {projectsById.get(joiner.project_id)?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No new joiners are waiting for a seat.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This seat is free. Switch to the Admin or HR role to allocate it.
                </p>
              )
            ) : (
              <p className="text-sm text-muted-foreground">
                {seat.status === "RESERVED"
                  ? "Reserved seats cannot be allocated until their status is changed."
                  : "This seat is under maintenance and cannot be allocated."}
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {canManage && occupant && (
                <Button variant="destructive" onClick={handleRelease}>
                  Release seat
                </Button>
              )}
              {canManage && !occupant && seat.status === "AVAILABLE" && (
                <Button onClick={handleAllocate} disabled={!selectedJoiner}>
                  Allocate seat
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
