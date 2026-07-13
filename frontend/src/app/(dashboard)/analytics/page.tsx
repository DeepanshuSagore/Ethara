import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        title="Analytics"
        description="Deeper utilization charts by project, floor and team."
      />
      <ComingSoon
        icon={BarChart3}
        title="Utilization analytics"
        description="Project-wise allocation, floor-wise occupancy and trend views — arriving in Phase 2."
      />
    </>
  );
}
