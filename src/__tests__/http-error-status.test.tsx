// Property test for Property 11 — HTTP error messages include the returned status.
//
// Feature: chatbot-refactor, Property 11: HTTP error messages include the
// returned status.
// Validates: Requirements 7.2.
//
// Requirement 7.2: IF the Backend_API returns a non-success HTTP status, THEN
// THE Frontend_App SHALL display an error message that includes the returned
// status.
//
// Strategy: the typed API_Client is mocked so `postChat` rejects with a real
// `ApiError(status, …)` for any generated non-2xx HTTP status code. The full
// chat page (rendered inside its own `ChatProvider`) submits a question; the
// captured `ApiError` flows through `useChat` into `page.tsx`'s `TurnError`,
// which renders the status-bearing message. The property asserts the rendered
// error text for that question INCLUDES `String(status)` for every non-2xx
// status.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import fc from "fast-check";
import type { ReactNode } from "react";

// jsdom does not implement Element.scrollIntoView, which the chat page calls in
// an effect when history updates (R11.3). Stub it so rendering the full page
// works under the test runner — this is a harness limitation, not behavior.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Mock the single API_Client the state container delegates to, while keeping
// the real `ApiError` class so the rejection carries a genuine HTTP status.
vi.mock("@/lib/api/client", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ...actual,
    apiClient: { postChat: vi.fn(), postRating: vi.fn() },
  };
});

// The assistant home page is wrapped in the protected auth Route_Guard. This
// property exercises the chat error rendering, not the auth gate, so render the
// guarded content directly.
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

import { apiClient, ApiError } from "@/lib/api/client";
import HomePage from "@/app/page";

const postChat = vi.mocked(apiClient.postChat);

// Non-2xx HTTP status codes: the canonical 4xx/5xx error space plus other
// non-success classes (1xx informational, 3xx redirection). 2xx is excluded
// because those are success responses and would not produce an error.
const nonSuccessStatus = fc.oneof(
  fc.integer({ min: 400, max: 599 }), // client + server errors
  fc.integer({ min: 300, max: 399 }), // redirection
  fc.integer({ min: 100, max: 199 }), // informational
);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Property 11: HTTP error messages include the returned status (R7.2)", () => {
  it("renders an error message containing the returned status for any non-2xx response", async () => {
    await fc.assert(
      fc.asyncProperty(
        nonSuccessStatus,
        fc.string({ minLength: 1 }).filter((q) => q.trim().length > 0),
        async (status, question) => {
          // postChat rejects with a real ApiError carrying the generated status.
          postChat.mockReset();
          postChat.mockRejectedValueOnce(
            new ApiError(status, `Backend returned ${status}`),
          );

          render(<HomePage />);

          // Submit the question through the real input + Send button.
          const input = screen.getByPlaceholderText("Ask something...");
          fireEvent.change(input, { target: { value: question } });
          fireEvent.click(screen.getByRole("button", { name: "Send" }));

          // The status-bearing error message is rendered for that question.
          const alert = await waitFor(() => screen.getByRole("alert"));
          expect(alert.textContent ?? "").toContain(String(status));

          cleanup();
          postChat.mockReset();
        },
      ),
      { numRuns: 100 },
    );
  });
});
