import { CircleCheck, Lock, User, Wrench, type LucideIcon } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { SeatStatus } from "@/types";

export const SEAT_STATUS_LABELS: Record<SeatStatus, string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  RESERVED: "Reserved",
  MAINTENANCE: "Maintenance",
};

/* AA-safe tinted variants plus a leading glyph per status, so the badge never
   relies on color alone (mirrors the icon language of the seat cells). */
const STATUS_CONFIG: Record<SeatStatus, { variant: BadgeProps["variant"]; icon: LucideIcon }> = {
  AVAILABLE: { variant: "success", icon: CircleCheck },
  OCCUPIED: { variant: "accent", icon: User },
  RESERVED: { variant: "warning", icon: Lock },
  MAINTENANCE: { variant: "secondary", icon: Wrench },
};

export function SeatStatusBadge({ status }: { status: SeatStatus }) {
  const { variant, icon: Icon } = STATUS_CONFIG[status];
  return (
    <Badge variant={variant}>
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      {SEAT_STATUS_LABELS[status]}
    </Badge>
  );
}
