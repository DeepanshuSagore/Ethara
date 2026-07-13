import type { Metadata } from "next";
import { Suspense } from "react";
import { SeatMap } from "@/components/seats/seat-map";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Seats" };

export default function SeatsPage() {
  return (
    // Suspense boundary is required around useSearchParams (?floor= deep link).
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <SeatMap />
    </Suspense>
  );
}
