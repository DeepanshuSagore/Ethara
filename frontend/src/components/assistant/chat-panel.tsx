"use client";

import * as React from "react";
import { SendHorizontal, Sparkles } from "lucide-react";
import {
  MessageBubble,
  TypingIndicator,
  type ChatMessage,
} from "@/components/assistant/message-bubble";
import { PromptGrid, SuggestedPrompts } from "@/components/assistant/suggested-prompts";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api/client";
import { useAiQuery } from "@/lib/api/hooks";

export function ChatPanel() {
  const aiQuery = useAiQuery();

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const nextId = React.useRef(1);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const thinking = aiQuery.isPending;
  // No conversation yet: the log gives way to a composed invitation state.
  const pristine = messages.length === 0;

  React.useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [messages, thinking]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;

    setMessages((prev) => [...prev, { id: nextId.current++, role: "user", content: trimmed }]);
    setInput("");

    // Recent turns ride along so follow-ups ("and floor 2?") keep context;
    // error bubbles are UI state, not conversation.
    const history = messages
      .filter((message) => !message.error)
      .slice(-8)
      .map(({ role, content }) => ({ role, content }));

    // POST /ai/query — Groq NL parsing + grounded chat, deterministic fallback.
    aiQuery.mutate({ query: trimmed, history }, {
      onSuccess: ({ answer }) =>
        setMessages((prev) => [
          ...prev,
          { id: nextId.current++, role: "assistant", content: answer },
        ]),
      onError: (error) =>
        setMessages((prev) => [
          ...prev,
          {
            id: nextId.current++,
            role: "assistant",
            content: `I couldn't reach the directory: ${errorMessage(error)}`,
            error: true,
            retryPrompt: trimmed,
          },
        ]),
    });
  };

  return (
    <>
      <PageHeader
        eyebrow="AI Assistant"
        title="Assistant"
        description="Ask natural-language questions about seats, projects and availability."
        actions={
          <Badge variant="outline" className="whitespace-nowrap">
            <Sparkles className="size-3 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Groq NL · answers from the live directory</span>
            <span className="sm:hidden">Groq NL</span>
          </Badge>
        }
      />

      <Card className="flex min-h-96 flex-1 flex-col overflow-hidden">
        {pristine ? (
          /* Composed invitation: brand mark, one-line promise, and the four
             starter questions as real targets — no dead space, no lone bubble. */
          <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-6">
            <div className="animate-rise flex flex-col items-center gap-3 text-center">
              <span
                aria-hidden="true"
                className="flex size-12 items-center justify-center rounded-xl bg-linear-to-br from-accent-solid to-tone-violet text-white shadow-[0_4px_18px_-4px] shadow-accent-solid/50"
              >
                <Sparkles className="size-5" />
              </span>
              <h2 className="font-display text-xl font-semibold tracking-tight">
                Ask the directory
              </h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Ask in your own words: who sits where, what&apos;s free, how full a team or
                floor is. Every answer comes from the live directory.
              </p>
            </div>
            <PromptGrid onPick={send} disabled={thinking} />
          </div>
        ) : (
          /* role="log" is an implicitly polite live region with chat semantics;
             tabIndex lets keyboard users scroll the history (inset ring — the
             card's overflow-hidden would clip an outset one). */
          <div
            ref={scrollRef}
            role="log"
            tabIndex={0}
            aria-label="Conversation"
            className="flex-1 space-y-4 overflow-y-auto p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-inset"
          >
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} onRetry={send} />
            ))}
            {thinking && <TypingIndicator />}
          </div>
        )}

        <div className="space-y-3 border-t border-border p-4">
          {!pristine && <SuggestedPrompts onPick={send} disabled={thinking} />}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a seat, employee or project…"
              aria-label="Message the assistant"
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Send message"
              disabled={!input.trim() || thinking}
            >
              <SendHorizontal aria-hidden="true" />
            </Button>
          </form>
        </div>
      </Card>
    </>
  );
}
