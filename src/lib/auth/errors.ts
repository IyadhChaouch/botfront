// Auth error mapping — `lib/auth/errors.ts`
//
// Pure `ApiError → Auth_Error_Message` mapper. Translates any value thrown by an
// auth call into a localized message descriptor (a dictionary `key` plus optional
// `status`/`detail` params) per the status table in Requirement 3:
//
//   - a non-`ApiError` value or the network sentinel `ApiError(0, …)` → network key
//     (Requirements 3.5, 7.6)
//   - HTTP 401 → invalid-credentials key (Requirement 3.1)
//   - HTTP 409 → already-exists key (Requirement 3.2)
//   - HTTP 400 with a non-empty (trimmed) body → detail key, truncated to 200 chars
//     (Requirement 3.3)
//   - HTTP 400 with an empty/absent body → invalid-data key (Requirement 3.4)
//   - any other non-2xx status → status key carrying the code (Requirement 3.6)
//
// The mapping is total: every `unknown` input yields exactly one descriptor
// (Property 4). The produced `key` values align with the `auth.error.*` entries
// in the bilingual dictionary (`lib/preferences.tsx`).

import { ApiError } from "@/lib/api/client";

/** Which view is surfacing the error (reserved for view-specific messaging). */
export type AuthErrorView = "login" | "register";

/** A localized message descriptor: a dictionary key plus optional params. */
export type AuthErrorDescriptor = {
  key: string;
  status?: number;
  detail?: string;
};

/** Maximum length of a surfaced HTTP 400 detail message (Requirement 3.3). */
const MAX_DETAIL_LENGTH = 200;

/**
 * Map a thrown auth failure to a localized message descriptor.
 *
 * @param error The value thrown by an auth call (an `ApiError` or anything else).
 * @param view  The submitting view (`"login"` or `"register"`).
 * @returns Exactly one descriptor; never throws.
 */
export function mapAuthError(error: unknown, view: AuthErrorView): AuthErrorDescriptor {
  void view;

  // Non-ApiError values (and the `ApiError(0, "network")` network sentinel) carry
  // no usable HTTP status → network error (Requirements 3.5, 7.6).
  if (!(error instanceof ApiError) || error.status === 0) {
    return { key: "auth.error.network" };
  }

  switch (error.status) {
    case 401:
      // Invalid credentials (Requirement 3.1).
      return { key: "auth.error.invalidCredentials" };
    case 409:
      // Username or email already taken (Requirement 3.2).
      return { key: "auth.error.alreadyExists" };
    case 400: {
      // 400 with a descriptive body → surface it, truncated to 200 chars (R3.3);
      // otherwise a generic invalid-data message (R3.4).
      const detail = (error.message ?? "").trim();
      if (detail.length > 0) {
        return {
          key: "auth.error.badRequestDetail",
          detail: detail.slice(0, MAX_DETAIL_LENGTH),
        };
      }
      return { key: "auth.error.invalidData" };
    }
    default:
      // Any other non-2xx status → include the status code (Requirement 3.6).
      return { key: "auth.error.status", status: error.status };
  }
}
