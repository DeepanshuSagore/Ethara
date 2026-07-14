"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CircleCheck,
  Clock,
  Loader2,
  Map as MapIcon,
  MapPin,
  RotateCcw,
  UserPlus,
} from "lucide-react";
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
import { cn, formatDate, formatNumber, initials } from "@/lib/utils";
import type { Employee, SeatSuggestion } from "@/types";

const REASON_LABELS: Record<SeatSuggestion["reason"], string> = {
  "team-zone": "near team",
  "same-floor": "same floor",
  "alternate-zone": "alternate zone",
};

/** Cards per page — also caps concurrent /seats/suggestions requests. */
const PAGE_SIZE = 10;

/* Same order as ProjectCard's PROJECT_TONES, keyed off project_id, so a
   joiner's avatar carries their project's hue across screens. Literal class
   strings keep every tone visible to the Tailwind scanner. */
const AVATAR_TONES = [
  "bg-tone-sky-soft text-tone-sky-strong",
  "bg-tone-violet-soft text-tone-violet-strong",
  "bg-tone-emerald-soft text-tone-emerald-strong",
  "bg-tone-amber-soft text-tone-amber-strong",
  "bg-tone-rose-soft text-tone-rose-strong",
  "bg-tone-cyan-soft text-tone-cyan-strong",
] as const;

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
  // Which chip's allocation is in flight — the spinner goes on that seat only.
  const pendingSeatId = allocate.isPending ? allocate.variables?.seatId : undefined;

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-4 space-y-0">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-medium",
            AVATAR_TONES[joiner.project_id % AVATAR_TONES.length]
          )}
          aria-hidden="true"
        >
          {initials(joiner.name)}
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <CardTitle as="h2" className="truncate font-medium">
            <Link
              href={`/employees/${joiner.id}`}
              className="rounded-md hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {joiner.name}
            </Link>
          </CardTitle>
          <CardDescription className="truncate">
            {joiner.role} · {projectName ?? "no project"} · joined {formatDate(joiner.joining_date)}
          </CardDescription>
        </div>
        <Badge variant="warning">
          <Clock className="size-3 shrink-0" aria-hidden="true" />
          Pending
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          Suggested seats
        </p>
        {suggestionsQuery.isPending ? (
          <div
            role="status"
            aria-label="Loading seat suggestions"
            className="flex flex-wrap gap-2"
          >
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-6.5 w-44 rounded-full" />
            ))}
          </div>
        ) : suggestionsQuery.isError ? (
          // An error is not an empty result — destructive tone plus retry.
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive-strong/20 bg-destructive-soft p-3"
          >
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-destructive-strong"
              aria-hidden="true"
            />
            <div className="space-y-2">
              <p className="text-sm text-destructive-strong">
                Could not load seat suggestions: {errorMessage(suggestionsQuery.error)}
              </p>
              <Button variant="outline" size="sm" onClick={() => suggestionsQuery.refetch()}>
                <RotateCcw /> Try again
              </Button>
            </div>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              No seats are available anywhere. Release a seat first.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/seats">
                <MapIcon /> Open seat map
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => {
              const isAllocating = pendingSeatId === suggestion.seat.id;
              const disabled = !canManage || allocate.isPending;
              return (
                <li key={suggestion.seat.id}>
                  {/* aria-disabled (not disabled) keeps the chip focusable so
                      keyboard/AT users hear why it can't be pressed and focus
                      isn't dropped while an allocation is pending. */}
                  <button
                    type="button"
                    aria-disabled={disabled || undefined}
                    aria-busy={isAllocating || undefined}
                    onClick={() => {
                      if (disabled) return;
                      handleAllocate(suggestion);
                    }}
                    className={cn(
                      "flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs transition-colors duration-150 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-disabled:pointer-events-none",
                      disabled && !isAllocating && "opacity-50"
                    )}
                  >
                    {isAllocating && (
                      <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden="true" />
                    )}
                    <span className="text-metric font-mono text-xs font-medium">
                      {suggestion.seat.seat_code}
                    </span>
                    <span className="text-muted-foreground">
                      Floor {suggestion.seat.floor} · {REASON_LABELS[suggestion.reason]}
                    </span>
                    <span className="sr-only">
                      {isAllocating
                        ? ", allocating…"
                        : canManage
                          ? `, allocate to ${joiner.name}`
                          : ", switch to the Admin or HR role to allocate"}
                    </span>
                  </button>
                </li>
              );
            })}
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
      eyebrow="Onboarding"
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
              iconWrapClassName="bg-success-soft text-success-strong"
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
          <div className="stagger-children grid gap-4 lg:grid-cols-2">
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
            summary={`Showing ${rangeStart}-${rangeEnd} of ${formatNumber(pendingJoiners.length)} pending joiners`}
            className="mt-4"
          />
        </>
      )}
    </>
  );
}
