// Unit tests for the ChatProvider/useChat state container (Requirement 26.7, 26.8).
//
// The API_Client is mocked so these tests exercise the state container's own
// logic — history transitions, pending derivation, and rating persistence —
// without real network access.

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { ChatProvider, ratingKey, useChat } from "./useChat";
import { ApiError } from "@/lib/api/client";
import type { MultiModelResponse, RatingSubmission } from "@/lib/types";

// Mock the single API_Client the container delegates to.
vi.mock("@/lib/api/client", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ...actual,
    apiClient: {
      postChat: vi.fn(),
      postRating: vi.fn(),
    },
  };
});

// Import the mocked client after vi.mock so we get the mocked instance.
import { apiClient } from "@/lib/api/client";

const postChat = vi.mocked(apiClient.postChat);
const postRating = vi.mocked(apiClient.postRating);

const wrapper = ({ children }: { children: ReactNode }) => (
  <ChatProvider>{children}</ChatProvider>
);

const sampleResponse: MultiModelResponse = {
  dataset_match: false,
  dataset: null,
  models: {
    llama3: { success: true, response: "Bonjour", error: null, model: "llama-3.3-70b-versatile" },
  },
  success: true,
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("useChat", () => {
  it("throws when used outside of a ChatProvider", () => {
    // Suppress the expected React error log for a cleaner test output.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useChat())).toThrow(
      /useChat must be used within a ChatProvider/,
    );
    spy.mockRestore();
  });

  it("starts with empty history, no ratings, and not pending", () => {
    const { result } = renderHook(() => useChat(), { wrapper });
    expect(result.current.state.history).toEqual([]);
    expect(result.current.state.ratings).toEqual({});
    expect(result.current.state.pending).toBe(false);
  });

  it("records a successful turn and clears pending", async () => {
    postChat.mockResolvedValueOnce(sampleResponse);
    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("Quels produits proposez-vous?");
    });

    const { history, pending } = result.current.state;
    expect(history).toHaveLength(1);
    expect(history[0].question).toBe("Quels produits proposez-vous?");
    expect(history[0].status).toBe("success");
    expect(history[0].response).toEqual(sampleResponse);
    expect(history[0].error).toBeNull();
    expect(pending).toBe(false);
    expect(postChat).toHaveBeenCalledWith("Quels produits proposez-vous?");
  });

  it("marks pending while a request is in flight", async () => {
    let resolveChat: (value: MultiModelResponse) => void = () => {};
    postChat.mockImplementationOnce(
      () =>
        new Promise<MultiModelResponse>((resolve) => {
          resolveChat = resolve;
        }),
    );
    const { result } = renderHook(() => useChat(), { wrapper });

    let sendPromise!: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage("hello");
    });

    // The turn is recorded as pending before the response resolves.
    await waitFor(() => expect(result.current.state.pending).toBe(true));
    expect(result.current.state.history[0].status).toBe("pending");

    await act(async () => {
      resolveChat(sampleResponse);
      await sendPromise;
    });

    expect(result.current.state.pending).toBe(false);
  });

  it("captures a structured ChatError carrying the HTTP status on failure", async () => {
    postChat.mockRejectedValueOnce(new ApiError(503, "Backend returned 503"));
    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("hello");
    });

    const turn = result.current.state.history[0];
    expect(turn.status).toBe("error");
    // `turn.error` is a structured `ChatError` object `{ message, status }`,
    // not a string. An `ApiError` maps to a numeric `status` (R7.2) so the UI
    // can surface the returned status code.
    expect(turn.error).toEqual({ message: "Backend returned 503", status: 503 });
    expect(turn.error?.status).toBe(503);
    expect(turn.error?.message).toContain("503");
    expect(turn.response).toBeNull();
    expect(result.current.state.pending).toBe(false);
  });

  it("forwards input to the API_Client without a client-side blank-input guard", async () => {
    // Blank / whitespace-only prevention is the PAGE component's responsibility
    // (page.tsx `canSend` / `handleSend` trim guard, covered by task 13.5) — the
    // hook intentionally does not guard and simply delegates whatever it is given
    // to `apiClient.postChat`. This asserts that real behavior.
    postChat.mockResolvedValueOnce(sampleResponse);
    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("   ");
    });

    expect(postChat).toHaveBeenCalledWith("   ");
    expect(result.current.state.history).toHaveLength(1);
    expect(result.current.state.history[0].question).toBe("   ");
  });

  it("persists a rating on success keyed by the rated response", async () => {
    postRating.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useChat(), { wrapper });

    const submission: RatingSubmission = {
      modelIdentifier: "llama3",
      question: "hello",
      response: "Bonjour",
      value: 4,
    };

    await act(async () => {
      await result.current.rate(submission);
    });

    expect(postRating).toHaveBeenCalledWith(submission);
    expect(result.current.state.ratings[ratingKey(submission)]).toBe(4);
  });

  it("captures a failed rating without rethrowing and retains the prior rating", async () => {
    postRating
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ApiError(500, "Rating failed: 500"));
    const { result } = renderHook(() => useChat(), { wrapper });

    const submission: RatingSubmission = {
      modelIdentifier: "llama3",
      question: "hello",
      response: "Bonjour",
      value: 3,
    };
    const key = ratingKey(submission);

    await act(async () => {
      await result.current.rate(submission);
    });
    expect(result.current.state.ratings[key]).toBe(3);
    expect(result.current.state.ratingErrors[key]).toBeUndefined();

    // A subsequent failing submission resolves (does NOT throw): the failure is
    // captured into `state.ratingErrors`, and the prior rating is retained (R8.4).
    await act(async () => {
      await expect(
        result.current.rate({ ...submission, value: 5 }),
      ).resolves.toBeUndefined();
    });

    // Prior rating is unchanged.
    expect(result.current.state.ratings[key]).toBe(3);
    // The failed submission is surfaced as a structured error indicator.
    expect(result.current.state.ratingErrors[key]).toEqual({
      message: "Rating failed: 500",
      status: 500,
    });
  });
});
