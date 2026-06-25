"use client";

// Right-aligned user message bubble for the chat conversation.
//
// Renders the user's submitted question as a brand-tinted chat bubble pinned to
// the right of the conversation column, in the style of a modern messaging app.
// Styling stays on semantic Theme_Token utilities for light/dark parity.

import { UserIcon } from "@heroicons/react/24/solid";

export type MessageBubbleProps = {
  /** The user's question text. */
  text: string;
};

export function MessageBubble({ text }: MessageBubbleProps) {
  return (
    <div className="flex justify-end gap-2.5">
      <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-brand/10 px-4 py-2.5 text-text shadow-sm ring-1 ring-brand/15">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
      </div>
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
        <UserIcon className="h-4 w-4" aria-hidden="true" />
      </span>
    </div>
  );
}

export default MessageBubble;
