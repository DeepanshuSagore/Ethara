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
    /* p-1/-m-1 gives the focus ring room inside the horizontal scroller. */
    <div
      role="group"
      aria-label="Suggested prompts"
      className="-m-1 flex gap-2 overflow-x-auto p-1 sm:flex-wrap"
    >
      {SUGGESTED_PROMPTS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          aria-disabled={disabled ? true : undefined}
          onClick={() => {
            if (disabled) return;
            onPick(prompt);
          }}
          className="shrink-0 cursor-pointer whitespace-nowrap rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-150 hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
