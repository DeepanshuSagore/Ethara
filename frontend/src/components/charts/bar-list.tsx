import Link from "next/link";
import { cn } from "@/lib/utils";

export interface BarListItem {
  key: string;
  label: string;
  /** Bar length is value / max (or value / max(values) when max is omitted). */
  value: number;
  /** Right-aligned metric text (defaults to the raw value). */
  displayValue?: string;
  /** Small muted text under the label. */
  secondary?: string;
  href?: string;
}

/* Rows cycle through the identity tones (same order as the KPI cards) so
   sibling bars stop reading as clones. Hue is differentiation, not meaning —
   the label + swatch dot carry identity, so grayscale still works. Literal
   class strings keep every tone visible to the Tailwind scanner. */
const BAR_TONES = [
  { dot: "bg-tone-sky", fill: "from-tone-sky/60 to-tone-sky", glow: "dark:shadow-tone-sky/35" },
  {
    dot: "bg-tone-violet",
    fill: "from-tone-violet/60 to-tone-violet",
    glow: "dark:shadow-tone-violet/35",
  },
  {
    dot: "bg-tone-emerald",
    fill: "from-tone-emerald/60 to-tone-emerald",
    glow: "dark:shadow-tone-emerald/35",
  },
  {
    dot: "bg-tone-amber",
    fill: "from-tone-amber/60 to-tone-amber",
    glow: "dark:shadow-tone-amber/35",
  },
  { dot: "bg-tone-rose", fill: "from-tone-rose/60 to-tone-rose", glow: "dark:shadow-tone-rose/35" },
  { dot: "bg-tone-cyan", fill: "from-tone-cyan/60 to-tone-cyan", glow: "dark:shadow-tone-cyan/35" },
] as const;

interface BarListProps {
  items: BarListItem[];
  /**
   * Scale denominator. Pass 100 for percentage values (or the true capacity
   * for counts) so a half-full top row renders half-wide instead of always
   * filling the track. Defaults to max(values) for magnitude comparison.
   */
  max?: number;
  /** Shown instead of a blank body when items is empty. */
  emptyMessage?: string;
  className?: string;
}

/**
 * Horizontal bar list — magnitude comparison across categories. Each row
 * cycles an identity tone (dot + gradient fill); the real identity stays in
 * the row label. Each row carries one aria-label with the real values; the
 * visuals inside are presentational, so screen readers hear the data once.
 */
export function BarList({
  items,
  max,
  emptyMessage = "No data to show yet.",
  className,
}: BarListProps) {
  if (items.length === 0) {
    return (
      <p className={cn("px-1 py-4 text-sm text-muted-foreground", className)}>{emptyMessage}</p>
    );
  }

  const denominator = Math.max(1, max ?? Math.max(...items.map((item) => item.value)));

  return (
    <ol className={cn("space-y-3", className)}>
      {items.map((item, index) => {
        const ratio =
          item.value <= 0 ? 0 : Math.min(1, Math.max(0.02, item.value / denominator));
        const valueText = item.displayValue ?? String(item.value);
        const description = item.secondary
          ? `${item.label}: ${valueText} (${item.secondary})`
          : `${item.label}: ${valueText}`;
        const tone = BAR_TONES[index % BAR_TONES.length];

        const row = (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn("size-2 shrink-0 rounded-full", tone.dot)}
                />
                <span
                  className={cn(
                    "truncate text-sm font-medium",
                    item.href && "text-accent-solid"
                  )}
                >
                  {item.label}
                </span>
              </span>
              <span className="text-metric shrink-0 font-mono text-sm text-muted-foreground">
                {valueText}
              </span>
            </div>
            {item.secondary && (
              <p className="mt-0.5 truncate pl-4 text-xs text-muted-foreground">
                {item.secondary}
              </p>
            )}
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
              {/* scaleX (not width) keeps the fill animation on the compositor.
                  bar-grow sweeps each fill from zero to its inline value on
                  mount, one row after the next; the transition covers later
                  data refreshes. */}
              <div
                className={cn(
                  "animate-bar-grow h-full w-full origin-left rounded-full bg-linear-to-r transition-transform duration-200 ease-out dark:shadow-[0_0_10px]",
                  tone.fill,
                  tone.glow
                )}
                style={{
                  transform: `scaleX(${ratio})`,
                  animationDelay: `${Math.min(index, 8) * 55}ms`,
                }}
              />
            </div>
          </>
        );

        return (
          <li key={item.key}>
            {item.href ? (
              <Link
                href={item.href}
                aria-label={description}
                className="block cursor-pointer rounded-lg px-1 py-0.5 transition-colors duration-150 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {row}
              </Link>
            ) : (
              <div role="img" aria-label={description} className="px-1 py-0.5">
                {row}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
