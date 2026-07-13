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
import { useMockData, type DashboardMetrics } from "@/lib/mock/store";
import type { Employee, Project, Seat } from "@/types";
import { formatNumber } from "@/lib/utils";

const WELCOME: ChatMessage = {
  id: 1,
  role: "assistant",
  content:
    "Hi! I can answer questions about seats, projects and availability from the directory. Try one of the suggestions below — real AI answers arrive in Phase 8; for now I reply from mock data.",
};

/**
 * Canned keyword-based replies over the mock dataset — a stand-in until the
 * Phase 8 backend `/ai/query` endpoint powers this screen.
 */
function mockReply(
  query: string,
  ctx: {
    employees: Employee[];
    projects: Project[];
    seats: Seat[];
    seatByEmployee: Map<number, Seat>;
    projectsById: Map<number, Project>;
    metrics: DashboardMetrics;
  }
): string {
  const q = query.toLowerCase();

  // Employee lookup — by email or by name.
  const employee =
    ctx.employees.find((e) => q.includes(e.email.toLowerCase())) ??
    ctx.employees.find((e) => q.includes(e.name.toLowerCase()));
  if (employee) {
    const project = ctx.projectsById.get(employee.project_id);
    const seat = ctx.seatByEmployee.get(employee.id);
    if (seat) {
      return `${employee.name} is seated on Floor ${seat.floor}, Zone ${seat.zone}, Bay ${seat.bay}, Seat ${seat.seat_code}. ${employee.name.split(" ")[0]} is assigned to Project ${project?.name}.`;
    }
    if (employee.status === "PENDING_ALLOCATION") {
      return `${employee.name} joined recently and is still waiting for a seat. They are assigned to Project ${project?.name} — check the New Joiners queue for suggested seats.`;
    }
    return `${employee.name} (${project?.name}) has no active seat allocation right now.`;
  }

  // Available seats on a floor.
  const floorMatch = q.match(/floor\s*(\d+)/);
  if (q.includes("available") && floorMatch) {
    const floor = Number(floorMatch[1]);
    const available = ctx.seats.filter(
      (s) => s.floor === floor && s.status === "AVAILABLE"
    );
    if (available.length === 0) {
      return `There are no available seats on Floor ${floor} right now — try another floor.`;
    }
    const codes = available.slice(0, 8).map((s) => s.seat_code).join(", ");
    return `Floor ${floor} has ${available.length} available seats: ${codes}${available.length > 8 ? ", …" : ""}. Open the seat map to allocate one.`;
  }

  // Occupancy for a project.
  const project = ctx.projects.find((p) => q.includes(p.name.toLowerCase()));
  if (project) {
    const seated = ctx.employees.filter(
      (e) => e.project_id === project.id && ctx.seatByEmployee.has(e.id)
    ).length;
    return `Project ${project.name} currently occupies ${seated} seats in the demo dataset. Its team clusters around one home zone — see the project page for the member list.`;
  }

  // Overall utilization.
  if (q.includes("utilization") || q.includes("occupied")) {
    return `Overall seat utilization is ${ctx.metrics.utilizationPct}% — ${formatNumber(ctx.metrics.display.occupied)} of ${formatNumber(ctx.metrics.display.totalSeats)} seats are occupied, with ${formatNumber(ctx.metrics.display.available)} available.`;
  }

  return `I couldn't match that to the mock data yet. Try asking about a specific employee ("Where is Amit Sharma seated?"), a floor ("available seats on Floor 3") or a project ("seats occupied for Indigo"). The full AI assistant arrives in Phase 8.`;
}

export function ChatPanel() {
  const { employees, projects, seats, seatByEmployee, projectsById, metrics } = useMockData();

  const [messages, setMessages] = React.useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = React.useState("");
  const [thinking, setThinking] = React.useState(false);
  const nextId = React.useRef(2);
  const scrollRef = React.useRef<HTMLDivElement>(null);

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
    setThinking(true);

    const reply = mockReply(trimmed, {
      employees,
      projects,
      seats,
      seatByEmployee,
      projectsById,
      metrics,
    });
    window.setTimeout(() => {
      setMessages((prev) => [...prev, { id: nextId.current++, role: "assistant", content: reply }]);
      setThinking(false);
    }, 700);
  };

  return (
    <>
      <PageHeader
        title="Assistant"
        description="Ask natural-language questions about seats, projects and availability."
        actions={<Badge variant="outline">Mock replies · real AI in Phase 8</Badge>}
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
