"use client";

import { cn, formatNumber } from "@/lib/utils";
import { SEAT_STATUS_STYLES } from "@/components/seats/seat-cell";
import { SEAT_STATUS_LABELS } from "@/components/seats/seat-status-badge";
import type { SeatStatus } from "@/types";

interface SeatLegendProps {
  counts: Record<SeatStatus, number>;
  /** Currently spotlit status — the map dims every other status. */
  spotlight?: SeatStatus | null;
  /** Present ⇒ legend chips become spotlight toggles. */
  onSpotlight?: (status: SeatStatus | null) => void;
  className?: string;
}

/**
 * Status key with live counts. Swatches consume the exact seat-cell recipe
 * (single source of truth in seat-cell.tsx) so the key always matches the
 * map — statuses are never encoded by color alone. With onSpotlight the
 * chips toggle a focus mode: pick "Reserved" and the map dims everything
 * else (press again to clear).
 */
export function SeatLegend({ counts, spotlight, onSpotlight, className }: SeatLegendProps) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-2 gap-y-2 text-sm", className)}>
      {(Object.keys(SEAT_STATUS_STYLES) as SeatStatus[]).map((status) => {
        const body = (
          <>
            <span
              className={cn("size-4 shrink-0 rounded-lg", SEAT_STATUS_STYLES[status])}
              aria-hidden="true"
            />
            <span className="text-muted-foreground">
              {SEAT_STATUS_LABELS[status]}{" "}
              <span className="text-metric font-mono font-medium text-foreground">
                {formatNumber(counts[status])}
              </span>
            </span>
          </>
        );
        return (
          <li key={status} className="flex h-6 items-center">
            {onSpotlight ? (
              <button
                type="button"
                aria-pressed={spotlight === status}
                onClick={() => onSpotlight(spotlight === status ? null : status)}
                className={cn(
                  "flex h-6 cursor-pointer items-center gap-2 rounded-lg px-1.5 transition-colors duration-150 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  spotlight === status && "bg-accent ring-1 ring-accent-solid/40"
                )}
              >
                {body}
                <span className="sr-only">
                  {spotlight === status ? ", spotlighted, press to clear" : ", press to spotlight on the map"}
                </span>
              </button>
            ) : (
              <span className="flex items-center gap-2 px-1.5">{body}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
