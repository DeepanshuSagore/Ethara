"use client";

import * as React from "react";
import { AnimatedNumber } from "@/components/charts/animated-number";
import { cn } from "@/lib/utils";

interface DonutStatProps {
  /** 0–100 */
  pct: number;
  label: string;
  size?: number;
  className?: string;
}

/**
 * SVG radial gauge for a single headline percentage. First paint renders the
 * ring empty; a post-mount frame flips it to the live value so the dash-offset
 * transition sweeps it in (and the center number counts up alongside). The
 * wrapper carries the one aria-label with the actual stat; the svg and center
 * overlay are presentational so the value is announced exactly once.
 */
export function DonutStat({ pct, label, size = 140, className }: DonutStatProps) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, pct));

  const [drawn, setDrawn] = React.useState(false);
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const shown = drawn ? clamped : 0;

  return (
    <div
      role="img"
      aria-label={`${clamped}% ${label}`}
      className={cn("relative inline-flex items-center justify-center", className)}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="h-auto max-w-full"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth={stroke}
        />
        {/* Dash-offset transition only — sanctioned donut motion. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-accent-solid transition-[stroke-dashoffset] duration-700 ease-out"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-metric font-mono text-3xl font-semibold tracking-tight">
          <AnimatedNumber value={clamped} format={(v) => `${Math.round(v)}%`} durationMs={700} />
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
