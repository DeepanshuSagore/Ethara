import type { Metadata } from "next";
import { EmployeeDetail } from "@/components/employees/employee-detail";
import { API_BASE_URL } from "@/lib/api/client";
import type { Employee } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  // Server-side lookup so the tab title matches the directory; falls back to
  // a generic title when the API is unreachable or the id doesn't exist.
  try {
    const response = await fetch(`${API_BASE_URL}/employees/${Number(id)}`, {
      cache: "no-store",
    });
    if (response.ok) {
      const employee: Employee = await response.json();
      return { title: employee.name };
    }
  } catch {
    // Backend down — the client screen shows its own error state.
  }
  return { title: "Employee" };
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EmployeeDetail id={Number(id)} />;
}
