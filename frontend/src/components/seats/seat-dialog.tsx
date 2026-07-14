"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RotateCcw } from "lucide-react";
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
import type { Seat } from "@/types";

interface SeatDialogProps {
  /** The clicked seat, straight from the map's already-fetched floor list —
      rendered immediately as placeholder while the detail query refreshes,
      so the dialog opens at its final size (no skeleton flash, no re-center
      jump when the fetch lands). */
  seat: Seat | null;
  onOpenChange: (open: boolean) => void;
  /** Controlled dialogs have no Radix trigger to restore focus to on close —
      the seat map uses this to send focus back to the opening seat cell. */
  onCloseAutoFocus?: (event: Event) => void;
}

export function SeatDialog({ seat: seatProp, onOpenChange, onCloseAutoFocus }: SeatDialogProps) {
  const { role } = useRole();
  const { toast } = useToast();
  const [selectedJoiner, setSelectedJoiner] = React.useState("");

  const seatId = seatProp?.id ?? null;

  // A joiner picked but never allocated must not carry over to another seat —
  // reset during render when the target seat changes (React's recommended
  // alternative to a setState-in-effect).
  const [lastSeatId, setLastSeatId] = React.useState(seatId);
  if (seatId !== lastSeatId) {
    setLastSeatId(seatId);
    setSelectedJoiner("");
  }

  // Fetch the seat itself so the open dialog reflects allocate/release
  // immediately (mutations invalidate this query along with everything else).
  // The list object stands in while the fetch is in flight.
  const seatQuery = useQuery({
    queryKey: ["seats", "detail", seatId],
    queryFn: ({ signal }) => getSeat(seatId as number, signal),
    enabled: seatId !== null,
    placeholderData: seatProp ?? undefined,
  });

  // Keep the last real seat on screen through the close animation — without
  // this the content snaps back to the loading skeleton while fading out.
  const lastSeatRef = React.useRef<Seat | null>(null);
  if (seatQuery.data) lastSeatRef.current = seatQuery.data;
  const seat = seatQuery.data ?? (seatId === null ? lastSeatRef.current : undefined);

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
            description: `${seat.seat_code} is available again. ${name} no longer holds it.`,
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
      <DialogContent className="max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        {!seat ? (
          seatQuery.isError ? (
            <>
              <DialogHeader>
                <DialogTitle>Seat unavailable</DialogTitle>
                <DialogDescription>
                  We could not load this seat&apos;s details. Try again, or close and
                  pick the seat once more.
                </DialogDescription>
              </DialogHeader>
              <p className="wrap-break-word font-mono text-xs text-muted-foreground">
                {errorMessage(seatQuery.error)}
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button onClick={() => seatQuery.refetch()}>
                  <RotateCcw /> Try again
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>Loading seat…</DialogTitle>
                <DialogDescription>Fetching the latest seat details.</DialogDescription>
              </DialogHeader>
              {/* Mirrors the loaded layout — title row with badge, occupant
                  panel, two-button footer — so the dialog doesn't jump. */}
              <div role="status" aria-label="Loading seat details" className="grid gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-5 w-28 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-56 max-w-full" />
                </div>
                <div className="space-y-2 rounded-lg border border-border bg-muted/60 p-4">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Skeleton className="h-10 w-full sm:w-20" />
                  <Skeleton className="h-10 w-full sm:w-32" />
                </div>
              </div>
            </>
          )
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <DialogTitle className="text-metric font-mono text-2xl">
                  {seat.seat_code}
                </DialogTitle>
                <SeatStatusBadge status={seat.status} />
              </div>
              <DialogDescription>
                Floor {seat.floor} · Zone {seat.zone} · Bay {seat.bay} · Seat {seat.seat_number}
              </DialogDescription>
            </DialogHeader>

            {occupant ? (
              <div className="rounded-lg border border-border bg-muted/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Allocated to
                </p>
                {occupantQuery.data ? (
                  <>
                    <Link
                      href={`/employees/${occupantQuery.data.id}`}
                      className="mt-1 inline-block rounded-md font-medium text-accent-solid hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      onClick={() => onOpenChange(false)}
                    >
                      {occupantQuery.data.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-mono text-xs font-medium">
                        {occupantQuery.data.employee_code}
                      </span>{" "}
                      · {projectsById.get(occupant.allocation.project_id)?.name}
                    </p>
                  </>
                ) : (
                  <div role="status" aria-label="Loading occupant" className="mt-1 space-y-1.5">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Allocated {formatDate(occupant.allocation.allocation_date)}
                </p>
              </div>
            ) : seat.status === "AVAILABLE" ? (
              canManage ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Allocate to a pending new joiner</p>
                  {pendingJoinersQuery.isError ? (
                    // An error is not an empty queue — say so, and offer retry.
                    <div className="flex items-start gap-2 rounded-lg border border-destructive-strong/20 bg-destructive-soft p-3">
                      <AlertTriangle
                        className="mt-0.5 size-4 shrink-0 text-destructive-strong"
                        aria-hidden="true"
                      />
                      <div className="space-y-2">
                        <p className="text-sm text-destructive-strong">
                          Could not load the pending joiner queue.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => pendingJoinersQuery.refetch()}
                        >
                          <RotateCcw /> Try again
                        </Button>
                      </div>
                    </div>
                  ) : pendingJoinersQuery.isPending ? (
                    // Same height as the select trigger it resolves into.
                    <Skeleton
                      className="h-10 w-full"
                      role="status"
                      aria-label="Loading the pending joiner queue"
                    />
                  ) : pendingJoiners.length > 0 ? (
                    <Select value={selectedJoiner} onValueChange={setSelectedJoiner}>
                      <SelectTrigger aria-label="Select new joiner">
                        <SelectValue placeholder="Select new joiner" />
                      </SelectTrigger>
                      <SelectContent>
                        {pendingJoiners.map((joiner) => (
                          <SelectItem key={joiner.id} value={String(joiner.id)}>
                            {joiner.name} · {projectsById.get(joiner.project_id)?.name}
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
