import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/layout/skeletons";

/**
 * Loading shape for the employees screen — used by both the route-level
 * loading.tsx and the page's Suspense fallback around useSearchParams,
 * so the two loading paths look identical.
 */
export function EmployeesScreenSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading employees…</span>
      <PageHeaderSkeleton withAction />
      <div className="space-y-4">
        {/* Search + three filter selects */}
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,180px))]">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Card>
          <CardContent className="p-0">
            <TableSkeleton rows={10} columns={7} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
