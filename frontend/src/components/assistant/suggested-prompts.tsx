"use client";

import {
  Armchair,
  FolderKanban,
  Gauge,
  UserRoundSearch,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* One identity tone per query type (person / seats / project / metrics),
   mirroring the KPI-card hues. Literal class strings keep every tone visible
   to the Tailwind scanner. */
export const SUGGESTED_PROMPTS: { text: string; icon: LucideIcon; chip: string }[] = [
  {
    text: "Where is Amit Sharma seated?",
    icon: UserRoundSearch,
    chip: "bg-tone-sky-soft text-tone-sky-strong",
  },
  {
    text: "Show all available seats on Floor 3",
    icon: Armchair,
    chip: "bg-tone-emerald-soft text-tone-emerald-strong",
  },
  {
    text: "How many seats are occupied for Indigo?",
    icon: FolderKanban,
    chip: "bg-tone-violet-soft text-tone-violet-strong",
  },
  {
    text: "What is the current seat utilization?",
    icon: Gauge,
    chip: "bg-tone-cyan-soft text-tone-cyan-strong",
  },
];

interface SuggestedPromptsProps {
  onPick: (prompt: string) => void;
  disabled?: boolean;
}

/**
 * Centered 2x2 prompt cards for the pristine (no conversation) state — the
 * composed empty state that shows what the assistant can answer.
 */
export function PromptGrid({ onPick, disabled }: SuggestedPromptsProps) {
  return (
    <div
      role="group"
      aria-label="Suggested prompts"
      className="stagger-children grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {SUGGESTED_PROMPTS.map(({ text, icon: Icon, chip }) => (
        <button
          key={text}
          type="button"
          aria-disabled={disabled ? true : undefined}
          onClick={() => {
            if (disabled) return;
            onPick(text);
          }}
          className="hover-lift flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-left shadow-soft hover:border-accent-solid/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          <span
            aria-hidden="true"
            className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", chip)}
          >
            <Icon className="size-4" />
          </span>
          <span className="text-sm font-medium">{text}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Compact pill strip above the input — shown once a conversation exists, so
 * follow-up ideas stay one tap away without repeating the pristine grid.
 */
export function SuggestedPrompts({ onPick, disabled }: SuggestedPromptsProps) {
  return (
    /* p-1/-m-1 gives the focus ring room inside the horizontal scroller. */
    <div
      role="group"
      aria-label="Suggested prompts"
      className="-m-1 flex gap-2 overflow-x-auto p-1 sm:flex-wrap"
    >
      {SUGGESTED_PROMPTS.map(({ text }) => (
        <button
          key={text}
          type="button"
          aria-disabled={disabled ? true : undefined}
          onClick={() => {
            if (disabled) return;
            onPick(text);
          }}
          className="shrink-0 cursor-pointer whitespace-nowrap rounded-full border border-border bg-muted/40 px-3.5 py-1.5 text-xs text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          {text}
        </button>
      ))}
    </div>
  );
}
