"use client";

// Chat composer (design canvas "05 · Zone de saisie"). A rounded input row with
// an attachment button, a voice (microphone) button that opens the voice mode,
// and a send button that stays disabled until the field holds non-whitespace
// content (Requirement 11.4, 11.5).
//
// Attachments are staged client-side only (shown as a removable chip) — the
// Backend_API exposes no upload endpoint, so the file is held in state and
// cleared on send. The microphone routes to `/voice`. The input keeps its
// "Ask something..." placeholder and the send control its "Send" label so the
// existing interaction/property tests remain valid.

import { useRef, useState } from "react";

import { useRouter } from "next/navigation";

import {
  MicrophoneIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { useT } from "@/lib/preferences";

export type ComposerProps = {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  pending: boolean;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function Composer({ input, setInput, onSend, pending }: ComposerProps) {
  const t = useT();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<File | null>(null);

  const canSend = input.trim().length > 0;

  const handleSend = () => {
    if (!canSend) return;
    onSend();
    setAttachment(null);
  };

  return (
    <div className="border-t border-border bg-surface px-4 py-4 sm:px-7">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl border border-border bg-bg p-2 transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
          {/* Staged attachment chip (visual only — no upload backend). */}
          {attachment ? (
            <div className="mx-1 mb-2 flex w-fit items-center gap-2.5 rounded-[11px] border border-border bg-surface px-3 py-2">
              <PaperClipIcon className="h-4 w-4 text-brand" />
              <div className="min-w-0">
                <div className="max-w-[200px] truncate text-[12px] font-semibold text-text">
                  {attachment.name}
                </div>
                <div className="text-[10.5px] text-text-muted">{formatSize(attachment.size)}</div>
              </div>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                aria-label={t("chat.closeHistory")}
                className="text-text-muted transition hover:text-text"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div className="flex items-end gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label={t("chat.attach")}
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] text-text-muted transition hover:bg-brand/10 hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <PaperClipIcon className="h-5 w-5" />
            </button>

            <input
              type="text"
              className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-[14.5px] text-text outline-none placeholder:text-text-muted"
              placeholder="Ask something..."
              value={input}
              disabled={pending}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSend) handleSend();
              }}
            />

            <button
              type="button"
              onClick={() => router.push("/voice")}
              aria-label={t("chat.voiceMode")}
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] text-text-muted transition hover:bg-brand/10 hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <MicrophoneIcon className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              aria-label="Send"
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-brand-dark text-white transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:bg-border disabled:text-text-muted disabled:hover:opacity-100"
            >
              <PaperAirplaneIcon className="h-[19px] w-[19px]" />
            </button>
          </div>
        </div>

        <p className="mt-2.5 text-center text-[11.5px] text-text-muted">{t("chat.disclaimer")}</p>
      </div>
    </div>
  );
}

export default Composer;
