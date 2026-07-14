"use client";

import * as React from "react";
import { AnimatedNumber } from "@/components/charts/animated-number";
import { cn } from "@/lib/utils";

export interface DonutSegment {
  /** Absolute value; shares derive from the segments' sum. */
  value: number;
  /** SVG stroke, e.g. "var(--success)". */
  stroke: string;
}

interface DonutStatProps {
  /** 0–100 */
  pct: number;
  label: string;
  /** Part-of-whole arcs (status hues). Omit for the single accent gauge. */
  segments?: DonutSegment[];
  size?: number;
  className?: string;
}

/**
 * SVG radial gauge for a single headline percentage. First paint renders the
 * ring empty; a post-mount frame flips it to the live value so the dash-offset
 * transition sweeps it in (and the center number counts up alongside). With
 * `segments`, the ring is a true part-of-whole: one butt-capped arc per
 * non-zero segment, 2px surface gaps between fills, growing contiguously from
 * 12 o'clock. The wrapper carries the one aria-label with the headline stat;
 * the svg and center overlay are presentational, and per-segment values live
 * in the adjacent legend text, so nothing is announced twice.
 */
export function DonutStat({ pct, label, segments, size = 140, className }: DonutStatProps) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, pct));
  const gradientId = React.useId();

  const parts = (segments ?? []).filter((segment) => segment.value > 0);
  const total = parts.reduce((sum, segment) => sum + segment.value, 0);
  /* 2px gap between fills — same spacer the stacked floor bars use. */
  const gap = parts.length > 1 ? 2 : 0;

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
        <defs>
          {/* Sky→cyan sweep, resolved from the theme tokens at render time. */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-solid)" />
            <stop offset="100%" stopColor="var(--tone-cyan)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth={stroke}
        />
        {parts.length > 0 && total > 0 ? (
          /* Both dash props transition together, so at any progress p each arc
             starts at p·start with length p·len: the segments stay contiguous
             while the whole ring sweeps in from 12 o'clock. */
          (() => {
            let start = 0;
            return parts.map((segment, i) => {
              const len = (segment.value / total) * circumference;
              const startLen = start;
              start += len;
              const drawnLen = Math.max(len - gap, 0);
              return (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={segment.stroke}
                  className="transition-[stroke-dasharray,stroke-dashoffset] duration-700 ease-out"
                  strokeWidth={stroke}
                  strokeLinecap="butt"
                  strokeDasharray={
                    drawn ? `${drawnLen} ${circumference - drawnLen}` : `0 ${circumference}`
                  }
                  strokeDashoffset={drawn ? -startLen : 0}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
            });
          })()
        ) : (
          /* Dash-offset transition only — sanctioned donut motion. The dark
             drop-shadow gives the ring a neon edge against the near-black. */
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            className="transition-[stroke-dashoffset] duration-700 ease-out dark:drop-shadow-[0_0_6px_rgba(56,189,248,0.35)]"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - shown / 100)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
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
