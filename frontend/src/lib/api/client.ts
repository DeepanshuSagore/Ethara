/**
 * Typed fetch client for the Ethara FastAPI backend (Phase 7).
 *
 * Base URL comes from NEXT_PUBLIC_API_URL (inlined at build time), defaulting
 * to the local backend. Every endpoint wrapper in this folder goes through
 * apiFetch, which builds the query string, raises ApiError with the API's
 * `detail` message (the 409s surface business-rule violations verbatim), and
 * forwards TanStack Query's abort signal.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type QueryParams = Record<string, string | number | undefined | null>;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function buildUrl(path: string, params?: QueryParams) {
  const url = new URL(path, API_BASE_URL);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/** FastAPI errors carry {detail: string} (or a list of field errors on 422). */
function errorDetail(body: unknown, status: number): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const msgs = detail
        .map((d) => (d && typeof d === "object" && "msg" in d ? String(d.msg) : null))
        .filter(Boolean);
      if (msgs.length > 0) return msgs.join("; ");
    }
  }
  return `Request failed with status ${status}.`;
}

interface ApiFetchOptions {
  params?: QueryParams;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiFetch<T>(
  path: string,
  { params, method = "GET", body, signal }: ApiFetchOptions = {}
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      signal,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError(
      `Could not reach the Ethara API at ${API_BASE_URL} — is the backend running?`,
      0
    );
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new ApiError(errorDetail(errorBody, response.status), response.status);
  }
  return response.json() as Promise<T>;
}

/** Human-readable message for toasts and error states. */
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}
