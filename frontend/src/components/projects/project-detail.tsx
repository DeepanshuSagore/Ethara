"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Armchair, FolderX, MapPin, UserRound, Users } from "lucide-react";
import { StatCard } from "@/components/charts/stat-card";
import { EmployeeTable } from "@/components/employees/employee-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationBar } from "@/components/ui/pagination";
import { DISPLAY_SCALE } from "@/lib/mock/data";
import { useMockData } from "@/lib/mock/store";
import { formatNumber } from "@/lib/utils";

const PAGE_SIZE = 25;

export function ProjectDetail({ id }: { id: number }) {
  const { projectsById, projectStats, employees } = useMockData();
  const [page, setPage] = React.useState(1);

  const project = projectsById.get(id);
  const stats = projectStats.find((s) => s.project.id === id);

  if (!project || !stats) {
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

  const members = employees.filter(
    (e) => e.project_id === id && e.status !== "EXITED"
  );
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
          value={formatNumber(stats.headcount * DISPLAY_SCALE)}
          hint={pending > 0 ? `${formatNumber(pending * DISPLAY_SCALE)} pending allocation` : "all mapped"}
          icon={Users}
        />
        <StatCard
          label="Seats allocated"
          value={formatNumber(stats.seated * DISPLAY_SCALE)}
          hint={`${stats.headcount === 0 ? 0 : Math.round((stats.seated / stats.headcount) * 100)}% of team seated`}
          icon={Armchair}
        />
        <StatCard
          label="Team location"
          value={`Floor ${stats.homeZone[0]} · ${stats.homeZone[1]}`}
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
          {members.length === 0 ? (
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
