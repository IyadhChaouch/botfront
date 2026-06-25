// Shared frontend types for the Maghrebia chatbot (Requirement 26.14, 26.4).
//
// These mirror the Backend_API Multi_Model_Response shape (see API_DOCS.md and
// the design Data Models section) and are consumed by the typed API_Client
// (`lib/api/client.ts`, task 12.1) and the chat hooks/components.

/** One model's result within a Multi_Model_Response (Requirement 4, 6). */
export type ModelResult = {
  success: boolean;
  response: string | null;
  error: string | null;
  /** Provider model name used, surfaced as a display label. */
  model: string;
};

/** A grounded dataset match card, present only when well-formed (Requirement 6.3, 6.4). */
export type DatasetMatch = {
  success: boolean;
  response: string;
  intent: string;
  source: "bert" | "tfidf";
  model: "Dataset Match";
};

/** The full `/api/chat` response, keyed by Model_Identifier (Requirement 6). */
export type MultiModelResponse = {
  dataset_match: boolean;
  dataset: DatasetMatch | null;
  models: Record<string, ModelResult>;
  success: boolean;
};

/** Payload posted to `/api/rate` (Requirement 8). `value` is 1..5 inclusive. */
export type RatingSubmission = {
  modelIdentifier: string;
  question: string;
  response: string;
  value: number;
};

// --- Auth Views types (auth-views spec) ---------------------------------
//
// Shapes for the frontend authentication experience: the Authenticated_User
// and active session, request payloads, the pure-validator outcome, and the
// value exposed by the Auth_Context provider (`lib/auth/context.tsx`).
// See the auth-views design Data Models section (Requirements 4.4, 8.2).

/** Authenticated_User — the account returned in the `user` field. */
export type AuthUser = {
  id: string | number;
  username: string;
  email: string;
  role: string;
};

/** The active session held by Auth_Context and persisted to Session_Store. */
export type AuthSession = {
  /** Access_Token (JWT), non-empty. */
  token: string;
  /** Complete Authenticated_User. */
  user: AuthUser;
};

/** Payload posted to `POST /api/auth/login`. */
export type LoginPayload = {
  username: string;
  password: string;
};

/** Payload posted to `POST /api/auth/register`. */
export type RegisterPayload = {
  username: string;
  email: string;
  password: string;
};

/** Success result of register: the created account (no session change). */
export type RegisterResult = {
  user: AuthUser;
};

/** Per-field validation error identifiers returned by the pure validators. */
export type FieldErrorKey =
  | "username.required"
  | "username.length"
  | "email.required"
  | "email.format"
  | "password.required"
  | "password.length";

/** Per-field validation outcome (pure validators). */
export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: FieldErrorKey[] };

/** Value exposed by the Auth_Context provider to consumers (Requirement 8.2). */
export type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  status: "restoring" | "ready";
  persistError: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<RegisterResult>;
  logout: () => Promise<void>;
};
