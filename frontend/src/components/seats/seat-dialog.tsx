"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { SeatStatusBadge } from "@/components/seats/seat-status-badge";
import { errorMessage } from "@/lib/api/client";
import { getSeat } from "@/lib/api/seats";
import {
  useAllocateSeat,
  useEmployee,
  usePendingJoiners,
  useProjects,
  useReleaseSeat,
  useSeatIndex,
} from "@/lib/api/hooks";
import { useRole } from "@/lib/demo-role";
import { formatDate } from "@/lib/utils";

interface SeatDialogProps {
  seatId: number | null;
  onOpenChange: (open: boolean) => void;
}

export function SeatDialog({ seatId, onOpenChange }: SeatDialogProps) {
  const { role } = useRole();
  const { toast } = useToast();
  const [selectedJoiner, setSelectedJoiner] = React.useState("");

  // Fetch the seat itself so the open dialog reflects allocate/release
  // immediately (mutations invalidate this query along with everything else).
  const seatQuery = useQuery({
    queryKey: ["seats", "detail", seatId],
    queryFn: ({ signal }) => getSeat(seatId as number, signal),
    enabled: seatId !== null,
  });
  const seat = seatQuery.data;

  const { occupantBySeat } = useSeatIndex();
  const occupant = seat ? occupantBySeat.get(seat.id) : undefined;
  const occupantQuery = useEmployee(occupant?.employeeId ?? 0);

  const pendingJoinersQuery = usePendingJoiners();
  const { data: projects } = useProjects();
  const projectsById = new Map((projects ?? []).map((p) => [p.id, p]));
  const pendingJoiners = pendingJoinersQuery.data ?? [];

  const allocate = useAllocateSeat();
  const release = useReleaseSeat();
  const canManage = role === "Admin" || role === "HR";

  const handleAllocate = () => {
    if (!seat || !selectedJoiner) return;
    const joiner = pendingJoiners.find((j) => j.id === Number(selectedJoiner));
    allocate.mutate(
      { employeeId: Number(selectedJoiner), seatId: seat.id },
      {
        onSuccess: () => {
          toast({
            title: "Seat allocated",
            description: `${joiner?.name ?? "Employee"} is now seated at ${seat.seat_code} on Floor ${seat.floor}.`,
          });
          setSelectedJoiner("");
        },
        onError: (error) =>
          // 409 details name the violated rule (already seated / not available).
          toast({
            title: "Allocation failed",
            description: errorMessage(error),
            variant: "destructive",
          }),
      }
    );
  };

  const handleRelease = () => {
    if (!seat || !occupant) return;
    const name = occupantQuery.data?.name ?? "the occupant";
    release.mutate(
      { seatId: seat.id },
      {
        onSuccess: () =>
          toast({
            title: "Seat released",
            description: `${seat.seat_code} is available again — ${name} no longer holds it.`,
          }),
        onError: (error) =>
          toast({
            title: "Release failed",
            description: errorMessage(error),
            variant: "destructive",
          }),
      }
    );
  };

  return (
    <Dialog open={seatId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {!seat ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {seatQuery.isError ? "Seat unavailable" : "Loading seat…"}
              </DialogTitle>
              <DialogDescription>
                {seatQuery.isError
                  ? errorMessage(seatQuery.error)
                  : "Fetching the latest seat details."}
              </DialogDescription>
            </DialogHeader>
            {!seatQuery.isError && (
              <div className="space-y-3" aria-busy="true">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-9 w-full" />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
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
                {occupantQuery.data ? (
                  <>
                    <Link
                      href={`/employees/${occupantQuery.data.id}`}
                      className="mt-1 block font-semibold hover:underline"
                      onClick={() => onOpenChange(false)}
                    >
                      {occupantQuery.data.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {occupantQuery.data.employee_code} ·{" "}
                      {projectsById.get(occupant.allocation.project_id)?.name}
                    </p>
                  </>
                ) : (
                  <Skeleton className="mt-1 h-5 w-40" />
                )}
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
                      {pendingJoinersQuery.isPending
                        ? "Loading the pending queue…"
                        : "No new joiners are waiting for a seat."}
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
                  : seat.status === "MAINTENANCE"
                    ? "This seat is under maintenance and cannot be allocated."
                    : "Refreshing the occupant register…"}
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {canManage && occupant && (
                <Button
                  variant="destructive"
                  onClick={handleRelease}
                  disabled={release.isPending}
                >
                  {release.isPending ? "Releasing…" : "Release seat"}
                </Button>
              )}
              {canManage && !occupant && seat.status === "AVAILABLE" && (
                <Button
                  onClick={handleAllocate}
                  disabled={!selectedJoiner || allocate.isPending}
                >
                  {allocate.isPending ? "Allocating…" : "Allocate seat"}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
