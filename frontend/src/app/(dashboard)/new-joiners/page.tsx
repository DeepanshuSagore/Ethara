import type { Metadata } from "next";
import { RoleGate } from "@/components/layout/restricted";
import { NewJoinersScreen } from "@/components/employees/new-joiners-screen";

export const metadata: Metadata = { title: "New Joiners" };

export default function NewJoinersPage() {
  return (
    <RoleGate href="/new-joiners" eyebrow="Onboarding" title="New Joiners">
      <NewJoinersScreen />
    </RoleGate>
  );
}
