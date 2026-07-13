import { cn, formatNumber } from "@/lib/utils";
import { SEAT_STATUS_LABELS } from "@/components/seats/seat-status-badge";
import type { SeatStatus } from "@/types";

const SWATCHES: Record<SeatStatus, string> = {
  AVAILABLE: "border-success/50 bg-success/15",
  OCCUPIED: "border-transparent bg-accent",
  RESERVED: "border-warning/50 bg-warning/15",
  MAINTENANCE: "border-border bg-muted",
};

interface SeatLegendProps {
  counts: Record<SeatStatus, number>;
  className?: string;
}

/** Status legend with live counts — statuses are never encoded by color alone. */
export function SeatLegend({ counts, className }: SeatLegendProps) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-5 gap-y-2 text-sm", className)}>
      {(Object.keys(SWATCHES) as SeatStatus[]).map((status) => (
        <li key={status} className="flex items-center gap-2">
          <span
            className={cn("size-3.5 rounded border", SWATCHES[status])}
            aria-hidden="true"
          />
          <span className="text-muted-foreground">
            {SEAT_STATUS_LABELS[status]}{" "}
            <span className="text-metric font-medium text-foreground">
              {formatNumber(counts[status])}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
