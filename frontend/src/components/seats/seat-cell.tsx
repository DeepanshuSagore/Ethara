"use client";

import { Lock, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { SEAT_STATUS_LABELS } from "@/components/seats/seat-status-badge";
import type { Seat } from "@/types";

interface SeatCellProps {
  seat: Seat;
  onSelect: (seat: Seat) => void;
}

// Occupied is the majority state, so it stays subdued; available pops
// (it's the actionable state). Reserved/maintenance add an icon so status
// is never color-alone.
const STYLES: Record<Seat["status"], string> = {
  AVAILABLE:
    "border-success/50 bg-success/15 text-success hover:bg-success/25 dark:bg-success/20",
  OCCUPIED: "border-transparent bg-accent text-accent-foreground hover:bg-accent/70",
  RESERVED: "border-warning/50 bg-warning/15 text-warning hover:bg-warning/25 dark:bg-warning/20",
  MAINTENANCE: "border-border bg-muted text-muted-foreground hover:bg-muted/70",
};

// The occupant's name is looked up lazily in the seat dialog rather than
// per-cell — with 1,120 seats per floor, resolving every occupant up front
// would mean loading all 5,000 employees for tooltips alone.
export function SeatCell({ seat, onSelect }: SeatCellProps) {
  const label = `Seat ${seat.seat_code}, Floor ${seat.floor}, ${SEAT_STATUS_LABELS[seat.status]}`;

  return (
    <button
      type="button"
      onClick={() => onSelect(seat)}
      title={label}
      aria-label={label}
      className={cn(
        "text-metric flex size-9 items-center justify-center rounded-lg border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        STYLES[seat.status]
      )}
    >
      {seat.status === "RESERVED" ? (
        <Lock className="size-3.5" aria-hidden="true" />
      ) : seat.status === "MAINTENANCE" ? (
        <Wrench className="size-3.5" aria-hidden="true" />
      ) : (
        seat.seat_number
      )}
    </button>
  );
}
