import { apiFetch } from "./client";

/** POST /ai/query — deterministic keyword engine now, Groq NL in Phase 8. */
export function askAssistant(query: string) {
  return apiFetch<{ answer: string }>("/ai/query", {
    method: "POST",
    body: { query },
  });
}
