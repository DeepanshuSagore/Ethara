import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* Status variants pair a -soft tint background with -strong text so 12px
   labels hold ≥4.5:1 in both themes (raw solid-on-tint fails WCAG AA). */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        accent: "border-accent-foreground/15 bg-accent text-accent-foreground",
        outline: "border-border text-foreground",
        success: "border-success-strong/20 bg-success-soft text-success-strong",
        warning: "border-warning-strong/20 bg-warning-soft text-warning-strong",
        destructive: "border-destructive-strong/20 bg-destructive-soft text-destructive-strong",
        info: "border-info-strong/20 bg-info-soft text-info-strong",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
