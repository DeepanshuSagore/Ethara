import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/layout/skeletons";

function JoinerCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-4 space-y-0">
        <Skeleton className="size-11 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mb-2 h-3 w-28" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-36 rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** New joiners loading state — queue cards with suggestion chips. */
export default function NewJoinersLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading new joiners…</span>
      <PageHeaderSkeleton withAction />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <JoinerCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
