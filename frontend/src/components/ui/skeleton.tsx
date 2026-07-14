import { cn } from "@/lib/utils";

/**
 * Shimmer placeholder — a compositor-friendly gradient sweep (translateX,
 * not background-position) over the muted base. Reads as "in motion" where
 * a plain pulse reads as "stalled"; reduced-motion collapses it globally.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted before:absolute before:inset-0 before:animate-shimmer before:bg-linear-to-r before:from-transparent before:via-foreground/5 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
