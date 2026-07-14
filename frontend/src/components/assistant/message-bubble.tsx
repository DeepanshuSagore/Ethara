import { AlertTriangle, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  /** Marks a failed-request reply so it renders with the destructive treatment. */
  error?: boolean;
  /** The original prompt, kept so the error bubble can offer a retry. */
  retryPrompt?: string;
}

interface MessageBubbleProps {
  message: ChatMessage;
  /** Re-sends the failed prompt; only rendered on error bubbles. */
  onRetry?: (prompt: string) => void;
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant";
  const isError = Boolean(message.error);

  return (
    <div className={cn("flex animate-in gap-3", !isAssistant && "flex-row-reverse")}>
      {isAssistant && (
        <span
          aria-hidden="true"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            isError
              ? "bg-destructive-soft text-destructive-strong"
              : "bg-accent text-accent-foreground"
          )}
        >
          {isError ? <AlertTriangle className="size-4" /> : <Sparkles className="size-4" />}
        </span>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[75%]",
          isAssistant
            ? isError
              ? "rounded-bl-md border border-destructive-strong/20 bg-destructive-soft text-destructive-strong"
              : "rounded-bl-md border border-border bg-card shadow-soft"
            : "rounded-br-md bg-primary text-primary-foreground"
        )}
      >
        <p className="whitespace-pre-wrap wrap-break-word">{message.content}</p>
        {isError && message.retryPrompt && onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => onRetry(message.retryPrompt!)}
          >
            <RotateCcw aria-hidden="true" />
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div role="status" className="flex animate-in gap-3">
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"
      >
        <Sparkles className="size-4" />
      </span>
      <div
        aria-hidden="true"
        className="flex items-center gap-1 rounded-xl rounded-bl-md border border-border bg-card px-4 py-3 shadow-soft"
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
      <span className="sr-only">Assistant is thinking</span>
    </div>
  );
}
