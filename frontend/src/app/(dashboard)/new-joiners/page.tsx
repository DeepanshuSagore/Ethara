import type { Metadata } from "next";
import { NewJoinersScreen } from "@/components/employees/new-joiners-screen";

export const metadata: Metadata = { title: "New Joiners" };

export default function NewJoinersPage() {
  return <NewJoinersScreen />;
}
