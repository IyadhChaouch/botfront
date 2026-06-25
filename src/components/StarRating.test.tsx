// Task 13.3 — unit tests for the StarRating submission UX.
//
// These render the control inside a real ChatProvider and mock only the typed
// API_Client, so the full rating flow (post fields → success fills star /
// failure shows error + retains prior rating) is exercised end to end.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { StarRating } from "./StarRating";
import { ChatProvider } from "@/hooks/useChat";
import { ApiError } from "@/lib/api/client";

vi.mock("@/lib/api/client", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ...actual,
    apiClient: { postChat: vi.fn(), postRating: vi.fn() },
  };
});

import { apiClient } from "@/lib/api/client";

const postRating = vi.mocked(apiClient.postRating);

const wrapper = ({ children }: { children: ReactNode }) => (
  <ChatProvider>{children}</ChatProvider>
);

const props = {
  modelIdentifier: "llama3",
  question: "Quels produits proposez-vous?",
  response: "Nous proposons CHAMEL.",
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("StarRating", () => {
  it("posts the rating fields (modelIdentifier, question, response, value) on click (R8.1)", async () => {
    const user = userEvent.setup();
    postRating.mockResolvedValueOnce(undefined);
    render(<StarRating {...props} />, { wrapper });

    await user.click(screen.getByRole("radio", { name: "4 stars" }));

    expect(postRating).toHaveBeenCalledWith({ ...props, value: 4 });
  });

  it("marks the selected star as the current rating on success (R8.3)", async () => {
    const user = userEvent.setup();
    postRating.mockResolvedValueOnce(undefined);
    render(<StarRating {...props} />, { wrapper });

    await user.click(screen.getByRole("radio", { name: "3 stars" }));

    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "3 stars" })).toBeChecked(),
    );
    // No error indicator on success.
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows an error indicator and retains the prior rating on failure (R8.4)", async () => {
    const user = userEvent.setup();
    // First rating succeeds (establishes a prior rating of 2), second fails.
    postRating
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ApiError(500, "Rating failed: 500"));
    render(<StarRating {...props} />, { wrapper });

    await user.click(screen.getByRole("radio", { name: "2 stars" }));
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "2 stars" })).toBeChecked(),
    );

    await user.click(screen.getByRole("radio", { name: "5 stars" }));

    // Error indicator shows, and the prior rating (2) is retained, not 5.
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("radio", { name: "2 stars" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "5 stars" })).not.toBeChecked();
  });
});
