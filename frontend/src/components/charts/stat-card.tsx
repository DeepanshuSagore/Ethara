import type { LucideIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/charts/animated-number";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  /** Numbers count up on load; strings render statically. */
  value: string | number;
  /** Custom render for numeric values, e.g. percentages (defaults to formatNumber). */
  format?: (value: number) => string;
  hint?: string;
  icon: LucideIcon;
}

/**
 * Blueprint KPI card — drawing-annotation label, mono metric, accent icon
 * chip. The size-9 chip fixes the top row's height, so metrics stay aligned
 * across a grid even when a label wraps to two lines. Static (not a link),
 * so no hover lift.
 */
export function StatCard({ label, value, format, hint, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-eyebrow min-w-0">{label}</p>
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"
            aria-hidden="true"
          >
            <Icon className="size-4" />
          </span>
        </div>
        <p className="text-metric mt-3 font-mono text-3xl font-semibold tracking-tight">
          {typeof value === "number" ? <AnimatedNumber value={value} format={format} /> : value}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
