// Pure field validators for the auth views (Login_View + Registration_View).
//
// No React, no I/O — these are the prime target for the property-based tests
// (auth-views design, Validation module). They cover trimming, length bounds,
// and the email pattern, and report EVERY offending field rather than just the
// first one (Requirements 1.5, 2.5, 2.6, 2.7).

import type {
  FieldErrorKey,
  LoginPayload,
  RegisterPayload,
  ValidationResult,
} from "@/lib/types";

/**
 * Email format (Requirement 2.2): at least one character before the `@`, at
 * least one character between the `@` and a `.` in the domain, and at least one
 * character after that `.`. No whitespace permitted in any part.
 */
export const EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

/** True when `value` is empty or contains only whitespace. */
export function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

/** True when the trimmed `value` matches the required email pattern. */
export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/**
 * Validate Login_View credentials (Requirements 1.1, 1.5).
 *
 * Username and password must each be non-empty after trimming and at most 254
 * characters (trimmed). Reports the offending `FieldErrorKey` for every field
 * that violates a rule.
 */
export function validateLogin({
  username,
  password,
}: LoginPayload): ValidationResult {
  const errors: FieldErrorKey[] = [];

  if (isBlank(username)) {
    errors.push("username.required");
  } else if (username.trim().length > 254) {
    errors.push("username.length");
  }

  if (isBlank(password)) {
    errors.push("password.required");
  } else if (password.trim().length > 254) {
    errors.push("password.length");
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/**
 * Validate Registration_View fields (Requirements 2.2, 2.5, 2.6, 2.7).
 *
 * Username must be 1–150 characters (trimmed); email must be non-empty and
 * match the email pattern; password must be 8–128 characters (not trimmed for
 * length). Reports the offending `FieldErrorKey` for every violated field.
 */
export function validateRegister({
  username,
  email,
  password,
}: RegisterPayload): ValidationResult {
  const errors: FieldErrorKey[] = [];

  const trimmedUsername = username.trim();
  if (trimmedUsername.length === 0) {
    errors.push("username.required");
  } else if (trimmedUsername.length > 150) {
    errors.push("username.length");
  }

  if (isBlank(email)) {
    errors.push("email.required");
  } else if (!isValidEmail(email)) {
    errors.push("email.format");
  }

  if (password.length === 0) {
    errors.push("password.required");
  } else if (password.length < 8 || password.length > 128) {
    errors.push("password.length");
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
