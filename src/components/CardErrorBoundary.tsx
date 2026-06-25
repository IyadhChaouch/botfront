"use client";

// Task 13.1: per-card React error boundary (Requirement 7.3).
//
// A single result card throwing during render must NOT crash the rest of the
// interface. Each card (ModelResultCard / DatasetCard) is wrapped in its own
// `<CardErrorBoundary>` so a render error is contained to that one card while
// every sibling card and the surrounding chat UI keep rendering.
//
// React error boundaries must be class components: they rely on the
// `getDerivedStateFromError` / `componentDidCatch` lifecycle hooks, which have
// no function-component equivalent.

import { Component, type ErrorInfo, type ReactNode } from "react";

export type CardErrorBoundaryProps = {
  /** The card subtree to guard. */
  children: ReactNode;
  /** Optional label used in the fallback message to identify the failed card. */
  label?: string;
};

type CardErrorBoundaryState = {
  /** True once a descendant has thrown during render. */
  hasError: boolean;
  /** The captured error, for the fallback message. */
  error: Error | null;
};

/**
 * Error boundary that contains a render error to a single result card
 * (Requirement 7.3). When a child throws, this boundary swaps just its own
 * subtree for a compact fallback and leaves sibling boundaries untouched.
 */
export class CardErrorBoundary extends Component<
  CardErrorBoundaryProps,
  CardErrorBoundaryState
> {
  constructor(props: CardErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /** Derive the error state so the next render shows the fallback. */
  static getDerivedStateFromError(error: Error): CardErrorBoundaryState {
    return { hasError: true, error };
  }

  /** Side-effect hook for logging the contained error. */
  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep the failure observable in development without crashing the app.
    console.error("Result card render error contained by boundary:", error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const label = this.props.label;
      return (
        <div
          role="alert"
          className="rounded-2xl border border-error bg-surface p-4 shadow-sm ring-1 ring-error/10"
        >
          <div className="text-sm font-semibold text-error">
            {label ? `${label}: ` : ""}This result could not be displayed.
          </div>
          {this.state.error?.message ? (
            <p className="mt-1 whitespace-pre-wrap text-xs text-text-muted">
              {this.state.error.message}
            </p>
          ) : null}
        </div>
      );
    }

    return this.props.children;
  }
}

export default CardErrorBoundary;
