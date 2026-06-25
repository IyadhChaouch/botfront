// Property-based test for the dataset-match result card.
//
// Feature: chatbot-refactor, Property 9: Dataset card renders iff well-formed
// Validates: Requirements 6.3, 6.4
//
// Property 9 — "Dataset card renders iff well-formed": the dataset card is
// shown if and only if the Multi_Model_Response carries a dataset match that is
// BOTH present (`dataset_match === true`) AND well-formed (a complete `dataset`
// object with `success` (boolean), non-empty `response`/`intent`/`model`
// strings, and a `source` in {bert, tfidf}). For every other shape — match
// flagged absent, `dataset` null, or a missing/mistyped field — the card is
// omitted with no empty card shown (Requirement 6.3, 6.4).
//
// We exercise both the gating predicate (`shouldRenderDatasetCard`) and the
// actual render path (mirroring the `page.tsx` gate) with @testing-library so
// the card's presence in the DOM tracks well-formedness exactly.

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import fc from "fast-check";

import {
  DatasetCard,
  shouldRenderDatasetCard,
} from "@/components/DatasetCard";
import { ChatProvider } from "@/hooks/useChat";
import type { DatasetMatch, MultiModelResponse } from "@/lib/types";

const NUM_RUNS = 200;

/** Non-empty string with no leading/trailing whitespace, queryable in the DOM. */
const safeText = fc
  .string({ minLength: 1, maxLength: 24 })
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

/** A fully well-formed dataset match (Requirement 6.3). */
const wellFormedDataset: fc.Arbitrary<DatasetMatch> = fc.record({
  success: fc.boolean(),
  response: safeText,
  intent: safeText,
  source: fc.constantFrom("bert", "tfidf") as fc.Arbitrary<"bert" | "tfidf">,
  // The type narrows `model` to a literal, but the runtime guard only requires
  // a non-empty string, so we generate arbitrary non-empty labels.
  model: safeText as fc.Arbitrary<DatasetMatch["model"]>,
});

/**
 * A dataset object that is guaranteed ill-formed: start from a well-formed base
 * and apply exactly one mutation that always breaks the runtime guard
 * (Requirement 6.4).
 */
const malformedDataset: fc.Arbitrary<unknown> = fc
  .record({
    base: wellFormedDataset,
    mutation: fc.constantFrom(
      "success-nonbool",
      "response-empty",
      "response-nonstring",
      "intent-empty",
      "intent-nonstring",
      "model-empty",
      "model-nonstring",
      "source-invalid",
      "source-nonstring",
      "drop-success",
      "drop-response",
      "drop-intent",
      "drop-model",
      "drop-source",
    ),
  })
  .map(({ base, mutation }) => {
    const m: Record<string, unknown> = { ...base };
    switch (mutation) {
      case "success-nonbool":
        m.success = "true";
        break;
      case "response-empty":
        m.response = "";
        break;
      case "response-nonstring":
        m.response = 42;
        break;
      case "intent-empty":
        m.intent = "";
        break;
      case "intent-nonstring":
        m.intent = null;
        break;
      case "model-empty":
        m.model = "";
        break;
      case "model-nonstring":
        m.model = 7;
        break;
      case "source-invalid":
        m.source = "svm";
        break;
      case "source-nonstring":
        m.source = 1;
        break;
      case "drop-success":
        delete m.success;
        break;
      case "drop-response":
        delete m.response;
        break;
      case "drop-intent":
        delete m.intent;
        break;
      case "drop-model":
        delete m.model;
        break;
      case "drop-source":
        delete m.source;
        break;
    }
    return m;
  });

type Labeled = {
  /** The response shape passed to the gate. */
  response: Pick<MultiModelResponse, "dataset_match" | "dataset">;
  /** The ground-truth expectation: should the card render? */
  shouldRender: boolean;
  /** The well-formed payload, present only when shouldRender is true. */
  dataset?: DatasetMatch;
};

