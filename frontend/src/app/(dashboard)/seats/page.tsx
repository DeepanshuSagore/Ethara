import type { Metadata } from "next";
import { Sofa } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Seats" };

export default function SeatsPage() {
  return (
    <>
      <PageHeader
        title="Seats"
        description="Interactive seat map by floor and zone with availability at a glance."
      />
      <ComingSoon
        icon={Sofa}
        title="Seat map"
        description="A grid of ~5,600 seats across 5 floors and 10 zones with a status legend and allocation dialog — arriving in Phase 2."
      />
    </>
  );
}
