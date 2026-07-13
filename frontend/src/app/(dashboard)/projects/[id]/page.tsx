import type { Metadata } from "next";
import { ProjectDetail } from "@/components/projects/project-detail";
import { generateMockDataset } from "@/lib/mock/data";

// Same deterministic dataset the client store seeds from, so server-rendered
// titles match what the browsable directory shows.
const dataset = generateMockDataset();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = dataset.projects.find((p) => p.id === Number(id));
  return { title: project?.name ?? "Project" };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectDetail id={Number(id)} />;
}
