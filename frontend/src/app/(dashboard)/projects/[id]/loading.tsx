import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeaderSkeleton,
  StatCardSkeleton,
  TableSkeleton,
} from "@/components/layout/skeletons";

/**
 * Mirrors ProjectDetail's ProseStatCard (Team location, Manager): annotation
 * label + icon header, then a body-scale (text-base) value with a hint —
 * distinct from the mono-metric StatCard shape.
 */
function ProseStatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-3 w-20" />
      </CardContent>
    </Card>
  );
}

/**
 * Project detail loading state — header with the back action, the sm:2 / xl:4
 * stat grid (two numeric cards, then location + manager prose cards), and the
 * team-members table card, matching the loaded page's structure.
 */
export default function ProjectDetailLoading() {
  return (
    <div role="status" aria-label="Loading project…">
      <PageHeaderSkeleton withAction />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <ProseStatCardSkeleton />
        <ProseStatCardSkeleton />
      </div>

      <Card className="mt-6">
        <CardHeader>
          {/* CardTitle (text-base leading-none) + text-sm description. */}
          <Skeleton className="h-4 w-36" />
          <div className="flex h-5 items-center">
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <TableSkeleton rows={8} columns={6} />
        </CardContent>
      </Card>
    </div>
  );
}
