import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/layout/skeletons";

/** Mirrors JoinerCard: size-10 avatar chip, name + meta lines, Pending
    badge, SUGGESTED SEATS label and three rounded-full seat chips. */
function JoinerCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-4 space-y-0">
        <Skeleton className="size-10 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-5 w-4/5" />
        </div>
        <Skeleton className="h-5.5 w-20 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mb-2 h-4 w-32" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-6.5 w-44 rounded-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * New joiners loading state — mirrors the loaded page: a full PAGE_SIZE (10)
 * grid of queue cards plus the PaginationBar strip underneath.
 */
export default function NewJoinersLoading() {
  return (
    <div role="status" aria-label="Loading new joiners">
      <PageHeaderSkeleton withAction="button" />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 10 }, (_, i) => (
          <JoinerCardSkeleton key={i} />
        ))}
      </div>
      {/* PaginationBar mirror (default styling, mt-4). */}
      <div className="mt-4 flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-5 w-64 max-w-full" />
        <Skeleton className="h-9 w-64 max-w-full" />
      </div>
    </div>
  );
}
