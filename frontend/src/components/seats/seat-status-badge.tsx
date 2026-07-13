import { Badge } from "@/components/ui/badge";
import type { SeatStatus } from "@/types";

export const SEAT_STATUS_LABELS: Record<SeatStatus, string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  RESERVED: "Reserved",
  MAINTENANCE: "Maintenance",
};

const VARIANTS: Record<SeatStatus, "success" | "accent" | "warning" | "secondary"> = {
  AVAILABLE: "success",
  OCCUPIED: "accent",
  RESERVED: "warning",
  MAINTENANCE: "secondary",
};

export function SeatStatusBadge({ status }: { status: SeatStatus }) {
  return <Badge variant={VARIANTS[status]}>{SEAT_STATUS_LABELS[status]}</Badge>;
}
