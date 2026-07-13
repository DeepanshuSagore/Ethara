import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/layout/skeletons";

/** Analytics placeholder loading state. */
export default function AnalyticsLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading analytics…</span>
      <PageHeaderSkeleton />
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16">
          <Skeleton className="size-12 rounded-2xl" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <div className="mt-4 w-full max-w-xl space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
