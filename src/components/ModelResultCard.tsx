"use client";

// Task 12.2: one labeled result card per model entry in a Multi_Model_Response.
//
// Each card is labeled with the model. A successful entry (`success === true`)
// renders its response content; a failed entry (`success === false`) renders its
// error message. Rendering is per-entry and independent, so a failed card never
// suppresses the successful cards rendered alongside it (Requirement 6.2, 6.5).
//
// Semantic theming (Task 15.3): the card consumes Brand_Palette Theme_Token
// utility classes (`bg-surface`, `text-text`, `text-text-muted`, `text-success`,
// `text-error`) so its success/failure states map to the `--color-success` /
// `--color-error` Semantic_Color tokens and re-theme automatically across
// light/dark Color_Modes (Requirement 25.2, 25.4, 25.6).
//
// Task 13.3: a successful model response also carries a star-rating control so
// the user can rate it. The control needs the (modelIdentifier, question,
// response) triple to build the rating submission, so the question is threaded
// through from the chat turn (Requirement 8.1).

import { StarRating } from "@/components/StarRating";
import type { ModelResult } from "@/lib/types";

export type ModelResultCardProps = {
  /** The Model_Identifier key from the response `models` map (fallback label). */
  modelId: string;
  /** The model's result entry. */
  result: ModelResult;
  /** The question this result answered, needed to build the rating submission. */
  question: string;
};

/**
 * Renders a single labeled model result card.
 *
 * - Label: the provider model name (`result.model`) when present, else `modelId`.
 * - Success: shows the response content (Requirement 6.2).
 * - Failure: shows the error message without affecting sibling cards
 *   (Requirement 6.5).
 */
export function ModelResultCard({ modelId, result, question }: ModelResultCardProps) {
  const label = result.model || modelId;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm ring-1 ring-transparent transition hover:shadow-md">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold text-text-muted">{label}</span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            result.success
              ? "bg-success/10 text-success"
              : "bg-error/10 text-error"
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              result.success ? "bg-success" : "bg-error"
            }`}
            aria-hidden="true"
          />
          {result.success ? "OK" : "Failed"}
        </span>
      </div>

      {result.success ? (
        <>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
            {result.response ?? ""}
          </p>
          {/* Rating control for the successful response (Requirement 8.1). The
              rating is scoped to this (model, question, response) triple. */}
          {result.response ? (
            <StarRating
              modelIdentifier={modelId}
              question={question}
              response={result.response}
            />
          ) : null}
        </>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-error">
          {result.error ?? "No response"}
        </p>
      )}
    </div>
  );
}

export default ModelResultCard;
