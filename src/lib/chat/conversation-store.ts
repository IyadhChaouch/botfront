// Conversation_Store — client-side persistence for the chat history sidebar.
//
// The Backend_API has no endpoint for stored conversations, so past
// conversations are kept in localStorage, namespaced per authenticated user
// (`mgb-conversations:<userId>`), mirroring the `mgb-*` key convention used by
// preferences/auth. Persistence is opt-in: the Auth_Context only wires a user
// key once a session exists, so an unauthenticated session stays ephemeral.
//
// Every helper is defensive and never throws: a missing/malformed record reads
// back as an empty list, and a write failure (quota/unavailable) is swallowed.

import type { ChatTurn } from "@/hooks/useChat";

/** A stored conversation: an ordered list of chat turns plus title/timestamps. */
export type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  turns: ChatTurn[];
};

const STORAGE_PREFIX = "mgb-conversations";

function keyFor(userKey: string): string {
  return `${STORAGE_PREFIX}:${userKey}`;
}

function isConversation(value: unknown): value is Conversation {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    typeof c.title === "string" &&
    typeof c.createdAt === "number" &&
    typeof c.updatedAt === "number" &&
    Array.isArray(c.turns)
  );
}

/** Read and validate the persisted conversations for a user; `[]` on anything odd. */
export function readConversations(userKey: string): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(userKey));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isConversation);
  } catch {
    return [];
  }
}

/** Persist a user's conversations (empty drafts are dropped). Never throws. */
export function writeConversations(userKey: string, list: Conversation[]): void {
  if (typeof window === "undefined") return;
  try {
    const nonEmpty = list.filter((c) => c.turns.length > 0);
    window.localStorage.setItem(keyFor(userKey), JSON.stringify(nonEmpty));
  } catch {
    // localStorage unavailable or quota exceeded — keep conversations in memory.
  }
}

/** Remove all persisted conversations for a user. Never throws. */
export function clearConversations(userKey: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(keyFor(userKey));
  } catch {
    // Nothing to clear / storage unavailable.
  }
}

/** Build a short conversation title from the first message text. */
export function deriveTitle(text: string): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (normalized.length === 0) return "";
  return normalized.length <= 48 ? normalized : `${normalized.slice(0, 48).trimEnd()}…`;
}

export type ConversationGroup = {
  /** Dictionary key for the group heading (history.today / .yesterday / …). */
  labelKey: string;
  items: Conversation[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Group conversations into Today / Yesterday / Last 7 days / Older buckets,
 * each ordered most-recent-first, dropping empty buckets.
 */
export function groupConversationsByDate(
  list: Conversation[],
  now: number = Date.now(),
): ConversationGroup[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayStart = startOfToday.getTime();
  const yesterdayStart = todayStart - DAY_MS;
  const last7Start = todayStart - 6 * DAY_MS;

  const sorted = [...list]
    .filter((c) => c.turns.length > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const last7: Conversation[] = [];
  const older: Conversation[] = [];

  for (const c of sorted) {
    if (c.updatedAt >= todayStart) today.push(c);
    else if (c.updatedAt >= yesterdayStart) yesterday.push(c);
    else if (c.updatedAt >= last7Start) last7.push(c);
    else older.push(c);
  }

  return [
    { labelKey: "history.today", items: today },
    { labelKey: "history.yesterday", items: yesterday },
    { labelKey: "history.last7", items: last7 },
    { labelKey: "history.older", items: older },
  ].filter((g) => g.items.length > 0);
}
