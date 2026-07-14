import { PageHeader, SectionHeading } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* Deterministic width cycles so rows look organic without Math.random(). */
const BAR_LABEL_WIDTHS = ["w-32", "w-40", "w-24", "w-36", "w-28"];
const BAR_VALUE_WIDTHS = ["w-40", "w-32", "w-44", "w-36", "w-40"];
/* Queue-row skeleton widths — keep in sync with dashboard-screen.tsx. */
const QUEUE_NAME_WIDTHS = ["w-32", "w-40", "w-28", "w-36"];
const QUEUE_META_WIDTHS = ["w-44", "w-36", "w-48", "w-40"];

/** Mirrors BarList rows: text-sm label/value line, optional text-xs secondary, h-2 track. */
function BarRowsSkeleton({
  rows,
  withSecondary = false,
}: {
  rows: number;
  withSecondary?: boolean;
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="px-1 py-0.5">
          <div className="flex items-baseline justify-between gap-3">
            <Skeleton className={cn("h-5", BAR_LABEL_WIDTHS[i % BAR_LABEL_WIDTHS.length])} />
            <Skeleton className={cn("h-5", BAR_VALUE_WIDTHS[i % BAR_VALUE_WIDTHS.length])} />
          </div>
          {withSecondary && <Skeleton className="mt-0.5 h-4 w-64 max-w-full" />}
          <Skeleton className="mt-1.5 h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Dashboard loading state — mirrors the loaded screen exactly. The header
 * and section rules are static, so they render for real (zero swap shift);
 * only the data regions shimmer: six KPI cards, the chart row (project bars,
 * donut, pending queue with its button-shaped header action) and the floor
 * card.
 */
export default function DashboardLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading dashboard…">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Live overview of seats, occupancy and allocation across Ethara."
        actions={<Skeleton className="h-5 w-24 rounded-full md:w-64" />}
      />

      <SectionHeading index="01" title="Capacity" />
      {/* Six KPI cards: label + size-9 chip row, text-3xl metric, text-xs hint. */}
      <div className="stagger-children grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="size-9 rounded-lg" />
              </div>
              <Skeleton className="mt-3 h-9 w-20" />
              <Skeleton className="mt-1 h-4 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionHeading index="02" title="Allocation" className="pt-8" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-64 max-w-full" />
          </CardHeader>
          <CardContent>
            <BarRowsSkeleton rows={8} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-44" />
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <Skeleton className="size-35 rounded-full" />
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-48" />
              </div>
              {/* "View queue" default button. */}
              <Skeleton className="h-10 w-28 rounded-lg" />
            </CardHeader>
            <CardContent>
              <div className="-mx-2 space-y-1">
                {QUEUE_NAME_WIDTHS.map((width, i) => (
                  <div key={width} className="px-2 py-1.5">
                    <Skeleton className={cn("h-5", width)} />
                    <Skeleton className={cn("mt-0.5 h-4", QUEUE_META_WIDTHS[i])} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <SectionHeading index="03" title="Floor occupancy" className="pt-8" />
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-5 w-60 max-w-full" />
        </CardHeader>
        <CardContent>
          <BarRowsSkeleton rows={5} withSecondary />
        </CardContent>
      </Card>
    </div>
  );
}
