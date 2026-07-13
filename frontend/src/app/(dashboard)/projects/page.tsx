import type { Metadata } from "next";
import { FolderKanban } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <>
      <PageHeader
        title="Projects"
        description="All active projects with headcount and seat utilization."
      />
      <ComingSoon
        icon={FolderKanban}
        title="Project mapping"
        description="The 11 Ethara projects — Indigo, Serfy, Kaary and friends — with per-project members and seats, arriving in Phase 2."
      />
    </>
  );
}
