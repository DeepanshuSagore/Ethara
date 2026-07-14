import type { Metadata } from "next";
import { RoleGate } from "@/components/layout/restricted";
import { AnalyticsScreen } from "@/components/analytics/analytics-screen";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <RoleGate href="/analytics" eyebrow="Insights" title="Analytics">
      <AnalyticsScreen />
    </RoleGate>
  );
}
