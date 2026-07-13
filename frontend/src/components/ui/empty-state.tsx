import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Buttons/links rendered under the message (e.g. "Clear filters"). */
  action?: React.ReactNode;
  /** Override the icon chip tone, e.g. "bg-success/15 text-success". */
  iconWrapClassName?: string;
  className?: string;
}

/** Designed empty state for lists, tables and cards: icon + message + action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  iconWrapClassName,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className
      )}
    >
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground",
          iconWrapClassName
        )}
      >
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}
