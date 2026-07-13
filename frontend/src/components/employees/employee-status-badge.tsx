import { Badge } from "@/components/ui/badge";
import type { EmployeeStatus } from "@/types";

const STATUS_CONFIG: Record<
  EmployeeStatus,
  { label: string; variant: "success" | "warning" | "info" | "outline" }
> = {
  ACTIVE: { label: "Active", variant: "success" },
  ON_LEAVE: { label: "On leave", variant: "warning" },
  PENDING_ALLOCATION: { label: "Pending allocation", variant: "info" },
  EXITED: { label: "Exited", variant: "outline" },
};

export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
