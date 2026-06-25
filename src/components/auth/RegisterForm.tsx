"use client";

// Registration_View form — split-screen redesign (design canvas
// "02 · Inscription"). Collects a username, an email, and a password, validates
// them with the pure `validateRegister` validator, and submits the
// Registration_Request through the Auth_Context `register` action.
//
// Behavior:
//   - Three labeled fields (username/email/password), each programmatically
//     associated with its input (Requirement 9.3). The password input is masked
//     with a show/hide toggle (Requirement 2.10) and shows a client-side
//     strength meter; the email field shows an inline "valid" affordance once it
//     matches the email pattern.
//   - On submit the form first clears any previously displayed message so at
//     most one is shown at a time (Requirement 3.7), then runs
//     `validateRegister`. When validation fails it blocks the submission,
//     retains every entered value, and names every offending field
//     (Requirements 2.5–2.7). A required terms checkbox gates submission.
//   - While a Registration_Request is in progress the submit control is disabled
//     and re-submits are ignored; the control is re-enabled in a `finally`
//     (Requirements 2.3, 2.8, 2.9).
//   - On success (HTTP 201, `register` resolves) it navigates to the Login_View
//     with a confirmation flag (Requirement 2.4). On 409 it shows the
//     "already exists" message; any other failure shows a generic message — both
//     retaining the entered username and email (Requirements 2.8, 2.9).
//
// All styling uses semantic Theme_Token utilities so the view re-themes across
// light/dark Color_Modes and mirrors for Arabic (Requirement 9.5).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import {
  CheckCircleIcon,
  CheckIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

import { AuthErrorAlert } from "@/components/auth/AuthErrorAlert";
import { AuthSegmentedNav } from "@/components/auth/AuthSegmentedNav";
import { useAuth } from "@/lib/auth/context";
import { mapAuthError, type AuthErrorDescriptor } from "@/lib/auth/errors";
import { isValidEmail, validateRegister } from "@/lib/auth/validation";
import { useT } from "@/lib/preferences";
import type { FieldErrorKey } from "@/lib/types";

const LOGIN_ROUTE = "/login";
const REGISTERED_QUERY = "registered=1";

/**
 * Client-side password strength estimate (presentational aid only — the
 * authoritative 8–128 bound is enforced by `validateRegister`). Returns a 0–4
 * score and a localized-label key.
 */
function passwordStrength(pw: string): { score: number; labelKey: string } {
  if (!pw) return { score: 0, labelKey: "" };
  let s = 0;
  if (pw.length >= 8) s += 1;
  if (pw.length >= 12) s += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 1;
  if (/\d/.test(pw)) s += 1;
  if (/[^A-Za-z0-9]/.test(pw)) s += 1;
  const score = Math.min(4, s);
  const labelKey =
    score <= 1
      ? "auth.password.strength.weak"
      : score === 2
        ? "auth.password.strength.fair"
        : score === 3
          ? "auth.password.strength.good"
          : "auth.password.strength.strong";
  return { score, labelKey };
}

/** Resolve an Auth_Error_Message descriptor to a localized string. */
function resolveMessage(
  t: (key: string) => string,
  descriptor: AuthErrorDescriptor,
): string {
  const base = t(descriptor.key);
  if (descriptor.detail !== undefined) {
    return `${base} ${descriptor.detail}`;
  }
  if (descriptor.status !== undefined) {
    return base.replace("{status}", String(descriptor.status));
  }
  return base;
}

