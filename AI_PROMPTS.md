# AI Prompts & Usage Log

This document records how AI tools were used during development, as required by the assessment.
For each significant use we log: **the prompt/intent**, **what the AI produced**, **manual fixes
applied**, and **how the output was validated**.

> Primary AI tool: **Claude (Claude Code)** for architecture, code generation, and docs.
> Additional: Groq (Llama 3.x) is used *inside the product* as the AI assistant feature.

---

## Legend
- **Prompt** — what we asked / the goal.
- **Output** — summary of what the AI generated.
- **Manual fixes** — edits, corrections, or decisions applied on top.
- **Validation** — how we confirmed it works/correct.

---

## Phase 0 — Foundation & Docs

### 0.1 Project planning & phase breakdown
- **Prompt:** "Plan a full-stack seat-allocation & project-mapping system (Ethara) for ~5,000
  employees; propose a phased plan focused on UI first, with clean structure and routing."
- **Output:** A 10-phase plan (Foundation → UI → Backend → Seed → APIs → Integration → AI →
  Deploy), tech-stack table, data model draft, and frontend/backend folder architecture.
  Captured in [PROJECT_PLAN.md](./PROJECT_PLAN.md).
- **Manual fixes:** Confirmed decisions — Demo/Normal auth modes (Clerk), grid seat map,
  indigo/violet theme, Groq for the AI assistant.
- **Validation:** Reviewed against the assessment's stated requirements checklist.

### 0.2 Repository scaffolding
- **Prompt:** "Scaffold a Next.js (App Router, TS, Tailwind, src dir) frontend and a FastAPI
  backend skeleton with an industry-standard folder structure, plus root docs."
- **Output:** `create-next-app` frontend, `backend/app/...` package layout, root `README.md`,
  `.gitignore`, and this file.
- **Manual fixes:** _tracked as we go._
- **Validation:** Frontend dev server boots; backend health endpoint responds. _(verified in phase)_

---

## Phase 1+ — _logged as each phase completes_
