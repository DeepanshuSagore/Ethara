"use client";

import Link from "next/link";
import { CircleCheck, MapPin, UserPlus } from "lucide-react";
import { AddJoinerDialog } from "@/components/employees/add-joiner-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/use-toast";
import { useRole } from "@/lib/demo-role";
import { useMockData } from "@/lib/mock/store";
import { formatDate, initials } from "@/lib/utils";
import type { SeatSuggestion } from "@/types";

const REASON_LABELS: Record<SeatSuggestion["reason"], string> = {
  "team-zone": "near team",
  "same-floor": "same floor",
  "alternate-zone": "alternate zone",
};

export function NewJoinersScreen() {
  const { pendingJoiners, projectsById, suggestSeatsFor, allocateSeat } = useMockData();
  const { role } = useRole();
  const { toast } = useToast();

  const canManage = role === "Admin" || role === "HR";

  const handleAllocate = (joinerId: number, joinerName: string, suggestion: SeatSuggestion) => {
    const result = allocateSeat(joinerId, suggestion.seat.id);
    toast(
      result.ok
        ? {
            title: "Seat allocated",
            description: `${joinerName} is now seated at ${suggestion.seat.seat_code} on Floor ${suggestion.seat.floor}.`,
          }
        : { title: "Allocation failed", description: result.error, variant: "destructive" }
    );
  };

  return (
    <>
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
        <div className="grid gap-4 lg:grid-cols-2">
          {pendingJoiners.map((joiner) => {
            const suggestions = suggestSeatsFor(joiner);
            const project = projectsById.get(joiner.project_id);
            return (
              <Card key={joiner.id}>
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
                      {joiner.role} · {project?.name} · joined {formatDate(joiner.joining_date)}
                    </CardDescription>
                  </div>
                  <Badge variant="info">Pending</Badge>
                </CardHeader>
                <CardContent>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    Suggested seats
                  </p>
                  {suggestions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No seats available anywhere — release a seat first.
                    </p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {suggestions.map((suggestion) => (
                        <li key={suggestion.seat.id}>
                          <button
                            type="button"
                            disabled={!canManage}
                            onClick={() => handleAllocate(joiner.id, joiner.name, suggestion)}
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
          })}
        </div>
      )}
    </>
  );
}
