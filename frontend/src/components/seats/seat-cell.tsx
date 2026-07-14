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

/* Project-lens recipe: occupied cells wear their project's identity tone
   (same id % 6 order as ProjectCard / joiner avatars, so a project keeps one
   hue everywhere). Literal strings keep the Tailwind scanner happy. */
export const PROJECT_CELL_TONES = [
  "border border-tone-sky/45 bg-tone-sky-soft text-tone-sky-strong",
  "border border-tone-violet/45 bg-tone-violet-soft text-tone-violet-strong",
  "border border-tone-emerald/45 bg-tone-emerald-soft text-tone-emerald-strong",
  "border border-tone-amber/45 bg-tone-amber-soft text-tone-amber-strong",
  "border border-tone-rose/45 bg-tone-rose-soft text-tone-rose-strong",
  "border border-tone-cyan/45 bg-tone-cyan-soft text-tone-cyan-strong",
] as const;

/** Reserved/maintenance carry a glyph beside the number — never color-only. */
export const SEAT_STATUS_ICONS: Partial<Record<SeatStatus, LucideIcon>> = {
  RESERVED: Lock,
  MAINTENANCE: Wrench,
};

interface SeatCellProps {
  seat: Seat;
  onSelect: (seat: Seat) => void;
  /** Occupant's project — feeds the tooltip and the aria-label. */
  projectName?: string;
  /** Project-lens tone index (id % 6); null/undefined keeps status styling. */
  projectTone?: number | null;
  /** Project lens: recede reserved/maintenance so team territory reads first. */
  dimmed?: boolean;
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
  projectName,
  projectTone,
  dimmed = false,
  tabIndex,
  onFocus,
  isOpen = false,
  ref,
}: SeatCellProps) {
  const status = SEAT_STATUS_LABELS[seat.status];
  const label = `Seat ${seat.seat_code}, Floor ${seat.floor}, ${status}${
    projectName ? `, ${projectName}` : ""
  }`;
  // Single line consumed by the map's shared hover/focus tooltip.
  const tip = `${seat.seat_code} (${status})${projectName ? ` · ${projectName}` : ""}`;
  const Icon = SEAT_STATUS_ICONS[seat.status];

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelect(seat)}
      onFocus={onFocus}
      tabIndex={tabIndex}
      aria-label={label}
      data-seat-id={seat.id}
      data-tip={tip}
      data-state={isOpen ? "open" : "closed"}
      className={cn(
        // 44px touch target on phones, 36px in the dense desktop grid.
        "text-metric relative flex size-11 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg font-mono text-xs font-medium leading-none transition-[color,background-color,border-color,transform,opacity] duration-150 md:size-9",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // Hover pops the cell forward (compositor-only); the open-dialog seat
        // keeps a ring while its dialog is up so the map shows what the
        // dialog describes.
        "hover:z-10 hover:scale-[1.15] focus-visible:z-10 data-[state=closed]:hover:ring-1 data-[state=closed]:hover:ring-accent-solid data-[state=open]:ring-2 data-[state=open]:ring-ring",
        projectTone != null
          ? PROJECT_CELL_TONES[projectTone % PROJECT_CELL_TONES.length]
          : SEAT_STATUS_STYLES[seat.status],
        dimmed && "opacity-45"
      )}
    >
      {Icon && <Icon className="size-3" aria-hidden="true" />}
      {seat.seat_number}
    </button>
  );
}
