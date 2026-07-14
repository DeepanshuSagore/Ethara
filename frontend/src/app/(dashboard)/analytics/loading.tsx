import { PageHeader, SectionHeading } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* Deterministic width cycles so rows look organic without Math.random(). */
const BAR_LABEL_WIDTHS = ["w-32", "w-40", "w-24", "w-36", "w-28"];
const BAR_VALUE_WIDTHS = ["w-44", "w-36", "w-48", "w-40", "w-44"];

/**
 * Analytics loading state — mirrors the loaded screen exactly. The header and
 * section rules are static, so they render for real (zero swap shift); only
 * the data regions shimmer: four signal cards, the project-coverage bar list
 * and the five floor-composition rows.
 */
export default function AnalyticsLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading analytics…">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description="Deeper utilization charts by project, floor and team."
      />

      <SectionHeading index="01" title="Signals" />
      {/* Four KPI cards: label + size-9 chip row, text-3xl metric, text-xs hint. */}
      <div className="stagger-children grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="size-9 rounded-lg" />
              </div>
              <Skeleton className="mt-3 h-9 w-20" />
              <Skeleton className="mt-1 h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionHeading index="02" title="Project coverage" className="pt-8" />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, card) => (
          <Card key={card}>
            <CardHeader>
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-5 w-72 max-w-full" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="px-1 py-0.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <Skeleton
                        className={cn("h-5", BAR_LABEL_WIDTHS[i % BAR_LABEL_WIDTHS.length])}
                      />
                      <Skeleton
                        className={cn("h-5", BAR_VALUE_WIDTHS[i % BAR_VALUE_WIDTHS.length])}
                      />
                    </div>
                    <Skeleton className="mt-1.5 h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionHeading index="03" title="Floor composition" className="pt-8" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-x-4 gap-y-2 space-y-0">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-5 w-64 max-w-full" />
            </div>
            <Skeleton className="h-4 w-72 max-w-full" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="px-1 py-0.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-28" />
                  </div>
                  <Skeleton className="mt-0.5 h-4 w-80 max-w-full" />
                  <Skeleton className="mt-1.5 h-2.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Zone occupancy heatmap: 5 label + 2-cell rows. */}
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-72 max-w-full" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="grid grid-cols-[3.5rem_1fr_1fr] gap-2">
                  <Skeleton className="h-14 w-12 self-center" />
                  <Skeleton className="h-14 rounded-lg" />
                  <Skeleton className="h-14 rounded-lg" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
