// React Testing Library setup: registers jest-dom matchers (toBeInTheDocument, etc.)
// and clears the rendered DOM between tests.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom does not implement Element.prototype.scrollIntoView, which the chat page
// calls in an effect to scroll the newest message into view (Requirement 11.3).
// Provide a no-op stub so component tests that render the page can mount.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

afterEach(() => {
  cleanup();
});
