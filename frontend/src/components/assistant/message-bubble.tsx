import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === "assistant";

  return (
    <div className={cn("flex gap-3", !isAssistant && "flex-row-reverse")}>
      {isAssistant && (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
      )}
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm sm:max-w-[70%]",
          isAssistant
            ? "rounded-tl-md bg-muted text-foreground"
            : "rounded-tr-md bg-primary text-primary-foreground"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Sparkles className="size-4" aria-hidden="true" />
      </span>
      <div
        className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-muted px-4 py-3"
        aria-label="Assistant is typing"
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
