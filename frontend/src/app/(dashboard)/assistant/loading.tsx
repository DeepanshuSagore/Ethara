import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Assistant loading state — mirrors the loaded screen exactly: PageHeader with
 * its badge action, one welcome bubble (the panel always opens with a single
 * assistant message), the prompt-chip row and the composer bar, all inside the
 * same full-height flex frame as the real page.
 */
export default function AssistantLoading() {
  return (
    <div role="status" aria-label="Loading assistant" className="flex flex-1 flex-col">
      <span className="sr-only">Loading assistant…</span>

      {/* PageHeader: eyebrow (16px) + text-2xl h1 (32px) + text-sm description
          (20px) + badge */}
      <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
        <Skeleton className="h-6 w-44 rounded-full" />
      </div>

      <Card className="flex min-h-96 flex-1 flex-col overflow-hidden">
        {/* Message band: the single welcome bubble with its avatar chip */}
        <div className="flex-1 space-y-4 overflow-hidden p-5">
          <div className="flex gap-3">
            <Skeleton className="size-8 shrink-0 rounded-lg" />
            <Skeleton className="h-20 w-2/3 max-w-md rounded-xl rounded-bl-md" />
          </div>
        </div>

        {/* Composer: chip row + input with send button */}
        <div className="space-y-3 border-t border-border p-4">
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-7 w-40 shrink-0 rounded-full" />
            ))}
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="size-10 shrink-0" />
          </div>
        </div>
      </Card>
    </div>
  );
}
