import type { Metadata } from "next";
import { ProjectDetail } from "@/components/projects/project-detail";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectDetail id={Number(id)} />;
}
