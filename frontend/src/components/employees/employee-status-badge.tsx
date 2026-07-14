import { CircleCheck, CircleMinus, Clock, Hourglass, type LucideIcon } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { EmployeeStatus } from "@/types";

/* AA-safe tinted variants plus a leading glyph per status, so the badge never
   relies on color alone (mirrors the seat-status badge's icon language). */
const STATUS_CONFIG: Record<
  EmployeeStatus,
  { label: string; variant: BadgeProps["variant"]; icon: LucideIcon }
> = {
  ACTIVE: { label: "Active", variant: "success", icon: CircleCheck },
  ON_LEAVE: { label: "On leave", variant: "warning", icon: Clock },
  PENDING_ALLOCATION: { label: "Pending allocation", variant: "info", icon: Hourglass },
  EXITED: { label: "Exited", variant: "outline", icon: CircleMinus },
};

export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  const { label, variant, icon: Icon } = STATUS_CONFIG[status];
  return (
    <Badge variant={variant}>
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      {label}
    </Badge>
  );
}
