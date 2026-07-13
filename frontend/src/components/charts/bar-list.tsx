import Link from "next/link";
import { cn } from "@/lib/utils";

export interface BarListItem {
  key: string;
  label: string;
  /** Bar length is value / max(values). */
  value: number;
  /** Right-aligned metric text (defaults to the raw value). */
  displayValue?: string;
  /** Small muted text under the label. */
  secondary?: string;
  href?: string;
}

interface BarListProps {
  items: BarListItem[];
  className?: string;
}

/**
 * Horizontal single-hue bar list — magnitude comparison across categories.
 * Identity lives in the row label (never color), so one hue is correct.
 */
export function BarList({ items, className }: BarListProps) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <ol className={cn("space-y-3", className)}>
      {items.map((item) => {
        const row = (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium">{item.label}</span>
              <span className="text-metric shrink-0 text-sm text-muted-foreground">
                {item.displayValue ?? item.value}
              </span>
            </div>
            {item.secondary && (
              <p className="mt-0.5 text-xs text-muted-foreground">{item.secondary}</p>
            )}
            <div
              className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${item.label}: ${item.displayValue ?? item.value}`}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
              />
            </div>
          </>
        );

        return (
          <li key={item.key}>
            {item.href ? (
              <Link
                href={item.href}
                className="block rounded-lg px-1 py-0.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {row}
              </Link>
            ) : (
              <div className="px-1 py-0.5">{row}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
