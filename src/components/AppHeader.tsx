"use client";

// Shared top bar for the Maghrebia Assistant redesign (used by both the chat
// page and the Settings page).
//
// Left: the brand lockup (logo + wordmark) linking back to the assistant.
// Right: the bilingual FR/العربية language toggle, a settings gear link, and a
// light/dark theme toggle — all wired to the shared PreferencesProvider so the
// whole app re-themes / mirrors immediately. Styling stays on semantic
// Theme_Token utilities for light/dark parity.

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowRightStartOnRectangleIcon,
  Cog6ToothIcon,
  MoonIcon,
  SunIcon,
} from "@heroicons/react/24/outline";

import { BrandMark } from "@/components/BrandMark";
import { BRAND } from "@/lib/brand";
import { useAuth } from "@/lib/auth/context";
import { usePreferences, useT } from "@/lib/preferences";

export type AppHeaderProps = {
  /** Marks the settings gear as the current page. */
  active?: "assistant" | "settings";
};

export function AppHeader({ active }: AppHeaderProps) {
  const { locale, setLocale, resolvedTheme, toggleTheme } = usePreferences();
  const { isAuthenticated, logout } = useAuth();
  const t = useT();
  const router = useRouter();

  // Tracks an in-flight Logout_Action so the control can be disabled and any
  // additional logout request is suppressed (Requirements 6.2, 6.3).
  const [loggingOut, setLoggingOut] = useState(false);

  // Logout control handler: call the context logout, then route to the
  // Login_View. The `finally` guarantees navigation happens whether the
  // request succeeds or fails (Requirements 6.4, 6.5).
  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      router.push("/login");
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
      <Link href="/" className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-lg">
        <BrandMark className="h-[34px] w-[34px]" />
        <span className="flex flex-col leading-none">
          <span className="text-[15.5px] font-bold tracking-tight text-text">{BRAND.name}</span>
          <span className="mt-0.5 text-[10px] font-medium tracking-[0.16em] text-text-muted">
            {t("brand.subtitle")}
          </span>
        </span>
      </Link>

      <div className="flex items-center gap-2.5">
        {/* Language segmented toggle: FR / العربية */}
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

        <Link
          href="/settings"
          aria-label={t("header.settings")}
          aria-current={active === "settings" ? "page" : undefined}
          className={`flex h-9 w-9 items-center justify-center rounded-[9px] border border-border transition hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
            active === "settings" ? "bg-brand/10 text-brand" : "bg-surface text-text-muted"
          }`}
        >
          <Cog6ToothIcon className="h-[18px] w-[18px]" />
        </Link>

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

        {/* Logout control: rendered only while authenticated; disabled during
            an in-flight logout. Visibility derives from `isAuthenticated`, so
            it disappears once the session is cleared (Requirements 6.1, 6.3,
            6.6). */}
        {isAuthenticated && (
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label={t("auth.logout")}
            className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-border bg-surface text-text-muted transition hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowRightStartOnRectangleIcon className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
    </header>
  );
}

export default AppHeader;
