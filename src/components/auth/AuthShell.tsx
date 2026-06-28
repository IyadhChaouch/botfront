"use client";

// Split-screen auth layout (design canvas "Maghrebia Assistant · Connexion &
// inscription"). A teal "trust" brand panel with a concentric-shield motif sits
// beside the form column. The whole card mirrors for Arabic (RTL) and re-themes
// across light/dark Color_Modes because every surface uses semantic Theme_Token
// utilities. The brand panel is hidden on small screens, where a compact logo
// header stands in instead.

import { type ReactNode } from "react";

import {
  CheckCircleIcon,
  LockClosedIcon,
  MoonIcon,
  ShieldCheckIcon,
  SunIcon,
} from "@heroicons/react/24/outline";

import { usePreferences, useT } from "@/lib/preferences";
import { BRAND } from "@/lib/brand";

export type AuthVariant = "login" | "register";

/** The Maghrebia shield lockup used in the logo chip. */
function ShieldLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l7 2.5v5c0 4.6-3.1 8.2-7 9.1-3.9-.9-7-4.5-7-9.1v-5L12 3Z" />
      <path d="M9 11.5l2 2 4-4.2" />
    </svg>
  );
}

/** Decorative concentric rings echoing the protective "shield" motif. */
function ConcentricRings() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className="absolute -left-28 -top-28 h-[520px] w-[520px] rounded-full border border-white/10" />
      <span className="absolute -left-16 -top-16 h-[400px] w-[400px] rounded-full border border-white/10" />
      <span className="absolute left-0 top-0 h-[280px] w-[280px] rounded-full border border-white/[0.12]" />
      <span className="absolute -bottom-36 -right-28 h-[420px] w-[420px] rounded-full border border-white/10" />
    </div>
  );
}

/** The teal brand panel. White text on a dark-teal surface for AA contrast in
 *  both Color_Modes. */
function BrandPanel({ variant }: { variant: AuthVariant }) {
  const t = useT();

  return (
    <div className="relative hidden w-[420px] shrink-0 flex-col justify-between overflow-hidden bg-brand-dark p-9 lg:flex">
      <ConcentricRings />

      {/* Logo lockup */}
      <div className="relative flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/15">
          <ShieldLogo className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[16px] font-bold text-white">{BRAND.name}</span>
          <span className="mt-0.5 text-[10px] font-medium tracking-[0.16em] text-white/70">
            {t("brand.subtitle")}
          </span>
        </div>
      </div>

      {/* Headline / value proposition */}
      <div className="relative">
        {variant === "login" ? (
          <>
            <div className="mb-5 flex h-[54px] w-[54px] items-center justify-center rounded-[15px] bg-white/15">
              <ShieldCheckIcon className="h-7 w-7 text-white" />
            </div>
            <h2 className="mb-3 text-[25px] font-semibold leading-snug tracking-tight text-white">
              {t("auth.brand.loginHeadline")}
            </h2>
            <p className="max-w-[300px] text-sm leading-relaxed text-white/80">
              {t("auth.brand.loginSubtitle")}
            </p>
          </>
        ) : (
          <>
            <h2 className="mb-5 text-[25px] font-semibold leading-snug tracking-tight text-white">
              {t("auth.brand.registerHeadline")}
            </h2>
            <ul className="flex flex-col gap-3.5">
              {[
                "auth.brand.feature.quotes",
                "auth.brand.feature.claims",
                "auth.brand.feature.support",
              ].map((key) => (
                <li key={key} className="flex items-center gap-3 text-sm text-white/90">
                  <CheckCircleIcon className="h-[18px] w-[18px] shrink-0 text-white" />
                  {t(key)}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Trust footnote */}
      <div className="relative flex items-center gap-2 text-[12.5px] font-medium text-white/75">
        <LockClosedIcon className="h-4 w-4 shrink-0" />
        {t(variant === "login" ? "auth.brand.secure" : "auth.brand.confidential")}
      </div>
    </div>
  );
}

/** Top-right language + theme chrome, mirroring the app header controls. */
function ChromeToggles() {
  const { locale, setLocale, resolvedTheme, toggleTheme } = usePreferences();
  const t = useT();

  return (
    <div className="flex items-center justify-end gap-2.5 px-6 pt-5">
      <div className="flex items-center rounded-[9px] border border-border bg-bg p-0.5">
        <button
          type="button"
          onClick={() => setLocale("fr")}
          aria-pressed={locale === "fr"}
          className={`rounded-[7px] px-3 py-1 text-[13px] font-semibold transition ${
            locale === "fr" ? "bg-brand text-white shadow-sm" : "text-text-muted hover:text-text"
          }`}
        >
          FR
        </button>
        <button
          type="button"
          onClick={() => setLocale("ar")}
          aria-pressed={locale === "ar"}
          aria-label="العربية"
          className={`rounded-[7px] px-3 py-1 text-[15px] font-semibold transition ${
            locale === "ar" ? "bg-brand text-white shadow-sm" : "text-text-muted hover:text-text"
          }`}
        >
          ع
        </button>
      </div>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={t("header.theme")}
        className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-border bg-surface text-text-muted transition hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        {resolvedTheme === "dark" ? (
          <SunIcon className="h-[18px] w-[18px]" />
        ) : (
          <MoonIcon className="h-[18px] w-[18px]" />
        )}
      </button>
    </div>
  );
}

/**
 * Split-screen container for the Login_View / Registration_View. Renders the
 * brand panel, the language/theme chrome, a small-screen logo header, and the
 * centered form slot.
 */
export function AuthShell({
  variant,
  children,
}: {
  variant: AuthVariant;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-8 text-text">
      <div className="flex w-full max-w-[1000px] overflow-hidden rounded-2xl border border-border bg-surface shadow-sm lg:min-h-[640px]">
        <BrandPanel variant={variant} />

        <div className="flex min-w-0 flex-1 flex-col">
          <ChromeToggles />

          {/* Compact logo header shown when the brand panel is hidden. */}
          <div className="flex items-center gap-2.5 px-6 pt-4 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand text-white">
              <ShieldLogo className="h-5 w-5" />
            </div>
            <span className="text-[15px] font-bold text-text">{BRAND.name}</span>
          </div>

          <div className="flex flex-1 flex-col justify-center px-6 py-8 sm:px-10">
            <div className="mx-auto w-full max-w-[380px]">{children}</div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default AuthShell;
