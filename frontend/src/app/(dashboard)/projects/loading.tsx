import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/layout/skeletons";

/**
 * Mirrors ProjectCard exactly: title + description with a status pill, the
 * manager/location meta row, two mid metrics, and the "Team seated" progress
 * strip — same sections and heights, so the swap to data never jumps.
 */
function ProjectCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div className="min-w-0 flex-1 space-y-1">
          {/* CardTitle is text-base leading-none (16px)… */}
          <Skeleton className="h-4 w-1/2" />
          {/* …the description a text-sm (20px) line box. */}
          <div className="flex h-5 items-center">
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
        <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Manager + location meta row (text-sm line box). */}
        <div className="flex h-5 items-center gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
        </div>
        {/* people / seats allocated mid metrics (text-2xl + text-xs label). */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-1 h-3 w-12" />
          </div>
          <div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-1 h-3 w-20" />
          </div>
        </div>
        {/* "Team seated" label/percentage row + progress track. */}
        <div>
          <div className="mb-1 flex h-4 items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

/** Projects loading state — the same header + sm:2 / xl:3 card grid. */
export default function ProjectsLoading() {
  return (
    <div role="status" aria-label="Loading projects…">
      <PageHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
