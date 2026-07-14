import { cn, formatNumber } from "@/lib/utils";
import { SEAT_STATUS_STYLES } from "@/components/seats/seat-cell";
import { SEAT_STATUS_LABELS } from "@/components/seats/seat-status-badge";
import type { SeatStatus } from "@/types";

interface SeatLegendProps {
  counts: Record<SeatStatus, number>;
  className?: string;
}

/**
 * Status key with live counts. Swatches consume the exact seat-cell recipe
 * (single source of truth in seat-cell.tsx) so the key always matches the
 * map — statuses are never encoded by color alone.
 */
export function SeatLegend({ counts, className }: SeatLegendProps) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-5 gap-y-2 text-sm", className)}>
      {(Object.keys(SEAT_STATUS_STYLES) as SeatStatus[]).map((status) => (
        <li key={status} className="flex h-5 items-center gap-2">
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
        </li>
      ))}
    </ul>
  );
}
