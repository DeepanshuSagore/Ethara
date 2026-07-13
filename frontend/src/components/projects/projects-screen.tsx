"use client";

import { FolderKanban } from "lucide-react";
import { ErrorState } from "@/components/layout/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectCard } from "@/components/projects/project-card";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import ProjectsLoading from "@/app/(dashboard)/projects/loading";
import { errorMessage } from "@/lib/api/client";
import { useProjectUtilization } from "@/lib/api/hooks";

export function ProjectsScreen() {
  // /dashboard/project-utilization bundles each project with live
  // headcount/seated/home-zone stats — exactly what the cards show.
  const utilizationQuery = useProjectUtilization();

  if (utilizationQuery.isError) {
    return (
      <>
        <PageHeader
          title="Projects"
          description="All active projects with headcount, allocated seats and team location."
        />
        <ErrorState
          title="Could not load projects"
          description="The Ethara API did not respond. Check that the backend is running, then try again."
          detail={errorMessage(utilizationQuery.error)}
          onRetry={() => utilizationQuery.refetch()}
        />
      </>
    );
  }

  if (utilizationQuery.isPending) {
    return <ProjectsLoading />;
  }

  const projectStats = utilizationQuery.data;

  return (
    <>
      <PageHeader
        title="Projects"
        description="All active projects with headcount, allocated seats and team location."
      />
      {projectStats.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Projects appear here with headcount and seat stats once created."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projectStats.map((stats) => (
            <ProjectCard key={stats.project.id} stats={stats} />
          ))}
        </div>
      )}
    </>
  );
}
