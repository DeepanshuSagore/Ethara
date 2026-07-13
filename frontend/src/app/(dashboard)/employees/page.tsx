import type { Metadata } from "next";
import { Suspense } from "react";
import { EmployeesScreen } from "@/components/employees/employees-screen";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Employees" };

export default function EmployeesPage() {
  return (
    // Suspense boundary is required around useSearchParams (topbar search query).
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <EmployeesScreen />
    </Suspense>
  );
}
