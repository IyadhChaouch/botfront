'use client';

import { useEffect, useRef, useState } from 'react';

import { Bars3Icon } from '@heroicons/react/24/outline';

import { AppHeader } from '@/components/AppHeader';
import { CardErrorBoundary } from '@/components/CardErrorBoundary';
import { Composer } from '@/components/Composer';
import { ConversationSidebar } from '@/components/ConversationSidebar';
import { DatasetCard, shouldRenderDatasetCard } from '@/components/DatasetCard';
import { EmptyState } from '@/components/EmptyState';
import { LogoMark } from '@/components/LogoMark';
import { MessageBubble } from '@/components/MessageBubble';
import { ModelResultCard } from '@/components/ModelResultCard';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { ChatProvider, useChat, type ChatError } from '@/hooks/useChat';
import { useT } from '@/lib/preferences';
import type { MultiModelResponse } from '@/lib/types';

// The assistant home: a conversation-history sidebar (past conversations,
// search, "Nouvelle conversation", quick access + Urgence card, profile), a
// centered conversation column, and the redesigned composer (attach, voice,
// send). Send still flows through the typed API_Client via `useChat`; per-model
// and dataset cards remain wrapped in per-card error boundaries (R6.2–6.5, 7.3).
// A microphone in the composer opens the `/voice` mode, which hands a recognized
// question back here through sessionStorage.

const VOICE_HANDOFF_KEY = 'mgb-voice-pending';

/** Renders the per-model and dataset cards of a received Multi_Model_Response. */
function ResponseView({
  response,
  question,
}: {
  response: MultiModelResponse;
  question: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Object.entries(response.models).map(([modelId, result]) => (
        <CardErrorBoundary key={modelId} label={result.model || modelId}>
          <ModelResultCard modelId={modelId} result={result} question={question} />
        </CardErrorBoundary>
      ))}

      {shouldRenderDatasetCard(response) ? (
        <CardErrorBoundary label="Dataset Match">
          <DatasetCard dataset={response.dataset} question={question} />
        </CardErrorBoundary>
      ) : null}
    </div>
  );
}

/**
 * Renders a send failure for a chat turn (Requirement 7.1, 7.2).
 */
function TurnError({
  error,
  question,
  onRetry,
}: {
  error: ChatError | null;
  question: string;
  onRetry: (question: string) => void;
}) {
  if (error === null || error.status === null) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-3 rounded-2xl border border-error bg-surface px-4 py-3 text-sm text-error shadow-sm"
      >
        <span>
          {error?.message
            ? `Network error: ${error.message}. Please try again.`
            : 'Network error. Please try again.'}
        </span>
        <button
          type="button"
          onClick={() => onRetry(question)}
          className="rounded-lg border border-error px-3 py-1 text-xs font-semibold transition hover:bg-error/10"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="rounded-2xl border border-error bg-surface px-4 py-3 text-sm text-error shadow-sm"
    >
      Request failed with status {error.status}: {error.message}
    </div>
  );
}

/** The refined assistant "typing" indicator shown while a question is pending. */
function PendingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-message-in">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand ring-1 ring-brand/15">
        <LogoMark className="h-5 w-5" />
      </span>
      <div
        className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-border bg-surface px-4 py-3 shadow-sm"
        role="status"
        aria-live="polite"
      >
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-warning" />
        <span className="text-sm text-text-muted">Thinking…</span>
      </div>
    </div>
  );
}

function ChatPage() {
  const t = useT();
  const { state, sendMessage, activeTitle } = useChat();
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    const question = input.trim();
    if (!question) return; // empty / whitespace-only input is not submitted
    setInput('');
    void sendMessage(question);
  };

  // Consume a question handed off from the voice mode (see `/voice`).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pending = window.sessionStorage.getItem(VOICE_HANDOFF_KEY);
    if (pending && pending.trim()) {
      window.sessionStorage.removeItem(VOICE_HANDOFF_KEY);
      void sendMessage(pending.trim());
    }
  }, [sendMessage]);

  // Scroll the most recent message into view whenever the chat history updates
  // (Requirement 11.3).
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.history]);

  return (
    <div className="flex h-screen flex-col bg-bg text-text">
      <AppHeader active="assistant" />

      <div className="flex min-h-0 flex-1">
        <ConversationSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Conversation column */}
        <main className="flex min-w-0 flex-1 flex-col bg-bg">
          {/* Conversation title bar (+ mobile history toggle) */}
          <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-border bg-surface px-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label={t('chat.openHistory')}
              className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-border text-text-muted transition hover:text-text lg:hidden"
            >
              <Bars3Icon className="h-[18px] w-[18px]" />
            </button>
            <div className="truncate text-[14.5px] font-semibold text-text">
              {activeTitle || t('chat.untitled')}
            </div>
          </div>

          <div className="scroll-soft flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 py-6">
              {state.history.length === 0 ? (
                <EmptyState onSelectSuggestion={(question) => void sendMessage(question)} />
              ) : (
                <div className="space-y-8">
                  {state.history.map((turn) => (
                    <div key={turn.id} className="space-y-4 animate-message-in">
                      <MessageBubble text={turn.question} />

                      {turn.status === 'pending' ? <PendingIndicator /> : null}

                      {turn.status === 'error' ? (
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand ring-1 ring-brand/15">
                            <LogoMark className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <TurnError
                              error={turn.error}
                              question={turn.question}
                              onRetry={(question) => void sendMessage(question)}
                            />
                          </div>
                        </div>
                      ) : null}

                      {turn.status === 'success' && turn.response ? (
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand ring-1 ring-brand/15">
                            <LogoMark className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <ResponseView response={turn.response} question={turn.question} />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <Composer
            input={input}
            setInput={setInput}
            onSend={handleSend}
            pending={state.pending}
          />
        </main>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <RouteGuard routeClass="protected">
      <ChatProvider>
        <ChatPage />
      </ChatProvider>
    </RouteGuard>
  );
}
