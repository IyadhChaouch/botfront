// Typed API_Client for the Maghrebia chatbot Frontend_App.
//
// This module is the ONLY place in the Frontend_App that issues HTTP requests
// to the Backend_API (Requirement 26.6). It uses native `fetch` exclusively —
// no Axios, no TanStack Query (Requirement 26.7) — and reads the base URL from
// `NEXT_PUBLIC_BACKEND_URL`, which resolves to the Standard_Backend_Port
// (Requirement 1.3, 6.1).

import type {
  AuthSession,
  AuthUser,
  LoginPayload,
  MultiModelResponse,
  RatingSubmission,
  RegisterPayload,
  RegisterResult,
} from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000";

/**
 * Error thrown when the Backend_API responds with a non-2xx status.
 *
 * Carries the HTTP `status` so callers can surface it in the UI and satisfy
 * R7.2 (non-2xx responses produce an error message that includes the status).
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// --- Auth transport (auth-views spec) -----------------------------------
//
// The transport layer stays framework-free: instead of importing React it
// reads the current Access_Token through an injectable provider that the
// Auth_Context registers on mount via `setAuthTokenProvider`. `authHeaders`
// attaches `Bearer <token>` only while a non-empty token is held (R4.3) and
// omits the header otherwise (R4.8). `fetchJson` wraps native `fetch` with an
// `AbortController` timeout and normalizes aborts/network failures to the
// `ApiError(0, "network")` sentinel (R7.6, R7.8).

/** Injectable Access_Token provider; defaults to "no token" before wiring. */
let getToken: () => string | null = () => null;

/**
 * Register the Access_Token accessor (called by the Auth_Context on mount).
 *
 * Keeps the transport layer free of React imports while letting every request
 * read the current token (R4.3, R4.8).
 */
export function setAuthTokenProvider(fn: () => string | null): void {
  getToken = fn;
}

/**
 * Build request headers, attaching `Authorization: Bearer <token>` iff a
 * non-empty Access_Token is currently held (R4.3); omitting it otherwise
 * (R4.8). These two behaviors are exact complements (Property 8).
 */
export function authHeaders(
  base: Record<string, string> = {},
): Record<string, string> {
  const token = getToken();
  return token ? { ...base, Authorization: `Bearer ${token}` } : { ...base };
}

/**
 * Validate that a value is a complete Authenticated_User (id/username/email/
 * role all present with the right types). Mirrors the Session_Store guard so
 * the client never returns a half-session (R1.9, R7.7).
 */
function isCompleteUser(value: unknown): value is AuthUser {
  if (typeof value !== "object" || value === null) return false;
  const u = value as Record<string, unknown>;
  return (
    (typeof u.id === "string" || typeof u.id === "number") &&
    typeof u.username === "string" &&
    u.username.length > 0 &&
    typeof u.email === "string" &&
    u.email.length > 0 &&
    typeof u.role === "string"
  );
}

/** Read a human-readable error message from a non-2xx response body (R7.4, 7.5). */
async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (typeof body === "object" && body !== null) {
      const record = body as Record<string, unknown>;
      if (typeof record.error === "string" && record.error.length > 0) {
        return record.error;
      }
      if (typeof record.message === "string" && record.message.length > 0) {
        return record.message;
      }
    }
  } catch {
    // Non-JSON or empty body — fall through to the default message.
  }
  return "";
}

/**
 * `fetch` with an `AbortController` timeout that parses/validates the JSON
 * body. Behavior by outcome:
 *   - abort (timeout) or network failure → `ApiError(0, "network")` (R7.6)
 *   - out-of-range status (<200 or >299) → `ApiError(status, message)` where
 *     the message comes from the body or a default `HTTP <status>` (R7.4, 7.5)
 *   - in-range (200-299) → parsed through `parse`, which throws
 *     `ApiError(status, "invalid response")` on a malformed/partial body
 *     (R7.1, 7.2, 7.7)
 */
