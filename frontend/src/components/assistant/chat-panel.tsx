"use client";

import * as React from "react";
import { SendHorizontal } from "lucide-react";
import {
  MessageBubble,
  TypingIndicator,
  type ChatMessage,
} from "@/components/assistant/message-bubble";
import { SuggestedPrompts } from "@/components/assistant/suggested-prompts";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api/client";
import { useAiQuery } from "@/lib/api/hooks";

const WELCOME: ChatMessage = {
  id: 1,
  role: "assistant",
  content:
    "Hi! I answer questions about seats, projects and availability straight from the live directory. Try one of the suggestions below — for example, ask where someone sits by name or email.",
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

    // POST /ai/query — deterministic engine today, Groq NL in Phase 8.
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
          },
        ]),
    });
  };

  return (
    <>
      <PageHeader
        title="Assistant"
        description="Ask natural-language questions about seats, projects and availability."
        actions={<Badge variant="outline">Answers from the live API · Groq NL in Phase 8</Badge>}
      />

      <Card className="flex h-[calc(100dvh-14rem)] min-h-[28rem] flex-col">
        <CardContent
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto p-6"
          aria-live="polite"
        >
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {thinking && <TypingIndicator />}
        </CardContent>

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
            <Button type="submit" size="icon" disabled={!input.trim() || thinking}>
              <SendHorizontal />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </Card>
    </>
  );
}
