"use client";

// Segmented Connexion / Inscription switcher shown at the top of each auth
// form. Mirrors the segmented controls used on the Préférences tab; the active
// segment is a raised surface chip, the inactive one a muted link. Each segment
// is a real navigation link so the two routes (`/login`, `/register`) stay
// crawlable and the browser back button behaves.

import Link from "next/link";

import { useT } from "@/lib/preferences";

export function AuthSegmentedNav({ active }: { active: "login" | "register" }) {
  const t = useT();

  const segment = (selected: boolean) =>
    `flex-1 rounded-[8px] py-2.5 text-center text-[13.5px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
      selected
        ? "bg-surface text-text shadow-sm"
        : "text-text-muted hover:text-text"
    }`;

  return (
    <div className="mb-6 flex rounded-[11px] border border-border bg-bg p-[3px]">
      <Link
        href="/login"
        aria-current={active === "login" ? "page" : undefined}
        className={segment(active === "login")}
      >
        {t("auth.nav.login")}
      </Link>
      <Link
        href="/register"
        aria-current={active === "register" ? "page" : undefined}
        className={segment(active === "register")}
      >
        {t("auth.nav.register")}
      </Link>
    </div>
  );
}

export default AuthSegmentedNav;
