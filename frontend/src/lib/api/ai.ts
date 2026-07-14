import { apiFetch } from "./client";

/** One prior turn — lets the assistant resolve follow-ups server-side. */
export interface AiChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** POST /ai/query — Groq NL intent parse + grounded chat, deterministic fallback. */
export function askAssistant(query: string, history: AiChatTurn[] = []) {
  return apiFetch<{ answer: string }>("/ai/query", {
    method: "POST",
    body: { query, history },
  });
}
