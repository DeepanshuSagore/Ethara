import type { Metadata } from "next";
import { Users } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Employees" };

export default function EmployeesPage() {
  return (
    <>
      <PageHeader
        title="Employees"
        description="Directory of all employees with search, filters and seat status."
      />
      <ComingSoon
        icon={Users}
        title="Employee directory"
        description="Searchable list of ~5,000 employees with department, role, project and seat allocation — arriving in Phase 2."
      />
    </>
  );
}