export function RegisterForm() {
  const t = useT();
  const router = useRouter();
  const { register } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrorKey[]>([]);
  const [error, setError] = useState<AuthErrorDescriptor | null>(null);

  const baseId = useId();
  const usernameId = `${baseId}-username`;
  const emailId = `${baseId}-email`;
  const passwordId = `${baseId}-password`;

  const hasFieldError = (key: FieldErrorKey) => fieldErrors.includes(key);
  const usernameInvalid =
    hasFieldError("username.required") || hasFieldError("username.length");
  const emailInvalid = hasFieldError("email.required") || hasFieldError("email.format");
  const passwordInvalid =
    hasFieldError("password.required") || hasFieldError("password.length");

  const emailLooksValid = email.trim().length > 0 && isValidEmail(email) && !emailInvalid;
  const strength = passwordStrength(password);
  const strengthColor =
    strength.score <= 1 ? "bg-error" : strength.score === 2 ? "bg-warning" : "bg-success";
  const strengthTextColor =
    strength.score <= 1 ? "text-error" : strength.score === 2 ? "text-warning" : "text-success";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) {
      return;
    }
    // Clear any previously displayed message before the new attempt (R3.7).
    setError(null);
    setFieldErrors([]);
    setTermsError(false);

    const result = validateRegister({ username, email, password });
    if (!result.ok) {
      // Block, retain all entered values, name every offending field (R2.5–2.7).
      setFieldErrors(result.errors);
      return;
    }

    // Required terms gate (client-side).
    if (!acceptedTerms) {
      setTermsError(true);
      return;
    }

    setPending(true);
    try {
      await register({ username: username.trim(), email: email.trim(), password });
      // Success (HTTP 201): navigate to the Login_View with the confirmation
      // flag so it prompts the user to log in (R2.4).
      router.replace(`${LOGIN_ROUTE}?${REGISTERED_QUERY}`);
    } catch (err) {
      // 409 → "already exists"; any other failure → generic message. Both keep
      // the entered username and email (R2.8, 2.9).
      setError(mapAuthError(err, "register"));
    } finally {
      setPending(false);
    }
  }

  const fieldShell = (invalid: boolean, valid = false) =>
    `flex items-center gap-2.5 rounded-[11px] border bg-surface px-3.5 py-3 transition focus-within:ring-2 ${
      invalid
        ? "border-error ring-2 ring-error/15"
        : valid
          ? "border-success/60 focus-within:border-brand focus-within:ring-brand/15"
          : "border-border focus-within:border-brand focus-within:ring-brand/15"
    }`;

  const inputBase =
    "min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted disabled:opacity-60";

  return (
    <form onSubmit={onSubmit} noValidate className="flex w-full flex-col">
      <h1 className="mb-1.5 text-[26px] font-bold tracking-tight text-text">
        {t("auth.register.title")}
      </h1>
      <p className="mb-6 text-[14.5px] text-text-muted">{t("auth.register.subtitle")}</p>

      <AuthSegmentedNav active="register" />

      <AuthErrorAlert message={error ? resolveMessage(t, error) : null} />

      {/* Username / full name */}
      <label htmlFor={usernameId} className="mb-1.5 mt-1 block text-[12.5px] font-semibold text-text">
        {t("auth.register.username")}
      </label>
      <div className={fieldShell(usernameInvalid)}>
        <UserIcon className="h-[17px] w-[17px] shrink-0 text-text-muted" />
        <input
          id={usernameId}
          name="username"
          type="text"
          value={username}
          maxLength={150}
          autoComplete="username"
          disabled={pending}
          aria-invalid={usernameInvalid}
          aria-describedby={usernameInvalid ? `${usernameId}-error` : undefined}
          onChange={(e) => setUsername(e.target.value)}
          className={inputBase}
        />
      </div>
      {usernameInvalid ? (
        <p id={`${usernameId}-error`} className="mt-1.5 text-[11.5px] font-medium text-error">
          {hasFieldError("username.required")
            ? t("auth.field.username.required")
            : t("auth.field.username.length")}
        </p>
      ) : null}

      {/* Email */}
      <label htmlFor={emailId} className="mb-1.5 mt-4 block text-[12.5px] font-semibold text-text">
        {t("auth.register.email")}
      </label>
      <div className={fieldShell(emailInvalid, emailLooksValid)}>
        <EnvelopeIcon className="h-[17px] w-[17px] shrink-0 text-text-muted" />
        <input
          id={emailId}
          name="email"
          type="email"
          dir="ltr"
          value={email}
          maxLength={254}
          autoComplete="email"
          disabled={pending}
          aria-invalid={emailInvalid}
          aria-describedby={emailInvalid ? `${emailId}-error` : undefined}
          onChange={(e) => setEmail(e.target.value)}
          className={`${inputBase} text-start`}
        />
        {emailLooksValid ? (
          <CheckCircleIcon className="h-[18px] w-[18px] shrink-0 text-success" />
        ) : null}
      </div>
      {emailInvalid ? (
        <p id={`${emailId}-error`} className="mt-1.5 text-[11.5px] font-medium text-error">
          {hasFieldError("email.required")
            ? t("auth.field.email.required")
            : t("auth.field.email.format")}
        </p>
      ) : emailLooksValid ? (
        <p className="mt-1.5 text-[11.5px] font-medium text-success">
          {t("auth.field.email.valid")}
        </p>
      ) : null}

      {/* Password */}
      <label htmlFor={passwordId} className="mb-1.5 mt-4 block text-[12.5px] font-semibold text-text">
        {t("auth.register.password")}
      </label>
      <div className={fieldShell(passwordInvalid)}>
        <LockClosedIcon className="h-[17px] w-[17px] shrink-0 text-text-muted" />
        <input
          id={passwordId}
          name="password"
          type={showPassword ? "text" : "password"}
          value={password}
          maxLength={128}
          autoComplete="new-password"
          disabled={pending}
          aria-invalid={passwordInvalid}
          aria-describedby={passwordInvalid ? `${passwordId}-error` : undefined}
          onChange={(e) => setPassword(e.target.value)}
          className={inputBase}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={t(showPassword ? "auth.password.hide" : "auth.password.show")}
          className="shrink-0 rounded text-text-muted transition hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          {showPassword ? (
            <EyeSlashIcon className="h-[18px] w-[18px]" />
          ) : (
            <EyeIcon className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>
      {passwordInvalid ? (
        <p id={`${passwordId}-error`} className="mt-1.5 text-[11.5px] font-medium text-error">
          {hasFieldError("password.required")
            ? t("auth.field.password.required")
            : t("auth.field.password.length")}
        </p>
      ) : password.length > 0 ? (
        <div className="mt-2.5 flex items-center gap-2.5">
          <div className="flex flex-1 gap-1" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-[5px] flex-1 rounded-full transition ${
                  i < strength.score ? strengthColor : "bg-border"
                }`}
              />
            ))}
          </div>
          <span className={`text-[11.5px] font-semibold ${strengthTextColor}`}>
            {t(strength.labelKey)}
          </span>
        </div>
      ) : null}

      {/* Terms (required gate) */}
      <label className="mt-5 flex cursor-pointer items-start gap-2.5 select-none">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => {
            setAcceptedTerms(e.target.checked);
            if (e.target.checked) setTermsError(false);
          }}
          aria-invalid={termsError}
          className="peer sr-only"
        />
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border border-border bg-surface text-transparent transition peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 aria-[invalid=true]:border-error">
          <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
        <span className="text-[12.5px] leading-relaxed text-text-muted">
          {t("auth.register.terms")}
        </span>
      </label>
      {termsError ? (
        <p className="mt-1.5 text-[11.5px] font-medium text-error">
          {t("auth.register.termsRequired")}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="mt-6 rounded-[11px] bg-brand px-4 py-3 text-[14.5px] font-semibold text-white shadow-sm transition hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? t("auth.register.pending") : t("auth.register.submit")}
      </button>

      <p className="mt-5 text-center text-[13px] text-text-muted">
        {t("auth.register.haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          {t("auth.register.toLoginInline")}
        </Link>
      </p>
    </form>
  );
}

export default RegisterForm;
