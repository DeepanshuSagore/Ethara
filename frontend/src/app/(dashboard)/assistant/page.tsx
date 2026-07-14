import type { Metadata } from "next";
import { ChatPanel } from "@/components/assistant/chat-panel";

export const metadata: Metadata = { title: "Assistant" };

export default function AssistantPage() {
  /* flex-1 lets the chat card grow to the viewport inside the shell's
     `flex min-h-full flex-col` content wrapper — no height magic. */
  return (
    <div className="flex flex-1 flex-col">
      <ChatPanel />
    </div>
  );
}
