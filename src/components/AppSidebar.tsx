"use client";

// Left "Accès rapide" rail for the assistant page (matches the design canvas):
// a couple of quick-access links, a link into the Settings surface, and the
// always-on Urgence 24/7 contact card pinned to the bottom. Hidden on small
// screens where the conversation takes the full width.

import Link from "next/link";

import { Cog6ToothIcon, MapPinIcon, PhoneIcon, UserIcon } from "@heroicons/react/24/outline";

import { BRAND } from "@/lib/brand";
import { useT } from "@/lib/preferences";

export function AppSidebar() {
  const t = useT();

  const itemClass =
    "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13.5px] font-medium text-text transition hover:bg-brand/10 hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

  return (
    <aside className="hidden w-[232px] shrink-0 flex-col gap-1 border-e border-border bg-surface p-3.5 md:flex">
      <div className="px-2.5 pb-2.5 pt-1 text-[10px] font-semibold tracking-[0.13em] text-text-muted">
        {t("nav.quickAccess")}
      </div>

      <button type="button" className={itemClass}>
        <MapPinIcon className="h-[19px] w-[19px] text-text-muted" />
        {t("nav.findAgency")}
      </button>
      <button type="button" className={itemClass}>
        <UserIcon className="h-[19px] w-[19px] text-text-muted" />
        {t("nav.clientArea")}
      </button>
      <Link href="/settings" className={itemClass}>
        <Cog6ToothIcon className="h-[19px] w-[19px] text-text-muted" />
        {t("nav.settings")}
      </Link>

      <div className="flex-1" />

      <div className="rounded-xl border border-brand/25 bg-brand/10 p-3.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-brand">
          <PhoneIcon className="h-4 w-4" />
          {t("urgence.title")}
        </div>
        <div className="mt-1.5 text-[19px] font-bold tracking-wide text-brand" dir="ltr">
          {BRAND.assistanceLine}
        </div>
        <div className="mt-0.5 text-[11.5px] text-text-muted">{t("urgence.subtitle")}</div>
      </div>
    </aside>
  );
}

export default AppSidebar;
