"use client";

// Client-side chat state container for the Maghrebia chatbot Frontend_App.
//
// Chat history, ratings, and per-question pending state are held with React
// hooks and Context ONLY — no Redux, no Zustand (Requirement 26.8). All
// Backend_API traffic is delegated to the typed API_Client (`lib/api/client.ts`)
// rather than fetching here directly (Requirement 26.6, 26.7).
//
// The container is conversation-aware: it owns a list of conversations, an
// active conversation, and the actions to start/select them. `state.history`
// always reflects the active conversation so existing consumers/tests keep
// working unchanged. Conversations are persisted through the Conversation_Store
// ONLY while a user session exists (the per-user key comes from the
// Auth_Context); an unauthenticated session stays in memory.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { apiClient, ApiError } from "@/lib/api/client";
import { readSession } from "@/lib/auth/session-store";
import {
  deriveTitle,
  readConversations,
  writeConversations,
  type Conversation,
} from "@/lib/chat/conversation-store";
import type { MultiModelResponse, RatingSubmission } from "@/lib/types";

/** Lifecycle of a single submitted question (drives the R7.4 pending indicator). */
export type ChatTurnStatus = "pending" | "success" | "error";

/** A captured failure for a chat turn, including the HTTP status when known. */
export type ChatError = {
  message: string;
  /** The HTTP status from an {@link ApiError}, or `null` for network errors (R7.1, R7.2). */
  status: number | null;
};

/** One entry in the chat history: a question and its eventual multi-model result. */
export type ChatTurn = {
  /** Stable identifier used as a React key and to scope ratings to this turn. */
  id: string;
  /** The user's submitted question. */
  question: string;
  /** Per-question pending/success/error state (Requirement 7.4). */
  status: ChatTurnStatus;
  /** The Multi_Model_Response once received, otherwise `null`. */
  response: MultiModelResponse | null;
  /** The captured error when `status === "error"`, otherwise `null`. */
  error: ChatError | null;
};

/** The full chat state exposed through {@link useChat}. */
export type ChatState = {
  /** Ordered chat history of the active conversation: questions and results. */
  history: ChatTurn[];
  /** Persisted-success ratings, keyed by rating target, value 1..5 (Requirement 8.3). */
  ratings: Record<string, number>;
  /** Rating actions that failed, keyed by rating target (Requirement 8.4). */
  ratingErrors: Record<string, ChatError>;
  /** True while any question in the active conversation is in flight (Requirement 7.4). */
  pending: boolean;
};

/** Lightweight conversation descriptor for the history sidebar. */
export type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: number;
};

/** The value returned by {@link useChat}. */
export type ChatContextValue = {
  state: ChatState;
  /** Conversations that hold at least one turn, for the history sidebar. */
  conversations: Conversation[];
  /** The active conversation id. */
  activeId: string;
  /** The active conversation's title (empty for a fresh draft). */
  activeTitle: string;
  /** Submit a question; delegates to {@link apiClient.postChat}. */
  sendMessage: (input: string) => Promise<void>;
  /** Persist a rating; delegates to {@link apiClient.postRating}. */
  rate: (submission: RatingSubmission) => Promise<void>;
  /** Start a fresh conversation (reuses the current one if already empty). */
  newConversation: () => void;
  /** Switch the active conversation. */
  selectConversation: (id: string) => void;
};

/**
 * Stable key identifying the rating target for a model response, so a rating
 * is scoped to the exact (model, question, response) triple it was given for.
 */
export function ratingKey(submission: RatingSubmission): string {
  return [submission.modelIdentifier, submission.question, submission.response].join("\u0000");
}

function toChatError(err: unknown): ChatError {
  if (err instanceof ApiError) {
    // Non-2xx response: keep the status so the UI can include it (R7.2).
    return { message: err.message, status: err.status };
  }
  if (err instanceof Error) {
    // Network / unexpected failure: retryable, no HTTP status (R7.1).
    return { message: err.message, status: null };
  }
  return { message: "Unknown error", status: null };
}

let idCounter = 0;
function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeDraft(): Conversation {
  const now = Date.now();
  return { id: genId("conv"), title: "", createdAt: now, updatedAt: now, turns: [] };
}

type Action =
  | { type: "send/start"; turn: ChatTurn }
  | { type: "send/success"; id: string; response: MultiModelResponse }
  | { type: "send/error"; id: string; error: ChatError }
  | { type: "rate/success"; key: string; value: number }
  | { type: "rate/error"; key: string; error: ChatError }
  | { type: "conv/new" }
  | { type: "conv/select"; id: string }
  | { type: "conv/load"; conversations: Conversation[] }
  | { type: "conv/reset" };

type InternalState = {
  conversations: Conversation[];
  activeId: string;
  ratings: Record<string, number>;
  ratingErrors: Record<string, ChatError>;
};

function freshState(): InternalState {
  const draft = makeDraft();
  return { conversations: [draft], activeId: draft.id, ratings: {}, ratingErrors: {} };
}

function hasPending(history: ChatTurn[]): boolean {
  return history.some((turn) => turn.status === "pending");
}

/** Map the conversation that contains `turnId`, applying `patch` to that turn. */
function patchTurnAnywhere(
  conversations: Conversation[],
  turnId: string,
  patch: Partial<ChatTurn>,
): Conversation[] {
  return conversations.map((c) =>
    c.turns.some((t) => t.id === turnId)
      ? {
          ...c,
          turns: c.turns.map((t) => (t.id === turnId ? { ...t, ...patch } : t)),
          updatedAt: Date.now(),
        }
      : c,
  );
}

