"use client";

import * as React from "react";
import { Lock, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SEAT_STATUS_LABELS } from "@/components/seats/seat-status-badge";
import type { Seat, SeatStatus } from "@/types";

/**
 * Per-status cell recipe — status is encoded by fill vs outline (plus icons),
 * never hue alone, so the map survives grayscale. Available pops as an
 * outlined actionable cell; occupied (the majority state) stays subdued and
 * off the accent token, which is reserved for selection/hover surfaces.
 *
 * The legend imports this map so the key always matches the cells it explains.
 */
export const SEAT_STATUS_STYLES: Record<SeatStatus, string> = {
  AVAILABLE: "border-[1.5px] border-success bg-card text-foreground",
  OCCUPIED: "border border-transparent bg-muted text-muted-foreground",
  RESERVED: "border border-warning-strong/25 bg-warning-soft text-warning-strong",
  MAINTENANCE: "border border-dashed border-input bg-card text-muted-foreground",
};

/** Reserved/maintenance carry a glyph beside the number — never color-only. */
export const SEAT_STATUS_ICONS: Partial<Record<SeatStatus, LucideIcon>> = {
  RESERVED: Lock,
  MAINTENANCE: Wrench,
};

interface SeatCellProps {
  seat: Seat;
  onSelect: (seat: Seat) => void;
  /** Roving tabindex — the zone grid keeps exactly one tabbable cell. */
  tabIndex?: number;
  /** Lets the zone grid track which cell holds the roving tab stop. */
  onFocus?: React.FocusEventHandler<HTMLButtonElement>;
  /** True while this seat's dialog is open (drives data-state=open styling). */
  isOpen?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

// The occupant's name is looked up lazily in the seat dialog rather than
// per-cell — with 1,120 seats per floor, resolving every occupant up front
// would mean loading all 5,000 employees for tooltips alone.
export function SeatCell({
  seat,
  onSelect,
  tabIndex,
  onFocus,
  isOpen = false,
  ref,
}: SeatCellProps) {
  const label = `Seat ${seat.seat_code}, Floor ${seat.floor}, ${SEAT_STATUS_LABELS[seat.status]}`;
  const Icon = SEAT_STATUS_ICONS[seat.status];

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelect(seat)}
      onFocus={onFocus}
      tabIndex={tabIndex}
      title={label}
      aria-label={label}
      data-seat-id={seat.id}
      data-state={isOpen ? "open" : "closed"}
      className={cn(
        // 44px touch target on phones, 36px in the dense desktop grid.
        "text-metric flex size-11 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg font-mono text-xs font-medium leading-none transition-colors duration-150 md:size-9",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // Hover hints interactivity; the open-dialog seat keeps a ring while
        // its dialog is up so the map shows what the dialog describes.
        "data-[state=closed]:hover:ring-1 data-[state=closed]:hover:ring-accent-solid data-[state=open]:ring-2 data-[state=open]:ring-ring",
        SEAT_STATUS_STYLES[seat.status]
      )}
    >
      {Icon && <Icon className="size-3" aria-hidden="true" />}
      {seat.seat_number}
    </button>
  );
}
