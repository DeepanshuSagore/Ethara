"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Armchair,
  FolderX,
  MapPin,
  RotateCcw,
  UserRound,
  UserRoundPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { StatCard } from "@/components/charts/stat-card";
import { AddJoinerDialog } from "@/components/employees/add-joiner-dialog";
import { EmployeeTable } from "@/components/employees/employee-table";
import { AllocatePeopleDialog } from "@/components/projects/allocate-people-dialog";
import { ErrorState } from "@/components/layout/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/layout/skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationBar } from "@/components/ui/pagination";
import ProjectDetailLoading from "@/app/(dashboard)/projects/[id]/loading";
import { ApiError, errorMessage } from "@/lib/api/client";
import {
  useProject,
  useProjectEmployees,
  useProjectUtilization,
} from "@/lib/api/hooks";
import { useRole } from "@/lib/demo-role";
import { formatNumber } from "@/lib/utils";

const PAGE_SIZE = 25;

/** The one back-to-projects treatment, used everywhere the action appears. */
function BackToProjects() {
  return (
    <Button asChild variant="ghost" size="sm">
      <Link href="/projects">
        <ArrowLeft /> All projects
      </Link>
    </Button>
  );
}

/**
 * Stat card for prose values (names, locations) — annotation-style label with
 * a body-scale value, never the mono metric treatment reserved for numbers.
 */
function ProseStatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className="size-4 text-primary" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <p className="truncate text-base font-medium" title={value}>
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ProjectNotFound({ id }: { id: number }) {
  return (
    <>
      <PageHeader
        title="Project not found"
        description="The project you asked for is not in the directory."
        actions={<BackToProjects />}
      />
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={FolderX}
            title="This project doesn't exist"
            description={`No project with id ${id} is in the directory. It may have been removed, or the link is out of date.`}
            action={<BackToProjects />}
          />
        </CardContent>
      </Card>
    </>
  );
}

export function ProjectDetail({ id }: { id: number }) {
  const projectQuery = useProject(id);
  const utilizationQuery = useProjectUtilization();
  const membersQuery = useProjectEmployees(id);
  const { role } = useRole();
  const [page, setPage] = React.useState(1);
  const canManage = role === "Admin" || role === "HR";

  // Reset paging when navigating between projects so a new project never
  // opens mid-table on the previous project's page number.
  const [prevId, setPrevId] = React.useState(id);
  if (prevId !== id) {
    setPrevId(id);
    setPage(1);
  }

  const invalidId = !Number.isInteger(id) || id <= 0;
  if (invalidId || projectQuery.isError) {
    if (
      invalidId ||
      (projectQuery.error instanceof ApiError && projectQuery.error.status === 404)
    ) {
      return <ProjectNotFound id={id} />;
    }
    return (
      <>
        <PageHeader
          eyebrow="Portfolio"
          title="Project"
          description="Headcount, seats and team members for this project."
          actions={<BackToProjects />}
        />
        <ErrorState
          title="Could not load this project"
          description="The Ethara API did not respond. Check that the backend is running, then try again."
          detail={errorMessage(projectQuery.error)}
          onRetry={() => projectQuery.refetch()}
        />
      </>
    );
  }

  if (projectQuery.isPending || utilizationQuery.isPending) {
    return <ProjectDetailLoading />;
  }

  const project = projectQuery.data;

  if (utilizationQuery.isError) {
    return (
      <>
        <PageHeader
          eyebrow="Portfolio"
          title={project?.name ?? "Project"}
          description={project?.description}
          actions={<BackToProjects />}
        />
        <ErrorState
          title="Could not load project stats"
          description="The utilization metrics for this project failed to fetch. Check that the backend is running, then try again."
          detail={errorMessage(utilizationQuery.error)}
          onRetry={() => utilizationQuery.refetch()}
        />
      </>
    );
  }

  const stats = utilizationQuery.data?.find((s) => s.project.id === id);
  // Both queries have settled: a project absent from the utilization response
  // is a missing project, not a loading state — never an eternal skeleton.
  if (!project || !stats) {
    return <ProjectNotFound id={id} />;
  }

  // Matches the mock semantics: EXITED members are out of the headcount.
  const members = (membersQuery.data ?? []).filter((e) => e.status !== "EXITED");
  const pending = members.filter((m) => m.status === "PENDING_ALLOCATION").length;

  const pageCount = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = members.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, members.length);

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title={project.name}
        description={project.description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <BackToProjects />
            {canManage && (
              <AllocatePeopleDialog project={project}>
                <Button>
                  <UserRoundPlus /> Allocate people
                </Button>
              </AllocatePeopleDialog>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Headcount"
          value={stats.headcount}
          hint={pending > 0 ? `${formatNumber(pending)} pending allocation` : "all mapped"}
          icon={Users}
        />
        <StatCard
          label="Seats allocated"
          value={stats.seated}
          hint={`${stats.headcount === 0 ? 0 : Math.round((stats.seated / stats.headcount) * 100)}% of team seated`}
          icon={Armchair}
        />
        <ProseStatCard
          label="Team location"
          value={`Floor ${stats.home_zone[0]} · Zone ${stats.home_zone[1]}`}
          hint="primary zone"
          icon={MapPin}
        />
        <ProseStatCard
          label="Manager"
          value={project.manager_name}
          hint="project lead"
          icon={UserRound}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle as="h2">Team members</CardTitle>
          <CardDescription>Everyone mapped to {project.name}, with their seats</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {membersQuery.isError ? (
            <EmptyState
              icon={FolderX}
              iconWrapClassName="bg-destructive-soft text-destructive-strong"
              title="Could not load the team"
              description={`Member list failed to fetch: ${errorMessage(membersQuery.error)}`}
              action={
                <Button onClick={() => membersQuery.refetch()}>
                  <RotateCcw /> Try again
                </Button>
              }
            />
          ) : membersQuery.isPending ? (
            <TableSkeleton rows={8} columns={6} />
          ) : members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No team members yet"
              description={`Nobody is mapped to ${project.name} right now. New joiners appear here once assigned.`}
              action={
                canManage ? (
                  <AddJoinerDialog defaultProjectId={project.id}>
                    <Button variant="outline">
                      <UserRoundPlus /> Add new joiner
                    </Button>
                  </AddJoinerDialog>
                ) : undefined
              }
            />
          ) : (
            <>
              <EmployeeTable employees={pageRows} showProject={false} />
              <PaginationBar
                page={safePage}
                pageCount={pageCount}
                onPageChange={setPage}
                summary={`Showing ${rangeStart}-${rangeEnd} of ${formatNumber(members.length)} team members`}
              />
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
