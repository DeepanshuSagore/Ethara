import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Shared skeleton blocks for the route-level loading.tsx files. Each mirrors
 * the shape of the real component it stands in for, so the swap from loading
 * to loaded doesn't jump the layout.
 */

export function PageHeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {withAction && <Skeleton className="h-9 w-36" />}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-4 rounded-md" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20" />
        <Skeleton className="mt-2 h-3 w-28" />
      </CardContent>
    </Card>
  );
}

/** Deterministic width cycle so rows look organic without Math.random(). */
const LABEL_WIDTHS = ["w-24", "w-32", "w-20", "w-28", "w-36"];

export function BarListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="px-1 py-0.5">
          <div className="flex items-baseline justify-between gap-3">
            <Skeleton className={cn("h-4", LABEL_WIDTHS[i % LABEL_WIDTHS.length])} />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="mt-1.5 h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  /** Render the pagination/count footer strip under the table. */
  withFooter?: boolean;
}

export function TableSkeleton({ rows = 10, columns = 7, withFooter = true }: TableSkeletonProps) {
  const gridStyle = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
  return (
    <div>
      <div className="border-b border-border px-3 py-3">
        <div className="grid items-center gap-3" style={gridStyle}>
          {Array.from({ length: columns }, (_, i) => (
            <Skeleton key={i} className="h-3.5 w-3/4" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="border-b border-border px-3 py-3 last:border-0">
          <div className="grid items-center gap-3" style={gridStyle}>
            <div className="space-y-1.5">
              <Skeleton className={cn("h-4", LABEL_WIDTHS[row % LABEL_WIDTHS.length])} />
              <Skeleton className="h-3 w-4/5" />
            </div>
            {Array.from({ length: columns - 1 }, (_, col) => (
              <Skeleton key={col} className={cn("h-4", col % 2 === 0 ? "w-2/3" : "w-1/2")} />
            ))}
          </div>
        </div>
      ))}
      {withFooter && (
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-4 w-56 max-w-full" />
          <Skeleton className="h-8 w-64 max-w-full" />
        </div>
      )}
    </div>
  );
}

/** Card with avatar chip + two lines + rows of label/value pairs. */
export function DetailCardSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-4 space-y-0">
        <Skeleton className="size-12 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className={cn("h-4", LABEL_WIDTHS[i % LABEL_WIDTHS.length])} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
