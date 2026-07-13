import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarListSkeleton,
  PageHeaderSkeleton,
  StatCardSkeleton,
} from "@/components/layout/skeletons";

/** Dashboard loading state — mirrors stat cards, charts and the pending card. */
export default function DashboardLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading dashboard…</span>
      <PageHeaderSkeleton withAction />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <BarListSkeleton rows={8} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-44" />
            </CardHeader>
            <CardContent className="flex items-center justify-center pb-8">
              <Skeleton className="size-[140px] rounded-full" />
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-52" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <BarListSkeleton rows={5} />
        </CardContent>
      </Card>
    </div>
  );
}
