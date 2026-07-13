"use client";

import { FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectCard } from "@/components/projects/project-card";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useMockData } from "@/lib/mock/store";

export function ProjectsScreen() {
  const { projectStats } = useMockData();

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
