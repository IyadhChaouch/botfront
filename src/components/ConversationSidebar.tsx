"use client";

// Left rail for the assistant page (design canvas "01 · Conversations passées").
// Combines the conversation history (grouped by date, searchable, with a
// "Nouvelle conversation" action) with the retained quick-access links and the
// Urgence 24/7 card, plus a profile footer. Renders as a static column on large
// screens and as an overlay drawer on small screens (design canvas "06").

import { useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowRightStartOnRectangleIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/lib/auth/context";
import { groupConversationsByDate } from "@/lib/chat/conversation-store";
import { useT } from "@/lib/preferences";

export type ConversationSidebarProps = {
  /** Whether the mobile drawer is open. */
  open: boolean;
  /** Close the mobile drawer. */
  onClose: () => void;
};

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "MA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ConversationSidebar({ open, onClose }: ConversationSidebarProps) {
  const t = useT();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { conversations, activeId, newConversation, selectConversation } = useChat();
  const [query, setQuery] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      router.push("/login");
    }
  };

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? conversations.filter((c) => c.title.toLowerCase().includes(q))
      : conversations;
    return groupConversationsByDate(filtered);
  }, [conversations, query]);

  const displayName = user?.username ?? "";
  const quickItem =
    "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13.5px] font-medium text-text transition hover:bg-brand/10 hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

  return (
    <>
      {/* Mobile backdrop */}
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-text/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={`${
          open ? "fixed inset-y-0 start-0 z-50 flex shadow-2xl" : "hidden"
        } w-[286px] shrink-0 flex-col border-e border-border bg-surface lg:static lg:z-auto lg:flex`}
      >
        {/* New conversation + mobile close */}
        <div className="flex items-center gap-2 px-3.5 pb-3 pt-4">
          <button
            type="button"
            onClick={() => {
              newConversation();
              onClose();
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-[11px] bg-brand px-3 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <PlusIcon className="h-[17px] w-[17px]" strokeWidth={2.2} />
            {t("chat.newConversation")}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("chat.closeHistory")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-border text-text-muted transition hover:text-text lg:hidden"
          >
            <XMarkIcon className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3.5 pb-3">
          <div className="flex items-center gap-2.5 rounded-[10px] border border-border bg-bg px-3 py-2.5">
            <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("chat.search")}
              aria-label={t("chat.search")}
              className="min-w-0 flex-1 bg-transparent text-[13px] text-text outline-none placeholder:text-text-muted"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="scroll-soft min-h-0 flex-1 overflow-y-auto px-2.5">
          {groups.map((group) => (
            <div key={group.labelKey}>
              <div className="px-2 pb-1.5 pt-3 text-[10px] font-semibold tracking-[0.12em] text-text-muted">
                {t(group.labelKey)}
              </div>
              {group.items.map((c) => {
                const active = c.id === activeId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      selectConversation(c.id);
                      onClose();
                    }}
                    aria-current={active ? "true" : undefined}
                    className={`mb-0.5 flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 text-left transition ${
                      active ? "bg-brand/10" : "hover:bg-brand/5"
                    }`}
                  >
                    <ChatBubbleLeftRightIcon
                      className={`h-[15px] w-[15px] shrink-0 ${active ? "text-brand" : "text-text-muted"}`}
                    />
                    <span
                      className={`min-w-0 flex-1 truncate text-[13px] ${
                        active ? "font-semibold text-brand" : "font-medium text-text"
                      }`}
                    >
                      {c.title || t("chat.untitled")}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Quick access + Urgence */}
        <div className="border-t border-border p-3.5">
          <button type="button" className={quickItem}>
            <MapPinIcon className="h-[18px] w-[18px] text-text-muted" />
            {t("nav.findAgency")}
          </button>
          <button type="button" className={quickItem}>
            <UserIcon className="h-[18px] w-[18px] text-text-muted" />
            {t("nav.clientArea")}
          </button>
          <Link href="/settings" className={quickItem} onClick={onClose}>
            <Cog6ToothIcon className="h-[18px] w-[18px] text-text-muted" />
            {t("nav.settings")}
          </Link>

          <div className="mt-2.5 rounded-xl border border-brand/25 bg-brand/10 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand">
              <PhoneIcon className="h-4 w-4" />
              {t("urgence.title")}
            </div>
            <div className="mt-1.5 text-[19px] font-bold tracking-wide text-brand" dir="ltr">
              71 104 540
            </div>
            <div className="mt-0.5 text-[11.5px] text-text-muted">{t("urgence.subtitle")}</div>
          </div>
        </div>

        {/* Profile footer */}
        <div className="flex items-center gap-2.5 border-t border-border px-3.5 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[12.5px] font-bold text-brand">
            {initialsFor(displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-text">
              {displayName || t("nav.clientArea")}
            </div>
            <div className="truncate text-[11px] text-text-muted">{t("nav.clientArea")}</div>
          </div>
          <Link
            href="/settings"
            aria-label={t("nav.settings")}
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-text-muted transition hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <Cog6ToothIcon className="h-[18px] w-[18px]" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label={t("auth.logout")}
            title={t("auth.logout")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-text-muted transition hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowRightStartOnRectangleIcon className="h-[18px] w-[18px]" />
          </button>
        </div>
      </aside>
    </>
  );
}

export default ConversationSidebar;
