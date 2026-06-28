// Task 13.6 — example-based unit/interaction tests for the frontend.
//
// These exercise the chat page and its result/rating cards end to end, mocking
// only the typed API_Client (`@/lib/api/client`). They complement — and do not
// duplicate — the hook tests (`useChat.test.tsx`) and the standalone control
// tests (`StarRating.test.tsx`): rating behavior here is driven through a fully
// rendered result card rather than the control in isolation.
//
// Coverage:
//   - Submitting a question calls apiClient.postChat → POST /api/chat (R6.1)
//   - Network error shows a retryable message; Retry re-invokes postChat (R7.1)
//   - CardErrorBoundary contains a throwing card without crashing siblings (R7.3)
//   - A pending indicator shows while a question is in flight (R7.4)
//   - Rating posts the right fields; success updates, failure retains (R8.1/8.3/8.4)
//   - Empty-history guidance is shown before any message (R11.2)
//   - The newest message is scrolled into view on history update (R11.3)

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

// Mock the single API_Client the whole Frontend_App delegates to.
vi.mock("@/lib/api/client", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ...actual,
    apiClient: { postChat: vi.fn(), postRating: vi.fn() },
  };
});

// The assistant home page is wrapped in the protected auth Route_Guard. These
// tests exercise the chat behavior, not the auth gate, so render the guarded
// content directly.
vi.mock("@/components/auth/RouteGuard", () => ({
  RouteGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// The shared AppHeader (rendered by the chat page) reads the Auth_Context for
// its logout control. Stub it so these chat tests stay isolated from auth.
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

import HomePage from "@/app/page";
import { CardErrorBoundary } from "@/components/CardErrorBoundary";
import { apiClient, ApiError } from "@/lib/api/client";
import type { MultiModelResponse } from "@/lib/types";

const postChat = vi.mocked(apiClient.postChat);
const postRating = vi.mocked(apiClient.postRating);

/** A Multi_Model_Response with a single successful model entry. */
function successResponse(
  response = "Nous proposons l'assurance auto CHAMEL.",
): MultiModelResponse {
  return {
    dataset_match: false,
    dataset: null,
    models: {
      llama3: { success: true, response, error: null, model: "llama-3.3-70b-versatile" },
    },
    success: true,
  };
}

/** Type a question into the input and click Send. */
async function ask(user: ReturnType<typeof userEvent.setup>, question: string) {
  await user.type(screen.getByPlaceholderText("Ask something..."), question);
  await user.click(screen.getByRole("button", { name: "Send" }));
}

beforeEach(() => {
  // jsdom does not implement scrollIntoView; provide a spy so the page's
  // scroll-on-update effect can run and be asserted (R11.3).
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("chat submission (R6.1)", () => {
  it("sends the submitted question to /api/chat via apiClient.postChat", async () => {
    const user = userEvent.setup();
    postChat.mockResolvedValueOnce(successResponse());
    render(<HomePage />);

    await ask(user, "Quels produits proposez-vous?");

    expect(postChat).toHaveBeenCalledTimes(1);
    expect(postChat).toHaveBeenCalledWith("Quels produits proposez-vous?");
  });
});

describe("network error resilience (R7.1)", () => {
  it("shows a retryable message and re-invokes postChat when Retry is clicked", async () => {
    const user = userEvent.setup();
    // First attempt: network failure (plain Error → status null). Retry succeeds.
    postChat
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockResolvedValueOnce(successResponse());
    render(<HomePage />);

    await ask(user, "Bonjour");

    // A retryable network error message is shown for the submitted question.
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/network error/i);
    expect(alert).toHaveTextContent(/please try again/i);

    // Clicking Retry re-sends the same question through postChat.
    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(postChat).toHaveBeenCalledTimes(2));
    expect(postChat).toHaveBeenLastCalledWith("Bonjour");
  });
});

describe("per-card error containment (R7.3)", () => {
  it("renders the boundary fallback for a throwing card without crashing siblings", () => {
    // Silence the expected React error-boundary console noise.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    function Boom(): never {
      throw new Error("card blew up");
    }

    render(
      <div>
        <CardErrorBoundary label="Model A">
          <Boom />
        </CardErrorBoundary>
        <CardErrorBoundary label="Model B">
          <div>healthy sibling</div>
        </CardErrorBoundary>
      </div>,
    );

    // The throwing card shows its contained fallback...
    expect(
      screen.getByText(/Model A: This result could not be displayed\./),
    ).toBeInTheDocument();
    // ...while the sibling card renders normally.
    expect(screen.getByText("healthy sibling")).toBeInTheDocument();

    spy.mockRestore();
  });
});

describe("pending indicator (R7.4)", () => {
  it("shows a pending indicator while the chat request is in flight", async () => {
    const user = userEvent.setup();
    // A promise that stays pending for the duration of the assertion.
    postChat.mockImplementationOnce(() => new Promise<MultiModelResponse>(() => {}));
    render(<HomePage />);

    await ask(user, "En attente...");

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(/thinking/i);
  });
});

describe("rating through a rendered card (R8.1, R8.3, R8.4)", () => {
  it("posts the rating fields and marks the selected star current on success", async () => {
    const user = userEvent.setup();
    const answer = "Nous proposons CHAMEL.";
    postChat.mockResolvedValueOnce(successResponse(answer));
    postRating.mockResolvedValueOnce(undefined);
    render(<HomePage />);

    await ask(user, "Quels produits?");
    // Wait for the successful model card (and its rating control) to render.
    await screen.findByText(answer);

    await user.click(screen.getByRole("radio", { name: "4 stars" }));

    // The fields posted are the (modelIdentifier, question, response, value) tuple.
    expect(postRating).toHaveBeenCalledWith({
      modelIdentifier: "llama3",
      question: "Quels produits?",
      response: answer,
      value: 4,
    });
    // On success the selected star becomes the current rating (R8.3).
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "4 stars" })).toBeChecked(),
    );
  });

  it("retains the prior rating and shows an error indicator when rating fails", async () => {
    const user = userEvent.setup();
    const answer = "Nous proposons CHAMEL.";
    postChat.mockResolvedValueOnce(successResponse(answer));
    // First rating succeeds (prior rating = 2); second fails.
    postRating
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ApiError(500, "Rating failed: 500"));
    render(<HomePage />);

    await ask(user, "Quels produits?");
    await screen.findByText(answer);

    await user.click(screen.getByRole("radio", { name: "2 stars" }));
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "2 stars" })).toBeChecked(),
    );

    await user.click(screen.getByRole("radio", { name: "5 stars" }));

    // The error indicator appears and the prior rating (2) is retained (R8.4).
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("radio", { name: "2 stars" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "5 stars" })).not.toBeChecked();
  });
});

describe("empty-history guidance (R11.2)", () => {
  it("shows guidance prompting the user to ask a question before any message", () => {
    render(<HomePage />);
    expect(screen.getByText(/Bienvenue chez AMI Assurances/)).toBeInTheDocument();
    expect(screen.getByText(/Posez-moi une question/)).toBeInTheDocument();
  });
});

describe("scroll-into-view on history update (R11.3)", () => {
  it("scrolls the most recent message into view when a new message is added", async () => {
    const user = userEvent.setup();
    postChat.mockResolvedValueOnce(successResponse());
    render(<HomePage />);

    // Ignore the initial mount effect; assert the scroll triggered by the new turn.
    vi.mocked(Element.prototype.scrollIntoView).mockClear();

    await ask(user, "Bonjour");

    await waitFor(() =>
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled(),
    );
  });
});
