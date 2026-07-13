"use client";

import { PageHeader } from "@/components/layout/page-header";
import { ProjectCard } from "@/components/projects/project-card";
import { useMockData } from "@/lib/mock/store";

export function ProjectsScreen() {
  const { projectStats } = useMockData();

  return (
    <>
      <PageHeader
        title="Projects"
        description="All active projects with headcount, allocated seats and team location."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {projectStats.map((stats) => (
          <ProjectCard key={stats.project.id} stats={stats} />
        ))}
      </div>
    </>
  );
}
