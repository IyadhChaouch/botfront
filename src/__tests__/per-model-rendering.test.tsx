// Property-based test for per-model result-card rendering.
//
// Feature: chatbot-refactor, Property 10: Per-model rendering preserves
// successes and surfaces failures
//
// **Validates: Requirements 6.2, 6.5**
//
// Requirement 6.2: when the Frontend_App receives a Multi_Model_Response it
// displays ONE labeled result card for each model present in the response.
// Requirement 6.5: when an individual model result indicates failure, the
// Frontend_App displays the failure message for that model WHILE STILL
// displaying the successful model results.
//
// The property therefore asserts, for any models map (an arbitrary mix of
// success / failure entries — all success, all fail, mixed, single, several):
//   1. exactly one labeled card is rendered per model entry;
//   2. every successful entry's response content is present;
//   3. every failed entry's error message is surfaced;
//   4. failures never suppress successes and successes never suppress failures
//      (covered by 2 + 3 holding simultaneously on mixed maps).
//
// This mirrors the per-model rendering of `ResponseView` in `app/page.tsx`
// (one `<ModelResultCard>` per `response.models` entry, each wrapped in a
// `<CardErrorBoundary>`). A successful card mounts a `StarRating`, which uses
// `useChat`, so everything is rendered inside a real `<ChatProvider>`. The
// typed API_Client is mocked so no network call can happen.

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import fc from "fast-check";

import { CardErrorBoundary } from "@/components/CardErrorBoundary";
import { ModelResultCard } from "@/components/ModelResultCard";
import { ChatProvider } from "@/hooks/useChat";
import type { ModelResult, MultiModelResponse } from "@/lib/types";

// StarRating (mounted by successful cards) posts to the API_Client only on
// click; we never click here, but mock the client so a render can never reach
// the network under any circumstance.
vi.mock("@/lib/api/client", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ...actual,
    apiClient: { postChat: vi.fn(), postRating: vi.fn() },
  };
});

afterEach(() => {
  cleanup();
});

/**
 * The per-model portion of `ResponseView` (app/page.tsx): one labeled
 * `ModelResultCard` per entry in `response.models`, each guarded by its own
 * `CardErrorBoundary`. Reproduced here so the property exercises the real
 * rendering components without depending on the page's send flow.
 */
function PerModelView({
  response,
  question,
}: {
  response: MultiModelResponse;
  question: string;
}) {
  return (
    <div>
      {Object.entries(response.models).map(([modelId, result]) => (
        <CardErrorBoundary key={modelId} label={result.model || modelId}>
          <ModelResultCard modelId={modelId} result={result} question={question} />
        </CardErrorBoundary>
      ))}
    </div>
  );
}

/** A single generated model entry: a success or a failure with free-form text. */
const entryArb = fc.record({
  isSuccess: fc.boolean(),
  // The response body (for a success) or the error text (for a failure).
  body: fc.string({ maxLength: 30 }),
  // Whether this entry carries a provider model label; when false the card
  // falls back to the Model_Identifier key as its label.
  hasProviderLabel: fc.boolean(),
  labelText: fc.string({ maxLength: 20 }),
});

// 1..6 entries gives single-entry maps as well as several-entry maps; the
// per-entry `isSuccess` flag yields all-success, all-failure, and mixed maps.
const entriesArb = fc.array(entryArb, { minLength: 1, maxLength: 6 });

type Expected = {
  /** Unique substring marker for this entry's content / error text. */
  contentMarker: string;
  /** The label the card is expected to display (provider name or key fallback). */
  expectedLabel: string;
  isSuccess: boolean;
};

/**
 * Build a Multi_Model_Response from the generated entries, embedding a unique,
 * findable marker in every entry's content/error and label so each entry's
 * rendered text can be located unambiguously regardless of the random body.
 */
function buildResponse(entries: fc.infer<typeof entriesArb>): {
  response: MultiModelResponse;
  expected: Expected[];
} {
  const models: Record<string, ModelResult> = {};
  const expected: Expected[] = [];

  entries.forEach((entry, i) => {
    const key = `MODELKEY_${i}`;
    const contentMarker = `BODY_${i}_`;
    const content = `${contentMarker}${entry.body}`;
    // A non-empty provider label is truthy, so the card shows it; otherwise the
    // card falls back to `modelId` (the key) per `result.model || modelId`.
    const providerLabel = entry.hasProviderLabel
      ? `PROV_${i}_${entry.labelText}`
      : "";
    const expectedLabel = providerLabel || key;

    models[key] = entry.isSuccess
      ? { success: true, response: content, error: null, model: providerLabel }
      : { success: false, response: null, error: content, model: providerLabel };

    expected.push({ contentMarker, expectedLabel, isSuccess: entry.isSuccess });
  });

  const response: MultiModelResponse = {
    dataset_match: false,
    dataset: null,
    models,
    success: true,
  };

  return { response, expected };
}

describe("Property 10: per-model rendering preserves successes and surfaces failures", () => {
  it("renders one labeled card per model entry, with every success's content and every failure's error present", () => {
    fc.assert(
      fc.property(entriesArb, (entries) => {
        const { response, expected } = buildResponse(entries);

        try {
          const { container } = render(
            <ChatProvider>
              <PerModelView response={response} question="Une question?" />
            </ChatProvider>,
          );

          // (1) Exactly one card per model entry. Each ModelResultCard renders a
          // single status badge whose text is exactly "OK" or "Failed".
          const badges = screen.getAllByText(/^(OK|Failed)$/);
          expect(badges).toHaveLength(expected.length);

          // The success/failure split of the badges matches the entries, so a
          // failure can neither hide a success nor be hidden by one.
          const okCount = badges.filter((b) => b.textContent === "OK").length;
          const failedCount = badges.filter(
            (b) => b.textContent === "Failed",
          ).length;
          const expectedOk = expected.filter((e) => e.isSuccess).length;
          expect(okCount).toBe(expectedOk);
          expect(failedCount).toBe(expected.length - expectedOk);

          // (2)+(3) Every entry's content/error and label is present in the
          // rendered output — successes show their content, failures show their
          // error, simultaneously and independently.
          const text = container.textContent ?? "";
          for (const e of expected) {
            expect(text).toContain(e.contentMarker);
            expect(text).toContain(e.expectedLabel);
          }
        } finally {
          cleanup();
        }
      }),
      {
        numRuns: 200,
        // Cover the named combinations explicitly alongside random search.
        examples: [
          // single success
          [[{ isSuccess: true, body: "ok", hasProviderLabel: true, labelText: "m" }]],
          // single failure
          [[{ isSuccess: false, body: "boom", hasProviderLabel: false, labelText: "" }]],
          // all success (several)
          [
            [
              { isSuccess: true, body: "a", hasProviderLabel: true, labelText: "x" },
              { isSuccess: true, body: "b", hasProviderLabel: false, labelText: "" },
              { isSuccess: true, body: "c", hasProviderLabel: true, labelText: "z" },
            ],
          ],
          // all failure (several)
          [
            [
              { isSuccess: false, body: "e1", hasProviderLabel: false, labelText: "" },
              { isSuccess: false, body: "e2", hasProviderLabel: true, labelText: "y" },
            ],
          ],
          // mixed
          [
            [
              { isSuccess: true, body: "good", hasProviderLabel: true, labelText: "ll" },
              { isSuccess: false, body: "bad", hasProviderLabel: false, labelText: "" },
              { isSuccess: true, body: "good2", hasProviderLabel: false, labelText: "" },
            ],
          ],
        ],
      },
    );
  });
});
