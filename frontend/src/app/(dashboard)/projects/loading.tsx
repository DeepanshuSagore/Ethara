import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/layout/skeletons";

function ProjectCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

/** Projects loading state — grid of project card shapes. */
export default function ProjectsLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading projects…</span>
      <PageHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
