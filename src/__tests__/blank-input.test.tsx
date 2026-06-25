// Property-based test for Property 12: Blank input cannot be submitted.
//
// Feature: chatbot-refactor, Property 12: Blank input cannot be submitted
// Validates: Requirements 11.4, 11.5
//
// Requirement 11.4 — WHEN the input field is empty, THE Frontend_App SHALL
// prevent submission of a chat request.
// Requirement 11.5 — WHEN the input field contains only whitespace characters,
// THE Frontend_App SHALL prevent submission of a chat request.
//
// The ChatPage guards submission with `canSend = input.trim().length > 0`,
// which disables the Send button and gates the Enter key, while `handleSend`
// re-trims and returns early. This property asserts that for ANY empty or
// whitespace-only input, neither clicking Send nor pressing Enter triggers a
// chat send (the typed API_Client `postChat` is never called and no new turn
// is added), whereas any input with non-whitespace content DOES submit.
//
// The API_Client is mocked so the test exercises only the deterministic
// client-side submission-guard logic without real network access.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import fc from "fast-check";
import type { ReactNode } from "react";

import type { MultiModelResponse } from "@/lib/types";

// Mock the single API_Client the page (via useChat) delegates to, so we can
// assert whether a chat request would have been issued.
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

// The assistant home page is wrapped in the protected auth Route_Guard. This
// property exercises the chat submission guard, not the auth gate, so render
// the guarded content directly.
vi.mock("@/components/auth/RouteGuard", () => ({
  RouteGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// The shared AppHeader (rendered by the chat page) reads the Auth_Context for
// its logout control. Stub it so this chat test stays isolated from auth.
vi.mock("@/lib/auth/context", () => ({
  useAuth: () => ({
    isAuthenticated: false,
    status: "ready",
    token: null,
    user: null,
    persistError: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// AppHeader's logout handler uses the App Router; provide a router stub so it
// can mount under the test runner without an App Router context.
vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }),
  };
});

// Import the page and the mocked client after vi.mock so the page picks up the
// mocked instance. The page renders <ChatPage> inside its own <ChatProvider>.
import HomePage from "@/app/page";
import { apiClient } from "@/lib/api/client";

const postChat = vi.mocked(apiClient.postChat);

const sampleResponse: MultiModelResponse = {
  dataset_match: false,
  dataset: null,
  models: {
    llama3: {
      success: true,
      response: "Bonjour",
      error: null,
      model: "llama-3.3-70b-versatile",
    },
  },
  success: true,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Single whitespace characters used to compose blank inputs.
const whitespaceChar = fc.constantFrom(" ", "\t", "\n", "\r", "\f", "\v", "\u00a0");

// Empty or whitespace-only strings (includes the empty string at minLength 0).
const blankArb = fc.stringOf(whitespaceChar, { minLength: 0, maxLength: 12 });

// Strings guaranteed to contain at least one non-whitespace character, wrapped
// in arbitrary whitespace padding so `trim()` still leaves real content.
const padding = fc.stringOf(whitespaceChar, { minLength: 0, maxLength: 6 });
const nonBlankCore = fc.constantFrom(
  "a",
  "bonjour",
  "auto insurance",
  "مرحبا",
  "Devis?",
  "5",
  "x",
);
const nonBlankArb = fc
  .tuple(padding, nonBlankCore, padding)
  .map(([before, core, after]) => `${before}${core}${after}`);

function getControls() {
  const input = screen.getByPlaceholderText("Ask something...") as HTMLInputElement;
  const sendButton = screen.getByRole("button", { name: "Send" }) as HTMLButtonElement;
  return { input, sendButton };
}

describe("Property 12: Blank input cannot be submitted", () => {
  it("never submits empty or whitespace-only input via the Send button or Enter", () => {
    fc.assert(
      fc.property(blankArb, (blank) => {
        postChat.mockResolvedValue(sampleResponse);
        render(<HomePage />);
        const { input, sendButton } = getControls();

        fireEvent.change(input, { target: { value: blank } });

        // The Send button must be disabled for blank input (R11.4, R11.5)...
        expect(sendButton.disabled).toBe(true);

        // ...and neither clicking it nor pressing Enter triggers a chat send.
        fireEvent.click(sendButton);
        fireEvent.keyDown(input, { key: "Enter" });

        expect(postChat).not.toHaveBeenCalled();
        // No turn was added to the history (the empty-history guidance remains).
        expect(screen.queryByText(/You asked:/)).toBeNull();

        cleanup();
        postChat.mockClear();
      }),
      { numRuns: 150 },
    );
  });

  it("submits input that contains non-whitespace content", () => {
    fc.assert(
      fc.property(nonBlankArb, (text) => {
        postChat.mockResolvedValue(sampleResponse);
        render(<HomePage />);
        const { input, sendButton } = getControls();

        fireEvent.change(input, { target: { value: text } });

        // Non-blank input enables the Send button...
        expect(sendButton.disabled).toBe(false);

        // ...and pressing Enter issues exactly one chat request with the
        // trimmed question.
        fireEvent.keyDown(input, { key: "Enter" });

        expect(postChat).toHaveBeenCalledTimes(1);
        expect(postChat).toHaveBeenCalledWith(text.trim());

        cleanup();
        postChat.mockClear();
      }),
      { numRuns: 150 },
    );
  });
});
