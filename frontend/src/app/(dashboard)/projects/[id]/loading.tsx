import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeaderSkeleton,
  StatCardSkeleton,
  TableSkeleton,
} from "@/components/layout/skeletons";

/** Project detail loading state — stat cards + team table. */
export default function ProjectDetailLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading project…</span>
      <PageHeaderSkeleton withAction />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="p-0">
          <TableSkeleton rows={8} columns={6} />
        </CardContent>
      </Card>
    </div>
  );
}
