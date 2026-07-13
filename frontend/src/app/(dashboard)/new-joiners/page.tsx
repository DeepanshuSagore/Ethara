import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "New Joiners" };

export default function NewJoinersPage() {
  return (
    <>
      <PageHeader
        title="New Joiners"
        description="Pending seat allocations with smart suggestions near each project team."
      />
      <ComingSoon
        icon={UserPlus}
        title="Allocation queue"
        description="Employees awaiting seats, with proximity-based suggestions and alternate-zone fallbacks — arriving in Phase 2."
      />
    </>
  );
}
