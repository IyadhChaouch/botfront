"use client";

// Task 13.3: the star-rating control for a single model response.
//
// When the user clicks a star (1..5) the control posts the rating fields
// (modelIdentifier, question, response, value) to `/api/rate` via the
// `useChat().rate` action, which delegates to the typed API_Client
// (Requirement 8.1). The hook updates state on the outcome:
//
//   - On success it records the value under `state.ratings[ratingKey]`, so the
//     control reads the current rating straight from there and renders the
//     selected star as filled (Requirement 8.3).
//   - On failure `state.ratings` is left unchanged and `state.ratingErrors[key]`
//     is set, so the control keeps showing the prior rating and surfaces an
//     error indicator (Requirement 8.4).
//
// Semantic rating-star theming (Task 15.3): filled stars use the
// `text-star-filled` Theme_Token (`--color-star-filled`) and empty stars use
// `text-star-empty` (`--color-star-empty`). Heroicons render with `currentColor`
// (solid fills, outline strokes), so the text-color token drives both icon
// variants and re-themes across light/dark Color_Modes (Requirement 25.5).

import { useState } from "react";

import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { StarIcon as StarOutline } from "@heroicons/react/24/outline";

import { ratingKey, useChat } from "@/hooks/useChat";
import type { RatingSubmission } from "@/lib/types";

/** The five selectable rating values (1..5 inclusive, Requirement 8.5). */
const STAR_VALUES = [1, 2, 3, 4, 5] as const;

export type StarRatingProps = {
  /** The Model_Identifier of the response being rated (Requirement 8.1). */
  modelIdentifier: string;
  /** The question the rated response answered (Requirement 8.1). */
  question: string;
  /** The exact response text being rated (Requirement 8.1). */
  response: string;
};

/**
 * Renders an interactive 1..5 star control for one model response.
 *
 * The "current rating" is sourced from the shared chat state
 * (`state.ratings[ratingKey]`) rather than local component state, so it only
 * reflects a successfully persisted rating (Requirement 8.3) and is left intact
 * when a submission fails (Requirement 8.4).
 */
export function StarRating({ modelIdentifier, question, response }: StarRatingProps) {
  const { state, rate } = useChat();
  // Preview-on-hover, purely visual; never substitutes for the persisted value.
  const [hovered, setHovered] = useState<number | null>(null);
  // Disables the control while a submission is in flight to avoid double posts.
  const [submitting, setSubmitting] = useState(false);

  const key = ratingKey({ modelIdentifier, question, response, value: 0 });
  const currentRating = state.ratings[key] ?? 0;
  const hasError = state.ratingErrors[key] !== undefined;

  const handleRate = async (value: number) => {
    if (submitting) return;
    const submission: RatingSubmission = { modelIdentifier, question, response, value };
    setSubmitting(true);
    try {
      // Outcome (success/failure) is reflected in the shared chat state by the
      // hook; the control re-renders from `state.ratings` / `state.ratingErrors`.
      await rate(submission);
    } finally {
      setSubmitting(false);
    }
  };

  // The star shown as active follows the hover preview when present, otherwise
  // the persisted current rating (Requirement 8.3).
  const activeValue = hovered ?? currentRating;

  return (
    <div className="mt-4 border-t border-border pt-3">
      <div
        className="flex items-center gap-0.5"
        role="radiogroup"
        aria-label="Rate this response from 1 to 5 stars"
        onMouseLeave={() => setHovered(null)}
      >
        {STAR_VALUES.map((value) => {
          const filled = value <= activeValue;
          const Icon = filled ? StarSolid : StarOutline;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={value === currentRating}
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              disabled={submitting}
              onMouseEnter={() => setHovered(value)}
              onFocus={() => setHovered(value)}
              onClick={() => void handleRate(value)}
              className="rounded-md p-1 transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon
                className={`h-5 w-5 transition-colors ${
                  filled ? "text-star-filled" : "text-star-empty"
                }`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      {hasError ? (
        // Failure indicator; the prior rating above is retained (Requirement 8.4).
        <p role="alert" className="mt-1 text-xs font-medium text-error">
          Rating failed. Please try again.
        </p>
      ) : null}
    </div>
  );
}

export default StarRating;