/** Well-formed AND present -> the card must render. */
const wellFormedPresentCase: fc.Arbitrary<Labeled> = wellFormedDataset.map(
  (dataset) => ({
    response: { dataset_match: true, dataset },
    shouldRender: true,
    dataset,
  }),
);

/**
 * Every other shape -> the card must be omitted (Requirement 6.4):
 *  - flagged absent (`dataset_match` not strictly true), even with a valid payload
 *  - `dataset` is null
 *  - `dataset` present but malformed/incomplete (with or without the flag)
 */
const omittedCase: fc.Arbitrary<Labeled> = fc
  .oneof(
    // Flag false, payload null.
    fc.record({
      dataset_match: fc.constant(false),
      dataset: fc.constant(null),
    }),
    // Flag false, but payload is well-formed: absence flag wins.
    fc.record({
      dataset_match: fc.constant(false),
      dataset: wellFormedDataset,
    }),
    // Flag not-strictly-true (truthy-but-wrong / null), well-formed payload.
    fc.record({
      dataset_match: fc.constantFrom(
        null as unknown as boolean,
        1 as unknown as boolean,
      ),
      dataset: wellFormedDataset,
    }),
    // Flag true, payload null.
    fc.record({
      dataset_match: fc.constant(true),
      dataset: fc.constant(null),
    }),
    // Flag true, payload malformed/incomplete.
    fc.record({
      dataset_match: fc.constant(true),
      dataset: malformedDataset,
    }),
    // Flag false, payload malformed.
    fc.record({
      dataset_match: fc.constant(false),
      dataset: malformedDataset,
    }),
  )
  .map((response) => ({
    response: response as Pick<MultiModelResponse, "dataset_match" | "dataset">,
    shouldRender: false,
  }));

const anyCase: fc.Arbitrary<Labeled> = fc.oneof(
  wellFormedPresentCase,
  omittedCase,
);

/**
 * Mirror of the `page.tsx` gate: render the dataset card only when the response
 * is a present, well-formed match. The fixed `data-testid` wrapper lets the
 * test assert presence/absence regardless of the card's internal markup.
 */
function DatasetSection({
  response,
}: {
  response: Pick<MultiModelResponse, "dataset_match" | "dataset">;
}) {
  return (
    <div data-testid="dataset-section">
      {shouldRenderDatasetCard(response) ? (
        <DatasetCard dataset={response.dataset} question="Question?" />
      ) : null}
    </div>
  );
}

describe("Property 9: Dataset card renders iff well-formed (R6.3, R6.4)", () => {
  it("shouldRenderDatasetCard is true exactly for present, well-formed matches", () => {
    fc.assert(
      fc.property(anyCase, ({ response, shouldRender }) => {
        expect(shouldRenderDatasetCard(response)).toBe(shouldRender);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("renders the dataset card in the DOM if and only if the match is well-formed", () => {
    fc.assert(
      fc.property(anyCase, ({ response, shouldRender, dataset }) => {
        const { unmount, getByTestId } = render(
          <ChatProvider>
            <DatasetSection response={response} />
          </ChatProvider>,
        );
        try {
          const section = getByTestId("dataset-section");
          if (shouldRender) {
            // A card is mounted...
            expect(section.childElementCount).toBeGreaterThan(0);
            // ...and it carries the well-formed match's content. We assert
            // against the raw `textContent` (which is NOT whitespace-normalized)
            // rather than Testing Library's text queries: the default text
            // matcher collapses runs of whitespace, but the card renders the
            // response under `whitespace-pre-wrap` as literal text. A generated
            // `response` containing consecutive spaces (e.g. "!  !") would then
            // fail a normalized query ("! !") even though the literal text is
            // present — a test-harness artifact, not a product defect.
            // `textContent` containment is exact and deterministic.
            expect(section.textContent ?? "").toContain(dataset!.response);
          } else {
            // No empty card is shown for absent/malformed matches.
            expect(section.childElementCount).toBe(0);
          }
        } finally {
          unmount();
        }
      }),
      { numRuns: 100 },
    );
  });
});
