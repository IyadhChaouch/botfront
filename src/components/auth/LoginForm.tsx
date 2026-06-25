"use client";

// Login_View form — split-screen redesign (design canvas "01 · Connexion").
// Collects a username and password, validates them, and drives the
// Auth_Context `login` action.
//
// Behavior (Requirements 1.1–1.11, 3.7, 5.6, 5.7, 9.3, 9.5):
//   - Holds field state and a `pending` flag; while pending the submit control
//     is disabled, a pending indicator is shown, and re-submits are ignored
//     (R1.3).
//   - On submit: clears any prior Auth_Error_Message first (R3.7), then runs
//     `validateLogin`. Invalid input blocks the request, retains the entered
//     values, and names every offending field (R1.5).
//   - On valid input: calls `auth.login(...)`; on success navigates to the
//     retained `?next=` path or the assistant home (R1.4, 5.6, 5.7).
//   - On failure: maps the thrown error via `mapAuthError`. A 401 clears the
//     password while retaining the username (R1.6); every other failure shows a
//     generic message and retains the username (R1.7–1.9). The submit control
//     is re-enabled in a `finally` on every outcome.
//   - The password input is masked (`type="password"`) with a show/hide toggle
//     and rejects input beyond 254 characters (R1.1, 1.10).
//   - Each input is programmatically linked to a visible label and styled with
//     semantic Theme_Token utilities only (R9.3, R9.5).
//
// The "Rester connecté", "Oublié ?", and "Continuer via mon agence" controls
// are presentational only — the session already persists via the Session_Store
// and no forgot-password / agency-SSO endpoints exist in the Backend_API.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  CheckIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

import { AuthErrorAlert } from "@/components/auth/AuthErrorAlert";
import { AuthSegmentedNav } from "@/components/auth/AuthSegmentedNav";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";
import { mapAuthError } from "@/lib/auth/errors";
import { validateLogin } from "@/lib/auth/validation";
import { useT } from "@/lib/preferences";
import type { FieldErrorKey } from "@/lib/types";

