"use client";

import * as React from "react";
import { SendHorizontal, Sparkles } from "lucide-react";
import {
  MessageBubble,
  TypingIndicator,
  type ChatMessage,
} from "@/components/assistant/message-bubble";
import { SuggestedPrompts } from "@/components/assistant/suggested-prompts";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api/client";
import { useAiQuery } from "@/lib/api/hooks";

const WELCOME: ChatMessage = {
  id: 1,
  role: "assistant",
  content:
    "Hi! Ask me anything about seats, projects and availability in your own words — Groq understands the question and every answer comes straight from the live directory. Try a suggestion below, or ask things like “which floor has the most free seats?”",
};

export function ChatPanel() {
  const aiQuery = useAiQuery();

  const [messages, setMessages] = React.useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = React.useState("");
  const nextId = React.useRef(2);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const thinking = aiQuery.isPending;

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

    // POST /ai/query — Groq NL parsing with a deterministic DB fallback.
    aiQuery.mutate(trimmed, {
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
        {/* role="log" is an implicitly polite live region with chat semantics;
            tabIndex lets keyboard users scroll the history (inset ring — the
            card's overflow-hidden would clip an outset one). */}
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

        <div className="space-y-3 border-t border-border p-4">
          <SuggestedPrompts onPick={send} disabled={thinking} />
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
