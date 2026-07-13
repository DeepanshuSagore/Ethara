import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Assistant" };

export default function AssistantPage() {
  return (
    <>
      <PageHeader
        title="Assistant"
        description="Ask natural-language questions about seats, projects and availability."
      />
      <ComingSoon
        icon={Sparkles}
        title="AI assistant"
        description={`Ask things like "Where is Amit seated?" or "Show available seats on Floor 3" — chat UI arrives in Phase 2, wired to the AI backend in Phase 8.`}
      />
    </>
  );
}
