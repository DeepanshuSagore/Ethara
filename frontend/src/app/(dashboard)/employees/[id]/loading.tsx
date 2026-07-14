import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/layout/skeletons";

/** One definition-list row: py-1.5 + text-sm line boxes match Field. */
function FieldRowSkeleton({ valueWidth }: { valueWidth: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <Skeleton className="h-5 w-20" />
      <Skeleton className={`h-5 ${valueWidth}`} />
    </div>
  );
}

/**
 * Mirrors EmployeeDetail exactly: profile card (avatar header + 5 rows),
 * seat card (icon title + text-3xl code + 3 rows + sm button) and project
 * card (icon title + text-lg link + description + 2 rows).
 */
export default function EmployeeDetailLoading() {
  return (
    <div role="status" aria-label="Loading employee">
      <PageHeaderSkeleton withAction="button" />
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Profile card */}
        <Card>
          <CardHeader className="flex-row items-center gap-4 space-y-0">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-24" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              <FieldRowSkeleton valueWidth="w-40" />
              <FieldRowSkeleton valueWidth="w-28" />
              <FieldRowSkeleton valueWidth="w-32" />
              <FieldRowSkeleton valueWidth="w-24" />
              <FieldRowSkeleton valueWidth="w-20" />
            </div>
          </CardContent>
        </Card>

        {/* Seat allocation card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-5 w-44 max-w-full" />
          </CardHeader>
          <CardContent>
            {/* text-3xl seat code line. */}
            <Skeleton className="h-9 w-28" />
            <div className="mt-3 divide-y divide-border">
              <FieldRowSkeleton valueWidth="w-20" />
              <FieldRowSkeleton valueWidth="w-24" />
              <FieldRowSkeleton valueWidth="w-16" />
            </div>
            {/* "View on seat map" sm button. */}
            <Skeleton className="mt-4 h-9 w-36" />
          </CardContent>
        </Card>

        {/* Project card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-44 max-w-full" />
          </CardHeader>
          <CardContent>
            {/* text-lg project link line. */}
            <Skeleton className="h-7 w-40" />
            <Skeleton className="mt-2 h-5 w-full" />
            <Skeleton className="mt-1 h-5 w-3/4" />
            <div className="mt-3 divide-y divide-border">
              <FieldRowSkeleton valueWidth="w-32" />
              <FieldRowSkeleton valueWidth="w-20" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
