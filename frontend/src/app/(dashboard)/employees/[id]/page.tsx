import type { Metadata } from "next";
import { EmployeeDetail } from "@/components/employees/employee-detail";
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
  const employee = dataset.employees.find((e) => e.id === Number(id));
  return { title: employee?.name ?? "Employee" };
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EmployeeDetail id={Number(id)} />;
}
