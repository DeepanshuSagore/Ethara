"use client";

export const SUGGESTED_PROMPTS = [
  "Where is Amit Sharma seated?",
  "Show all available seats on Floor 3",
  "How many seats are occupied for Indigo?",
  "What is the current seat utilization?",
];

interface SuggestedPromptsProps {
  onPick: (prompt: string) => void;
  disabled?: boolean;
}

export function SuggestedPrompts({ onPick, disabled }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SUGGESTED_PROMPTS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          disabled={disabled}
          onClick={() => onPick(prompt)}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-soft transition-colors hover:border-primary hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
