// Session_Store — localStorage-backed persistence for the Auth_Context.
//
// Owns the (de)serialization and read/write/clear helpers that keep the
// Access_Token + Authenticated_User across reloads. The store is the single
// place that decides what a *valid* persisted session is: a non-empty token
// together with a complete Authenticated_User record. Anything else — missing,
// empty, malformed, or a partial record (token-only or user-only) — is treated
// as "no session" and parses to `null` (Requirements 4.7, 8.8, 8.9).
//
// All helpers are defensive: they never throw. `writeSession` returns `false`
// when localStorage is unavailable (SecurityError) or its quota is exceeded
// (QuotaExceededError) so the Auth_Context can keep the session in memory and
// surface a persistError flag instead (Requirement 4.6).
//
// The storage key follows the `mgb-*` convention established in
// `preferences.tsx` (`mgb-theme`, `mgb-locale`, …).

import type { AuthSession, AuthUser } from "@/lib/types";

/** localStorage key; mirrors the "mgb-*" key convention in preferences.tsx. */
export const STORAGE_KEY = "mgb-auth";

/**
 * Serialize a session to the exact JSON string persisted to localStorage.
 *
 * Normalizes the shape to `{ token, user }` so the persisted record never
 * carries stray fields and `parseSession(serializeSession(s))` round-trips
 * deeply (Property 6, Requirements 4.1, 4.2, 8.8).
 */
export function serializeSession(session: AuthSession): string {
  return JSON.stringify({
    token: session.token,
    user: {
      id: session.user.id,
      username: session.user.username,
      email: session.user.email,
      role: session.user.role,
    },
  });
}

/**
 * Guard rejecting partial/malformed Authenticated_User records.
 *
 * A complete user has an `id` (string or number), a non-empty `username`,
 * a non-empty `email`, and a `role` string (Requirements 8.8, 8.9).
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

/**
 * Parse a stored string back into a session, or `null` when the record is
 * missing, empty, non-JSON, not an object, has an empty/non-string token, or
 * lacks a complete Authenticated_User (Requirements 4.7, 8.8, 8.9).
 */
export function parseSession(raw: string | null): AuthSession | null {
  if (raw === null || raw.trim() === "") return null;

  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof obj !== "object" || obj === null) return null;
  const record = obj as Record<string, unknown>;

  const token = record.token;
  if (typeof token !== "string" || token.length === 0) return null;

  const user = record.user;
  if (!isCompleteUser(user)) return null;

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  };
}

/**
 * Read and validate the persisted session. Returns `null` when no valid
 * session is stored or when localStorage is unavailable. Never throws.
 */
export function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    return parseSession(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/**
 * Persist a session to localStorage.
 *
 * Returns `false` when localStorage is unavailable (SecurityError) or its
 * quota is exceeded (QuotaExceededError) so the caller can keep the session in
 * memory and flag a persist error instead. Never throws (Requirement 4.6).
 */
export function writeSession(session: AuthSession): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeSession(session));
    return true;
  } catch {
    return false;
  }
}

/** Remove any persisted session. Never throws (Requirements 4.7, 8.9). */
export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable — nothing persisted to clear.
  }
}
