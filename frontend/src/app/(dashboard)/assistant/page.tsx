import type { Metadata } from "next";
import { ChatPanel } from "@/components/assistant/chat-panel";

export const metadata: Metadata = { title: "Assistant" };

export default function AssistantPage() {
  return <ChatPanel />;
}