function reducer(state: InternalState, action: Action): InternalState {
  switch (action.type) {
    case "send/start": {
      const conversations = state.conversations.map((c) =>
        c.id === state.activeId
          ? {
              ...c,
              turns: [...c.turns, action.turn],
              title: c.title || deriveTitle(action.turn.question),
              updatedAt: Date.now(),
            }
          : c,
      );
      return { ...state, conversations };
    }
    case "send/success": {
      return {
        ...state,
        conversations: patchTurnAnywhere(state.conversations, action.id, {
          status: "success",
          response: action.response,
          error: null,
        }),
      };
    }
    case "send/error": {
      return {
        ...state,
        conversations: patchTurnAnywhere(state.conversations, action.id, {
          status: "error",
          error: action.error,
        }),
      };
    }
    case "rate/success": {
      const ratings = { ...state.ratings, [action.key]: action.value };
      const ratingErrors = { ...state.ratingErrors };
      delete ratingErrors[action.key];
      return { ...state, ratings, ratingErrors };
    }
    case "rate/error": {
      const ratingErrors = { ...state.ratingErrors, [action.key]: action.error };
      return { ...state, ratingErrors };
    }
    case "conv/new": {
      const active = state.conversations.find((c) => c.id === state.activeId);
      // Reuse the current conversation if it is already an empty draft.
      if (active && active.turns.length === 0) return state;
      const draft = makeDraft();
      return { ...state, conversations: [...state.conversations, draft], activeId: draft.id };
    }
    case "conv/select": {
      if (!state.conversations.some((c) => c.id === action.id)) return state;
      return { ...state, activeId: action.id };
    }
    case "conv/load": {
      const loaded = action.conversations.filter((c) => c.turns.length > 0);
      if (loaded.length === 0) return freshState();
      const sorted = [...loaded].sort((a, b) => b.updatedAt - a.updatedAt);
      return { conversations: sorted, activeId: sorted[0].id, ratings: {}, ratingErrors: {} };
    }
    case "conv/reset":
      return freshState();
    default:
      return state;
  }
}

const ChatContext = createContext<ChatContextValue | null>(null);

/**
 * Provides chat history, ratings, conversations, and pending state to the
 * subtree via React Context. Wrap chat surfaces in `<ChatProvider>` so
 * components can call `useChat()` (Requirement 26.8).
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, freshState);
  // Namespace persistence per authenticated user. Read once on mount from the
  // Session_Store rather than the Auth_Context so the provider has no hard
  // dependency on an AuthProvider (keeps isolated component tests mountable);
  // an unauthenticated session stays ephemeral.
  const [userKey, setUserKey] = useState<string | null>(null);

  useEffect(() => {
    const session = readSession();
    setUserKey(session ? String(session.user.id) : null);
  }, []);

  // Load (or reset) persisted conversations whenever the active user changes.
  // Unauthenticated → ephemeral fresh state; no cross-user bleed.
  useEffect(() => {
    if (!userKey) {
      dispatch({ type: "conv/reset" });
      return;
    }
    dispatch({ type: "conv/load", conversations: readConversations(userKey) });
  }, [userKey]);

  // Persist on every change while a session exists (empty drafts are dropped).
  useEffect(() => {
    if (!userKey) return;
    writeConversations(userKey, state.conversations);
  }, [userKey, state.conversations]);

  const turnSeq = useRef(0);

  const sendMessage = useCallback(async (input: string): Promise<void> => {
    const id = `turn-${turnSeq.current++}`;
    dispatch({
      type: "send/start",
      turn: { id, question: input, status: "pending", response: null, error: null },
    });
    try {
      const response = await apiClient.postChat(input);
      dispatch({ type: "send/success", id, response });
    } catch (err) {
      dispatch({ type: "send/error", id, error: toChatError(err) });
    }
  }, []);

  const rate = useCallback(async (submission: RatingSubmission): Promise<void> => {
    const key = ratingKey(submission);
    try {
      await apiClient.postRating(submission);
      dispatch({ type: "rate/success", key, value: submission.value });
    } catch (err) {
      dispatch({ type: "rate/error", key, error: toChatError(err) });
    }
  }, []);

  const newConversation = useCallback(() => dispatch({ type: "conv/new" }), []);
  const selectConversation = useCallback(
    (id: string) => dispatch({ type: "conv/select", id }),
    [],
  );

  const value = useMemo<ChatContextValue>(() => {
    const active =
      state.conversations.find((c) => c.id === state.activeId) ?? state.conversations[0];
    const history = active?.turns ?? [];
    const publicState: ChatState = {
      history,
      ratings: state.ratings,
      ratingErrors: state.ratingErrors,
      pending: hasPending(history),
    };
    return {
      state: publicState,
      conversations: state.conversations.filter((c) => c.turns.length > 0),
      activeId: state.activeId,
      activeTitle: active?.title ?? "",
      sendMessage,
      rate,
      newConversation,
      selectConversation,
    };
  }, [state, sendMessage, rate, newConversation, selectConversation]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/**
 * Access the chat state container. Must be called from within a
 * `<ChatProvider>`; throws otherwise to fail fast during development.
 */
export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (ctx === null) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return ctx;
}
