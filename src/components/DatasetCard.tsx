"use client";

// Task 12.2: the distinct dataset-match result card.
//
// The dataset card is rendered ONLY when the Multi_Model_Response carries a
// present AND well-formed dataset match: `dataset_match === true` and a
// `dataset` object that has all required fields (success / response / intent /
// source / model) with the right primitive types. When the match is absent,
// malformed, or incomplete, the card is omitted entirely — no empty card is
// shown (Requirement 6.3, 6.4).
//
// Because the response is received over the network, the shape is validated at
// runtime here rather than trusting the static `DatasetMatch` type.
//
// Semantic theming (Task 15.3): the card consumes Brand_Palette Theme_Token
// utility classes (`bg-surface`, `border-brand`, `text-brand`, `text-text`,
// `text-text-muted`) so the distinct dataset card re-themes automatically across
// light/dark Color_Modes (Requirement 25.2, 25.6).

import type { DatasetMatch, MultiModelResponse } from "@/lib/types";
import { StarRating } from "@/components/StarRating";

/** The dataset-match `source` labels the backend is allowed to emit. */
const DATASET_SOURCES = ["bert", "tfidf"] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Runtime guard: is `value` a well-formed {@link DatasetMatch}?
 *
 * Requires every field the design lists for a dataset card —
 * `success` (boolean), `response` / `intent` / `model` (non-empty strings),
 * and `source` (one of the known labels). Anything missing or mistyped makes
 * the match malformed and the card is omitted (Requirement 6.4).
 */
export function isWellFormedDatasetMatch(value: unknown): value is DatasetMatch {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const m = value as Record<string, unknown>;
  return (
    typeof m.success === "boolean" &&
    isNonEmptyString(m.response) &&
    isNonEmptyString(m.intent) &&
    isNonEmptyString(m.model) &&
    typeof m.source === "string" &&
    (DATASET_SOURCES as readonly string[]).includes(m.source)
  );
}

/**
 * Decide whether the response should show a dataset card. True only when the
 * match is flagged present (`dataset_match`) AND the `dataset` payload is
 * well-formed (Requirement 6.3, 6.4).
 */
export function shouldRenderDatasetCard(
  response: Pick<MultiModelResponse, "dataset_match" | "dataset">,
): response is { dataset_match: true; dataset: DatasetMatch } {
  return response.dataset_match === true && isWellFormedDatasetMatch(response.dataset);
}

export type DatasetCardProps = {
  /** The well-formed dataset match to render. */
  dataset: DatasetMatch;
  /** The question this match answered, needed to build the rating submission. */
  question: string;
};

/**
 * Renders the distinct, labeled dataset-match card. Callers should gate this
 * behind {@link shouldRenderDatasetCard} so it is only mounted for a present,
 * well-formed match (Requirement 6.3).
 */
export function DatasetCard({ dataset, question }: DatasetCardProps) {
  return (
    <div className="rounded-2xl border border-brand bg-surface p-4 shadow-sm ring-1 ring-brand/10">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold text-text-muted">{dataset.model}</span>
        <span className="inline-flex items-center rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand">
          {dataset.source}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">{dataset.response}</p>
      <div className="mt-3 text-xs text-text-muted">Intent: {dataset.intent}</div>
      {/* Rating control for the dataset match (Requirement 8.1), scoped to this
          (model, question, response) triple. */}
      <StarRating
        modelIdentifier={dataset.model}
        question={question}
        response={dataset.response}
      />
    </div>
  );
}

export default DatasetCard;
