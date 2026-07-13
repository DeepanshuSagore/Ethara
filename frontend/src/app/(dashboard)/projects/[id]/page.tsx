import type { Metadata } from "next";
import { ProjectDetail } from "@/components/projects/project-detail";
import { API_BASE_URL } from "@/lib/api/client";
import type { Project } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  // Server-side lookup so the tab title matches the directory; falls back to
  // a generic title when the API is unreachable or the id doesn't exist.
  try {
    const response = await fetch(`${API_BASE_URL}/projects/${Number(id)}`, {
      cache: "no-store",
    });
    if (response.ok) {
      const project: Project = await response.json();
      return { title: project.name };
    }
  } catch {
    // Backend down — the client screen shows its own error state.
  }
  return { title: "Project" };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectDetail id={Number(id)} />;
}
