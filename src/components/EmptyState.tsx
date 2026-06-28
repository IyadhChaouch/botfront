"use client";

// Beautiful empty state shown before any conversation has started.
//
// Presents the Maghrebia brand mark, a welcome heading, a short subtitle, and a
// set of one-tap suggested-question chips. The exact French strings
// "Bienvenue chez Assurances Maghrebia" and "Posez-moi une question" are
// preserved (interaction + smoke tests match them).

import { LogoMark } from "@/components/LogoMark";
import { SuggestedChips } from "@/components/SuggestedChips";
import { BRAND } from "@/lib/brand";

export type EmptyStateProps = {
  /** Submits a suggested question (wired to useChat().sendMessage). */
  onSelectSuggestion: (question: string) => void;
};

export function EmptyState({ onSelectSuggestion }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-2 py-10 text-center animate-message-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand shadow-sm ring-1 ring-brand/15">
        <LogoMark className="h-10 w-10" />
      </div>

      <h2 className="mt-6 text-2xl font-semibold tracking-tight text-text">
        Bienvenue chez {BRAND.name}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-text-muted">
        Posez-moi une question sur l&apos;assurance auto, habitation, santé ou
        demandez un devis — je compare les réponses de plusieurs modèles pour vous.
      </p>

      <div className="w-full max-w-xl">
        <SuggestedChips onSelect={onSelectSuggestion} />
      </div>
    </div>
  );
}

export default EmptyState;
