"use client";

import * as React from "react";
import { formatNumber } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  /** Renders each frame's value (receives a float — round inside). */
  format?: (value: number) => string;
  durationMs?: number;
}

/**
 * Count-up for headline metrics. Animates from the previously shown value
 * (0 on mount) with an ease-out cubic, so live refetches tick rather than
 * snap. Skips straight to the final value under prefers-reduced-motion.
 * The animated span is aria-hidden; AT reads one stable final value.
 */
export function AnimatedNumber({
  value,
  format = (v) => formatNumber(Math.round(v)),
  durationMs = 800,
}: AnimatedNumberProps) {
  const [display, setDisplay] = React.useState(0);
  const shownRef = React.useRef(0);

  React.useEffect(() => {
    const from = shownRef.current;
    shownRef.current = value;
    if (from === value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return (
    <>
      <span aria-hidden="true">{format(display)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
