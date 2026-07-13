import type { Metadata } from "next";
import { Suspense } from "react";
import { SeatMap } from "@/components/seats/seat-map";
import { SeatMapSkeleton } from "@/components/seats/seat-map-skeleton";

export const metadata: Metadata = { title: "Seats" };

export default function SeatsPage() {
  return (
    // Suspense boundary is required around useSearchParams (?floor= deep
    // link); the fallback matches the route's loading.tsx shape.
    <Suspense fallback={<SeatMapSkeleton />}>
      <SeatMap />
    </Suspense>
  );
}