async function fetchJson<T>(
  path: string,
  init: RequestInit,
  timeoutMs: number,
  parse: (body: unknown, status: number) => T,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: authHeaders(
        (init.headers as Record<string, string> | undefined) ?? {},
      ),
      signal: controller.signal,
    });
  } catch {
    // Abort (timeout) or network failure — no HTTP status was received (R7.6).
    throw new ApiError(0, "network");
  } finally {
    clearTimeout(timer);
  }

  if (res.status < 200 || res.status > 299) {
    const message = await readErrorMessage(res);
    throw new ApiError(res.status, message || `HTTP ${res.status}`);
  }

  // In-range (200-299): parse + validate the body (R7.1, 7.2, 7.7).
  let body: unknown;
  if (res.status === 204) {
    body = undefined;
  } else {
    try {
      body = await res.json();
    } catch {
      throw new ApiError(res.status, "invalid response");
    }
  }
  return parse(body, res.status);
}

/**
 * Single typed entry point for all Backend_API traffic (R26.6, R26.7).
 */
export const apiClient = {
  /**
   * POST /api/chat — submit a user question, receive the multi-model response.
   *
   * @throws {ApiError} when the Backend_API returns a non-2xx status.
   */
  async postChat(input: string): Promise<MultiModelResponse> {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });
    if (!res.ok) {
      // Surface the status so the UI can satisfy R7.2.
      throw new ApiError(res.status, `Backend returned ${res.status}`);
    }
    return (await res.json()) as MultiModelResponse;
  },

  /**
   * POST /api/rate — persist a rating; no meaningful body on success.
   *
   * @throws {ApiError} when the Backend_API returns a non-2xx status.
   */
  async postRating(submission: RatingSubmission): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    });
    if (!res.ok) {
      throw new ApiError(res.status, `Rating failed: ${res.status}`);
    }
  },

  /**
   * POST /api/auth/login — 10s timeout (R7.1, 1.2).
   *
   * On any 200-299 status returns the `{ token, user }` session parsed from
   * the body. Throws `ApiError(status, "invalid response")` when the 2xx body
   * is malformed or missing a non-empty token or a complete user (R1.9, R7.7),
   * `ApiError(status, message)` on an out-of-range status (R7.4, 7.5), and the
   * `ApiError(0, "network")` sentinel on a network failure/timeout (R7.6).
   * Never returns a partial session on any failure.
   */
  async login(payload: LoginPayload, timeoutMs = 10_000): Promise<AuthSession> {
    return fetchJson<AuthSession>(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      timeoutMs,
      (body, status) => {
        if (typeof body !== "object" || body === null) {
          throw new ApiError(status, "invalid response");
        }
        const record = body as Record<string, unknown>;
        const token = record.token;
        if (typeof token !== "string" || token.length === 0) {
          throw new ApiError(status, "invalid response");
        }
        if (!isCompleteUser(record.user)) {
          throw new ApiError(status, "invalid response");
        }
        return { token, user: record.user };
      },
    );
  },

  /**
   * POST /api/auth/register — 30s timeout (R7.2, 2.2).
   *
   * On any 200-299 status returns the created `{ user }` account parsed from
   * the body. Throws `ApiError(status, "invalid response")` when the 2xx body
   * is malformed or missing a complete user (R7.7), `ApiError(status, message)`
   * on an out-of-range status (R7.4, 7.5), and the `ApiError(0, "network")`
   * sentinel on a network failure/timeout (R7.6). Never returns a session.
   */
  async register(
    payload: RegisterPayload,
    timeoutMs = 30_000,
  ): Promise<RegisterResult> {
    return fetchJson<RegisterResult>(
      "/api/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      timeoutMs,
      (body, status) => {
        if (typeof body !== "object" || body === null) {
          throw new ApiError(status, "invalid response");
        }
        const record = body as Record<string, unknown>;
        if (!isCompleteUser(record.user)) {
          throw new ApiError(status, "invalid response");
        }
        return { user: record.user };
      },
    );
  },

  /**
   * POST /api/auth/logout — 10s timeout, sends the current Access_Token in the
   * `Authorization` header (R7.3, 6.2). Resolves on any 2xx; throws on an
   * out-of-range status (R7.4, 7.5) or a network failure/timeout (R7.6) so the
   * Auth_Context can clear the session regardless of outcome.
   */
  async logout(timeoutMs = 10_000): Promise<void> {
    await fetchJson<void>(
      "/api/auth/logout",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      timeoutMs,
      () => undefined,
    );
  },
};
