import type { LucideIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/charts/animated-number";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatTone = "sky" | "violet" | "emerald" | "amber" | "rose" | "cyan";

/* Identity per KPI: chip tint + a gradient hairline along the card's top
   edge. Meaning still lives in the label — the hue only breaks the
   every-card-looks-identical monotony, so grayscale stays legible. */
const TONE_STYLES: Record<StatTone, { chip: string; line: string }> = {
  sky: {
    chip: "bg-tone-sky-soft text-tone-sky-strong",
    line: "via-tone-sky/70",
  },
  violet: {
    chip: "bg-tone-violet-soft text-tone-violet-strong",
    line: "via-tone-violet/70",
  },
  emerald: {
    chip: "bg-tone-emerald-soft text-tone-emerald-strong",
    line: "via-tone-emerald/70",
  },
  amber: {
    chip: "bg-tone-amber-soft text-tone-amber-strong",
    line: "via-tone-amber/70",
  },
  rose: {
    chip: "bg-tone-rose-soft text-tone-rose-strong",
    line: "via-tone-rose/70",
  },
  cyan: {
    chip: "bg-tone-cyan-soft text-tone-cyan-strong",
    line: "via-tone-cyan/70",
  },
};

interface StatCardProps {
  label: string;
  /** Numbers count up on load; strings render statically. */
  value: string | number;
  /** Custom render for numeric values, e.g. percentages (defaults to formatNumber). */
  format?: (value: number) => string;
  hint?: string;
  icon: LucideIcon;
  /** Identity hue — assign a different tone per sibling card. */
  tone?: StatTone;
}

/**
 * Blueprint KPI card — drawing-annotation label, mono metric, toned icon
 * chip and top hairline. The size-9 chip fixes the top row's height, so
 * metrics stay aligned across a grid even when a label wraps to two lines.
 */
export function StatCard({ label, value, format, hint, icon: Icon, tone = "sky" }: StatCardProps) {
  const styles = TONE_STYLES[tone];

  return (
    <Card className="hover-lift group relative overflow-hidden">
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-4 top-0 h-px bg-linear-to-r from-transparent to-transparent",
          styles.line
        )}
      />
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-eyebrow min-w-0">{label}</p>
          <span
            className={cn(
              "ease-spring flex size-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110",
              styles.chip
            )}
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
