import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/layout/skeletons";

/** Assistant loading state — chat bubbles, prompt chips and the input row. */
export default function AssistantLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading assistant…</span>
      <PageHeaderSkeleton withAction />

      <Card className="flex h-[calc(100dvh-14rem)] min-h-[28rem] flex-col">
        <CardContent className="flex-1 space-y-4 overflow-hidden p-6">
          <div className="flex gap-3">
            <Skeleton className="size-8 shrink-0 rounded-xl" />
            <Skeleton className="h-16 w-2/3 max-w-md rounded-2xl rounded-tl-md" />
          </div>
          <div className="flex flex-row-reverse gap-3">
            <Skeleton className="h-10 w-1/2 max-w-xs rounded-2xl rounded-tr-md" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="size-8 shrink-0 rounded-xl" />
            <Skeleton className="h-12 w-3/5 max-w-sm rounded-2xl rounded-tl-md" />
          </div>
        </CardContent>

        <div className="space-y-3 border-t border-border p-4">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-7 w-40 rounded-full" />
            ))}
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="size-9" />
          </div>
        </div>
      </Card>
    </div>
  );
}
