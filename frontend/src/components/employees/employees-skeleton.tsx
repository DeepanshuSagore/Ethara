import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/layout/skeletons";
import { cn } from "@/lib/utils";

/** Deterministic width cycle so rows look organic without Math.random(). */
const NAME_WIDTHS = ["w-32", "w-40", "w-28", "w-36", "w-44"];

/**
 * Mirrors EmployeeTable exactly: the page-local-sort hint strip, the same
 * min-w scroll behavior, the same visible column count per breakpoint
 * (5 below md — department/role fold away — 7 from md up), a two-line name
 * cell, a badge-shaped status cell and the PaginationBar footer strip.
 */
export function EmployeeTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading employees table">
      {/* Sort-hint strip (text-xs line + py-2). */}
      <div className="flex items-center border-b border-border px-4 py-2">
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-160 md:min-w-4xl">
          {/* Header — h-10 matches TableHead. */}
          <div className="grid h-10 grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center gap-3 border-b border-border px-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr]">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="hidden h-3.5 w-24 md:block" />
            <Skeleton className="hidden h-3.5 w-14 md:block" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="h-3.5 w-12" />
          </div>
          {Array.from({ length: rows }, (_, row) => (
            <div
              key={row}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center gap-3 border-b border-border p-3 last:border-0 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr]"
            >
              {/* Name + role/email second line. */}
              <div className="space-y-1.5">
                <Skeleton className={cn("h-4", NAME_WIDTHS[row % NAME_WIDTHS.length])} />
                <Skeleton className="h-3 w-4/5" />
              </div>
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="hidden h-4 w-2/3 md:block" />
              <Skeleton className="hidden h-4 w-3/4 md:block" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-5.5 w-20 rounded-full" />
              <Skeleton className="h-3.5 w-14" />
            </div>
          ))}
        </div>
      </div>
      {/* PaginationBar mirror: summary line + h-9 prev/next strip. */}
      <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-5 w-56 max-w-full" />
        <Skeleton className="h-9 w-64 max-w-full" />
      </div>
    </div>
  );
}

/**
 * Loading shape for the employees screen — used by both the route-level
 * loading.tsx and the page's Suspense fallback around useSearchParams,
 * so the two loading paths look identical.
 */
export function EmployeesScreenSkeleton() {
  return (
    <div role="status" aria-label="Loading employees">
      <PageHeaderSkeleton withAction="button" />
      <div className="space-y-4">
        {/* Labelled search input + three labelled filter selects. */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_repeat(3,minmax(9rem,11rem))]">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        <Card>
          <CardContent className="p-0">
            <EmployeeTableSkeleton rows={10} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
