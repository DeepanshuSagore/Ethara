import { cn } from "@/lib/utils";

interface AnimatedTitleProps {
  text: string;
  className?: string;
}

/**
 * Word-mask reveal for page titles: each word rises out of an overflow clip,
 * staggered left to right. Pure CSS (server-renderable) — it replays on
 * navigation because the route template remounts, and reduced-motion
 * collapses it globally. AT reads the plain string once via the sr-only copy.
 */
export function AnimatedTitle({ text, className }: AnimatedTitleProps) {
  const words = text.split(" ");

  return (
    <span className={cn("inline-block", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="inline-flex flex-wrap gap-x-[0.28em]">
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            // pb + negative mb keep descenders (y, j, p) inside the clip.
            className="-mb-[0.15em] inline-block overflow-hidden pb-[0.15em]"
          >
            <span
              className="animate-word-rise inline-block will-change-transform"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              {word}
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}
