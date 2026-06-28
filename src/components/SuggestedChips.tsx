"use client";

// Clickable "suggested question" chips for the empty state.
//
// Each chip submits its French question through the provided `onSelect`
// callback (wired to `useChat().sendMessage` by the page), giving first-time
// users a one-tap way to start a conversation across the main insurance themes:
// auto, habitation, santé, devis.
//
// Styling stays on semantic Theme_Token utilities so the chips re-theme in
// light/dark Color_Modes.

import {
  TruckIcon,
  HomeModernIcon,
  HeartIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";

type Suggestion = {
  /** Short label shown on the chip. */
  label: string;
  /** The full question submitted when the chip is clicked. */
  question: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const SUGGESTIONS: Suggestion[] = [
  {
    label: "Assurance auto",
    question: "Quelles assurances auto proposez-vous ?",
    Icon: TruckIcon,
  },
  {
    label: "Habitation",
    question: "Comment assurer mon habitation ?",
    Icon: HomeModernIcon,
  },
  {
    label: "Santé",
    question: "Quelles sont vos offres d'assurance santé ?",
    Icon: HeartIcon,
  },
  {
    label: "Obtenir un devis",
    question: "Comment obtenir un devis d'assurance ?",
    Icon: DocumentTextIcon,
  },
];

export type SuggestedChipsProps = {
  /** Called with the chip's full question when a chip is clicked. */
  onSelect: (question: string) => void;
};

export function SuggestedChips({ onSelect }: SuggestedChipsProps) {
  return (
    <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
      {SUGGESTIONS.map(({ label, question, Icon }) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelect(question)}
          className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm ring-1 ring-transparent transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md hover:ring-brand/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand transition group-hover:bg-brand/15">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-text">{label}</span>
            <span className="block truncate text-xs text-text-muted">{question}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export default SuggestedChips;
