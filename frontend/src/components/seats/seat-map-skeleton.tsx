import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/layout/skeletons";
import { FLOORS, ZONES } from "@/lib/constants";

// Mirrors the seeded floor exactly: 80 bays × 7 seats per zone, so the
// loading → loaded swap changes nothing about page height or scroll position.
const SKELETON_BAYS = 80;
const SKELETON_SEATS_PER_BAY = 7;

interface SeatMapSkeletonProps {
  /**
   * "page" renders the full route shape (header + floor tabs + floor);
   * "floor" is the in-tab shape shown while a floor's seats refetch.
   */
  scope?: "page" | "floor";
}

/**
 * Loading shape for the seat map. Used by the route loading.tsx and the
 * page's Suspense fallback (scope="page"), and by SeatMap while a floor
 * loads inside the already-rendered tabs (scope="floor").
 */
export function SeatMapSkeleton({ scope = "page" }: SeatMapSkeletonProps) {
  return (
    <div
      role="status"
      aria-label={scope === "page" ? "Loading seat map" : "Loading floor"}
    >
      {scope === "page" && (
        <>
          <PageHeaderSkeleton />

          {/* Floor tabs strip — same scrollable shell as the real TabsList. */}
          <div className="inline-flex h-10 max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-muted p-1">
            {FLOORS.map((floor) => (
              <Skeleton key={floor} className="h-8 w-16 shrink-0 rounded-lg bg-card" />
            ))}
          </div>
        </>
      )}

      {/* Legend — same h-5 line rows and mb-4 rhythm as SeatLegend. */}
      <div
        className={
          scope === "page"
            ? "mb-4 mt-3 flex flex-wrap items-center gap-x-5 gap-y-2"
            : "mb-4 flex flex-wrap items-center gap-x-5 gap-y-2"
        }
      >
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className="flex h-5 items-center gap-2">
            <Skeleton className="size-4 shrink-0 rounded-lg" />
            <Skeleton className="h-4 w-24" />
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {ZONES.map((zone) => (
          <Card key={zone}>
            <CardHeader>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              {/* Same horizontal-scroll strip as the loaded ZoneGrid. */}
              <div className="-m-1 space-y-3 overflow-x-auto p-1">
                {Array.from({ length: SKELETON_BAYS }, (_, bay) => (
                  <div key={bay} className="flex w-max min-w-full items-center gap-3">
                    <Skeleton className="h-3 w-12 shrink-0" />
                    <div className="flex gap-2 md:gap-1.5">
                      {Array.from({ length: SKELETON_SEATS_PER_BAY }, (_, seat) => (
                        <Skeleton key={seat} className="size-11 shrink-0 rounded-lg md:size-9" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
