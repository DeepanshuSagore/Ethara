import { AnimatedTitle } from "@/components/typography/animated-title";
import { DecodeText } from "@/components/typography/decode-text";
import { cn } from "@/lib/utils";

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  /** Drafting-annotation kicker above the title, e.g. "Directory". */
  eyebrow?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      {...props}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow && (
          <p className="text-eyebrow flex items-center gap-2">
            <span
              aria-hidden="true"
              className="animate-hairline inline-block h-px w-5 origin-left bg-accent-solid"
            />
            <DecodeText text={eyebrow} />
          </p>
        )}
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          <AnimatedTitle text={title} />
        </h1>
        {description && (
          <p
            className="animate-rise max-w-2xl text-sm text-muted-foreground"
            style={{ animationDelay: "120ms" }}
          >
            {description}
          </p>
        )}
      </div>
      {actions && (
        // Wraps instead of overflowing on narrow viewports; badge (span)
        // actions are clamped and truncated so long pills can't blob-wrap.
        <div
          className="animate-rise flex min-w-0 max-w-full flex-wrap items-center gap-2 sm:justify-end [&>span]:min-w-0 [&>span]:max-w-full [&>span]:truncate"
          style={{ animationDelay: "160ms" }}
        >
          {actions}
        </div>
      )}
    </div>
  );
}

interface SectionHeadingProps {
  /** Drawing-sheet index, e.g. "01" — rendered in the accent ink. */
  index?: string;
  title: string;
  className?: string;
}

/**
 * Blueprint section rule: numbered mono kicker + hairline that draws itself
 * across the page on entry. Renders a real h2 so long screens keep a
 * scannable outline (cards below should use h3 titles).
 */
export function SectionHeading({ index, title, className }: SectionHeadingProps) {
  return (
    <div className={cn("flex items-center gap-3 pb-3", className)}>
      {index && (
        <span aria-hidden="true" className="text-eyebrow text-accent-solid">
          {index}
        </span>
      )}
      <h2 className="text-eyebrow whitespace-nowrap">{title}</h2>
      <span
        aria-hidden="true"
        className="animate-hairline h-px min-w-6 flex-1 origin-left bg-border"
      />
    </div>
  );
}
