import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Shared skeleton blocks for the route-level loading.tsx files. Each mirrors
 * the exact shape of the real component it stands in for (same shells,
 * heights and columns) so the swap from loading to loaded doesn't jump the
 * layout, and each is a role="status" region so loading is announced to AT.
 */

interface PageHeaderSkeletonProps {
  /**
   * Mirror the real header's action slot: `true`/`"button"` renders a
   * button-shaped bar (h-10), `"badge"` a badge-shaped pill (rounded-full).
   */
  withAction?: boolean | "button" | "badge";
}

export function PageHeaderSkeleton({ withAction = false }: PageHeaderSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading page header"
      className="flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="space-y-1.5">
        {/* h-4 matches the text-eyebrow kicker line box. */}
        <Skeleton className="h-4 w-24" />
        {/* h-8 / md:h-9 match the real h1's text-2xl / md:text-3xl line boxes. */}
        <Skeleton className="h-8 w-44 md:h-9" />
        {/* h-5 matches the text-sm description line box. */}
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      {withAction === "badge" ? (
        <Skeleton className="h-6 w-64 max-w-full rounded-full" />
      ) : withAction ? (
        <Skeleton className="h-10 w-36" />
      ) : null}
    </div>
  );
}

/** Deterministic width cycle so rows look organic without Math.random(). */
const LABEL_WIDTHS = ["w-24", "w-32", "w-20", "w-28", "w-36"];

export function StatCardSkeleton() {
  return (
    <Card role="status" aria-label="Loading metric">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-4 rounded-full" />
      </CardHeader>
      <CardContent>
        {/* h-9 matches the text-3xl metric line; mt-1 h-4 the text-xs hint. */}
        <Skeleton className="h-9 w-20" />
        <Skeleton className="mt-1 h-4 w-28" />
      </CardContent>
    </Card>
  );
}

export function BarListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading chart" className="space-y-3">
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
    <div role="status" aria-label="Loading table">
      {/* Mirrors the real table's overflow-x-auto wrapper: narrow viewports
          scroll horizontally instead of crushing the columns. */}
      <div className="overflow-x-auto">
        <div className="min-w-160">
          {/* h-10 header row matches TableHead. */}
          <div className="flex h-10 items-center border-b border-border px-3">
            <div className="grid w-full items-center gap-3" style={gridStyle}>
              {Array.from({ length: columns }, (_, i) => (
                <Skeleton key={i} className="h-3.5 w-3/4" />
              ))}
            </div>
          </div>
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className="border-b border-border p-3 last:border-0">
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
        </div>
      </div>
      {withFooter && (
        /* Mirrors PaginationBar: border-t, summary line + h-9 prev/next strip. */
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-5 w-56 max-w-full" />
          <Skeleton className="h-9 w-64 max-w-full" />
        </div>
      )}
    </div>
  );
}

/** Card with avatar chip + two lines + rows of label/value pairs. */
export function DetailCardSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <Card role="status" aria-label="Loading details">
      <CardHeader className="flex-row items-center gap-4 space-y-0">
        <Skeleton className="size-12 shrink-0 rounded-xl" />
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
