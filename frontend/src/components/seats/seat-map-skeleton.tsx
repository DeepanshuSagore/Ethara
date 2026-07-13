import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/layout/skeletons";
import { FLOORS, ZONES } from "@/lib/constants";

// Placeholder rows only — the real floor renders 80 bays × 7 seats per zone
// once /seats?floor= resolves, but a viewport-height sketch reads better.
const SKELETON_BAYS = 8;
const SKELETON_SEATS_PER_BAY = 7;

/**
 * Loading shape for the seat map — floor tabs, legend, and two zone cards of
 * bay rows with seat-sized cells. Used by the route loading.tsx and the
 * page's Suspense fallback around useSearchParams.
 */
export function SeatMapSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading seat map…</span>
      <PageHeaderSkeleton />

      {/* Floor tabs strip */}
      <div className="inline-flex h-9 max-w-full items-center gap-1 rounded-xl bg-muted p-1">
        {FLOORS.map((floor) => (
          <Skeleton key={floor} className="h-7 w-16 rounded-lg" />
        ))}
      </div>

      {/* Legend */}
      <div className="mb-4 mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className="flex items-center gap-2">
            <Skeleton className="size-3.5 rounded" />
            <Skeleton className="h-4 w-20" />
          </span>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {ZONES.map((zone) => (
          <Card key={zone}>
            <CardHeader>
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: SKELETON_BAYS }, (_, bay) => (
                <div key={bay} className="flex items-center gap-3">
                  <Skeleton className="h-3 w-12 shrink-0" />
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: SKELETON_SEATS_PER_BAY }, (_, seat) => (
                      <Skeleton key={seat} className="size-9 rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