export function LoginForm() {
  const t = useT();
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrorKey[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resolve a mapped Auth_Error_Message descriptor into a localized string,
  // substituting the status code or appending the truncated 400 detail.
  function resolveError(error: unknown): string {
    const descriptor = mapAuthError(error, "login");
    const base = t(descriptor.key);
    if (descriptor.status !== undefined) {
      return base.replace("{status}", String(descriptor.status));
    }
    if (descriptor.detail !== undefined) {
      return `${base} ${descriptor.detail}`;
    }
    return base;
  }

  const usernameInvalid =
    fieldErrors.includes("username.required") ||
    fieldErrors.includes("username.length");
  const passwordInvalid =
    fieldErrors.includes("password.required") ||
    fieldErrors.includes("password.length");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Ignore additional submit attempts while a request is in flight (R1.3).
    if (pending) {
      return;
    }

    // Remove the previously displayed Auth_Error_Message before validating /
    // sending the new request — at most one message at a time (R3.7).
    setErrorMessage(null);

    const result = validateLogin({ username, password });
    if (!result.ok) {
      // Block submission, retain entered values, name each offending field
      // (R1.5).
      setFieldErrors(result.errors);
      return;
    }
    setFieldErrors([]);

    setPending(true);
    try {
      await auth.login({ username: username.trim(), password });
      // Redirect to the retained protected path or the assistant home
      // (R1.4, 5.6, 5.7).
      const next = searchParams.get("next");
      router.replace(next ?? "/");
    } catch (err) {
      setErrorMessage(resolveError(err));
      // An authentication failure clears the password while retaining the
      // username (R1.6). Every other failure retains the username as well.
      if (err instanceof ApiError && err.status === 401) {
        setPassword("");
      }
    } finally {
      // Re-enable the submit control on every outcome (R1.6–1.9).
      setPending(false);
    }
  }

  // Field shell classes: a bordered row that highlights on focus and turns to
  // the error token when the field is invalid.
  const fieldShell = (invalid: boolean) =>
    `flex items-center gap-2.5 rounded-[11px] border bg-surface px-3.5 py-3 transition focus-within:ring-2 ${
      invalid
        ? "border-error ring-2 ring-error/15"
        : "border-border focus-within:border-brand focus-within:ring-brand/15"
    }`;

  const inputBase =
    "min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted disabled:opacity-60";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col">
      <h1 className="mb-1.5 text-[26px] font-bold tracking-tight text-text">
        {t("auth.login.welcome")}
      </h1>
      <p className="mb-6 text-[14.5px] text-text-muted">{t("auth.login.welcomeSub")}</p>

      <AuthSegmentedNav active="login" />

      <AuthErrorAlert message={errorMessage} />

      {/* Username / identifier */}
      <label htmlFor="login-username" className="mb-1.5 mt-1 block text-[12.5px] font-semibold text-text">
        {t("auth.login.username")}
      </label>
      <div className={fieldShell(usernameInvalid)}>
        <EnvelopeIcon className="h-[17px] w-[17px] shrink-0 text-text-muted" />
        <input
          id="login-username"
          name="username"
          type="text"
          dir="ltr"
          autoComplete="username"
          maxLength={254}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={pending}
          aria-invalid={usernameInvalid}
          aria-describedby={usernameInvalid ? "login-username-error" : undefined}
          className={`${inputBase} text-start`}
        />
      </div>
      {usernameInvalid ? (
        <p id="login-username-error" className="mt-1.5 text-[11.5px] font-medium text-error">
          {fieldErrors.includes("username.required")
            ? t("auth.field.username.required")
            : t("auth.field.username.length")}
        </p>
      ) : null}

      {/* Password */}
      <div className="mb-1.5 mt-4 flex items-center justify-between">
        <label htmlFor="login-password" className="text-[12.5px] font-semibold text-text">
          {t("auth.login.password")}
        </label>
        <span className="cursor-pointer text-[12.5px] font-semibold text-brand hover:underline">
          {t("auth.login.forgot")}
        </span>
      </div>
      <div className={fieldShell(passwordInvalid)}>
        <LockClosedIcon className="h-[17px] w-[17px] shrink-0 text-text-muted" />
        <input
          id="login-password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          maxLength={254}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
          aria-invalid={passwordInvalid}
          aria-describedby={passwordInvalid ? "login-password-error" : undefined}
          className={inputBase}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={t(showPassword ? "auth.password.hide" : "auth.password.show")}
          className="shrink-0 text-text-muted transition hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded"
        >
          {showPassword ? (
            <EyeSlashIcon className="h-[18px] w-[18px]" />
          ) : (
            <EyeIcon className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>
      {passwordInvalid ? (
        <p id="login-password-error" className="mt-1.5 text-[11.5px] font-medium text-error">
          {fieldErrors.includes("password.required")
            ? t("auth.field.password.required")
            : t("auth.field.password.length")}
        </p>
      ) : null}

      {/* Remember me (presentational) */}
      <label className="mt-5 mb-6 flex cursor-pointer items-center gap-2.5 select-none">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="peer sr-only"
        />
        <span className="flex h-5 w-5 items-center justify-center rounded-[6px] border border-border bg-surface text-transparent transition peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40">
          <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
        <span className="text-[13.5px] text-text-muted">{t("auth.login.remember")}</span>
      </label>

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="rounded-[11px] bg-brand px-4 py-3 text-[14.5px] font-semibold text-white shadow-sm transition hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? t("auth.login.pending") : t("auth.login.submit")}
      </button>

      {/* Divider */}
      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-text-muted">{t("auth.login.or")}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* Agency SSO (presentational) */}
      <button
        type="button"
        className="flex items-center justify-center gap-2.5 rounded-[11px] border border-border bg-surface px-4 py-3 text-[13.5px] font-semibold text-text transition hover:bg-brand/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <MapPinIcon className="h-[17px] w-[17px] text-text-muted" />
        {t("auth.login.agency")}
      </button>

      <p className="mt-5 text-center text-[13px] text-text-muted">
        {t("auth.login.noAccount")}{" "}
        <Link href="/register" className="font-semibold text-brand hover:underline">
          {t("auth.login.createAccount")}
        </Link>
      </p>
    </form>
  );
}

export default LoginForm;
