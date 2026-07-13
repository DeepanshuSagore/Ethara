"use client";

import * as React from "react";
import Link from "next/link";
import { CircleCheck, MapPin, UserPlus } from "lucide-react";
import { AddJoinerDialog } from "@/components/employees/add-joiner-dialog";
import { ErrorState } from "@/components/layout/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationBar } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import NewJoinersLoading from "@/app/(dashboard)/new-joiners/loading";
import { errorMessage } from "@/lib/api/client";
import {
  useAllocateSeat,
  usePendingJoiners,
  useProjects,
  useSeatSuggestions,
} from "@/lib/api/hooks";
import { useRole } from "@/lib/demo-role";
import { formatDate, formatNumber, initials } from "@/lib/utils";
import type { Employee, SeatSuggestion } from "@/types";

const REASON_LABELS: Record<SeatSuggestion["reason"], string> = {
  "team-zone": "near team",
  "same-floor": "same floor",
  "alternate-zone": "alternate zone",
};

/** Cards per page — also caps concurrent /seats/suggestions requests. */
const PAGE_SIZE = 10;

function JoinerCard({
  joiner,
  projectName,
  canManage,
}: {
  joiner: Employee;
  projectName?: string;
  canManage: boolean;
}) {
  const suggestionsQuery = useSeatSuggestions(joiner.id);
  const allocate = useAllocateSeat();
  const { toast } = useToast();

  const handleAllocate = (suggestion: SeatSuggestion) => {
    allocate.mutate(
      { employeeId: joiner.id, seatId: suggestion.seat.id },
      {
        onSuccess: () =>
          toast({
            title: "Seat allocated",
            description: `${joiner.name} is now seated at ${suggestion.seat.seat_code} on Floor ${suggestion.seat.floor}.`,
          }),
        onError: (error) =>
          toast({
            title: "Allocation failed",
            description: errorMessage(error),
            variant: "destructive",
          }),
      }
    );
  };

  const suggestions = suggestionsQuery.data ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-4 space-y-0">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-sm font-semibold text-accent-foreground">
          {initials(joiner.name)}
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <CardTitle className="truncate">
            <Link href={`/employees/${joiner.id}`} className="hover:underline">
              {joiner.name}
            </Link>
          </CardTitle>
          <CardDescription>
            {joiner.role} · {projectName} · joined {formatDate(joiner.joining_date)}
          </CardDescription>
        </div>
        <Badge variant="info">Pending</Badge>
      </CardHeader>
      <CardContent>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden="true" />
          Suggested seats
        </p>
        {suggestionsQuery.isPending ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-36 rounded-lg" />
            ))}
          </div>
        ) : suggestionsQuery.isError ? (
          <p className="text-sm text-muted-foreground">
            Could not load suggestions — {errorMessage(suggestionsQuery.error)}
          </p>
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No seats available anywhere — release a seat first.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <li key={suggestion.seat.id}>
                <button
                  type="button"
                  disabled={!canManage || allocate.isPending}
                  onClick={() => handleAllocate(suggestion)}
                  title={
                    canManage
                      ? `Allocate ${suggestion.seat.seat_code} to ${joiner.name}`
                      : "Switch to Admin/HR to allocate"
                  }
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm shadow-soft transition-colors hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:border-border disabled:hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="text-metric font-semibold">
                    {suggestion.seat.seat_code}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Floor {suggestion.seat.floor} · {REASON_LABELS[suggestion.reason]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function NewJoinersScreen() {
  const pendingJoinersQuery = usePendingJoiners();
  const { data: projects } = useProjects();
  const { role } = useRole();
  const [page, setPage] = React.useState(1);

  const canManage = role === "Admin" || role === "HR";
  const projectsById = new Map((projects ?? []).map((p) => [p.id, p]));

  const header = (
    <PageHeader
      title="New Joiners"
      description={
        canManage
          ? "Pending seat allocations with suggestions near each project team."
          : "Employees awaiting seat allocation. Switch to Admin/HR to allocate."
      }
      actions={
        canManage ? (
          <AddJoinerDialog>
            <Button>
              <UserPlus /> Add new joiner
            </Button>
          </AddJoinerDialog>
        ) : undefined
      }
    />
  );

  if (pendingJoinersQuery.isError) {
    return (
      <>
        {header}
        <ErrorState
          title="Could not load the queue"
          description="The Ethara API did not respond. Check that the backend is running, then try again."
          detail={errorMessage(pendingJoinersQuery.error)}
          onRetry={() => pendingJoinersQuery.refetch()}
        />
      </>
    );
  }

  if (pendingJoinersQuery.isPending) {
    return <NewJoinersLoading />;
  }

  const pendingJoiners = pendingJoinersQuery.data;
  // Clamp rather than reset so an allocation on the last page never strands
  // the user on a page that no longer exists.
  const pageCount = Math.max(1, Math.ceil(pendingJoiners.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageJoiners = pendingJoiners.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = (safePage - 1) * PAGE_SIZE + pageJoiners.length;

  return (
    <>
      {header}

      {pendingJoiners.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={CircleCheck}
              iconWrapClassName="bg-success/15 text-success"
              title="Queue is clear"
              description="Every new joiner has a seat. Add a new joiner to start an allocation."
              action={
                canManage ? (
                  <AddJoinerDialog>
                    <Button variant="outline">
                      <UserPlus /> Add new joiner
                    </Button>
                  </AddJoinerDialog>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {pageJoiners.map((joiner) => (
              <JoinerCard
                key={joiner.id}
                joiner={joiner}
                projectName={projectsById.get(joiner.project_id)?.name}
                canManage={canManage}
              />
            ))}
          </div>
          <PaginationBar
            page={safePage}
            pageCount={pageCount}
            onPageChange={setPage}
            summary={`Showing ${rangeStart}–${rangeEnd} of ${formatNumber(pendingJoiners.length)} pending joiners`}
            className="mt-4 border-t-0 px-0"
          />
        </>
      )}
    </>
  );
}
