"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Armchair, FolderX, MapPin, UserRound, Users } from "lucide-react";
import { StatCard } from "@/components/charts/stat-card";
import { EmployeeTable } from "@/components/employees/employee-table";
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
import { formatNumber } from "@/lib/utils";

const PAGE_SIZE = 25;

export function ProjectDetail({ id }: { id: number }) {
  const projectQuery = useProject(id);
  const utilizationQuery = useProjectUtilization();
  const membersQuery = useProjectEmployees(id);
  const [page, setPage] = React.useState(1);

  const invalidId = !Number.isInteger(id) || id <= 0;
  if (invalidId || projectQuery.isError) {
    if (
      invalidId ||
      (projectQuery.error instanceof ApiError && projectQuery.error.status === 404)
    ) {
      return (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={FolderX}
              title="Project not found"
              description={`No project with id ${id} exists.`}
              action={
                <Button asChild variant="outline">
                  <Link href="/projects">
                    <ArrowLeft /> Back to projects
                  </Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      );
    }
    return (
      <ErrorState
        title="Could not load this project"
        description="The Ethara API did not respond. Check that the backend is running, then try again."
        detail={errorMessage(projectQuery.error)}
        onRetry={() => projectQuery.refetch()}
        backHref="/projects"
        backLabel="Back to projects"
      />
    );
  }

  const project = projectQuery.data;
  const stats = utilizationQuery.data?.find((s) => s.project.id === id);
  if (!project || !stats) {
    return <ProjectDetailLoading />;
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
        title={project.name}
        description={project.description}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/projects">
              <ArrowLeft /> All projects
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Headcount"
          value={formatNumber(stats.headcount)}
          hint={pending > 0 ? `${formatNumber(pending)} pending allocation` : "all mapped"}
          icon={Users}
        />
        <StatCard
          label="Seats allocated"
          value={formatNumber(stats.seated)}
          hint={`${stats.headcount === 0 ? 0 : Math.round((stats.seated / stats.headcount) * 100)}% of team seated`}
          icon={Armchair}
        />
        <StatCard
          label="Team location"
          value={`Floor ${stats.home_zone[0]} · ${stats.home_zone[1]}`}
          hint="primary zone"
          icon={MapPin}
        />
        <StatCard
          label="Manager"
          value={project.manager_name}
          hint="project lead"
          icon={UserRound}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Team members</CardTitle>
          <CardDescription>Everyone mapped to {project.name}, with their seats</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {membersQuery.isError ? (
            <EmptyState
              icon={FolderX}
              iconWrapClassName="bg-destructive/10 text-destructive"
              title="Could not load the team"
              description={`Member list failed to fetch — ${errorMessage(membersQuery.error)}`}
              action={<Button onClick={() => membersQuery.refetch()}>Try again</Button>}
            />
          ) : membersQuery.isPending ? (
            <TableSkeleton rows={8} columns={6} />
          ) : members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No team members yet"
              description={`Nobody is mapped to ${project.name} right now. New joiners appear here once assigned.`}
            />
          ) : (
            <>
              <EmployeeTable employees={pageRows} showProject={false} />
              <PaginationBar
                page={safePage}
                pageCount={pageCount}
                onPageChange={setPage}
                summary={`Showing ${rangeStart}–${rangeEnd} of ${formatNumber(members.length)} team members`}
              />
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
