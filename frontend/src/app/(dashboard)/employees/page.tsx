import type { Metadata } from "next";
import { Suspense } from "react";
import { EmployeesScreen } from "@/components/employees/employees-screen";
import { EmployeesScreenSkeleton } from "@/components/employees/employees-skeleton";

export const metadata: Metadata = { title: "Employees" };

export default function EmployeesPage() {
  return (
    // Suspense boundary is required around useSearchParams (topbar search
    // query); the fallback matches the route's loading.tsx shape.
    <Suspense fallback={<EmployeesScreenSkeleton />}>
      <EmployeesScreen />
    </Suspense>
  );
}
