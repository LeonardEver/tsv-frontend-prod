/**
 * Top-level error boundary (frontend spec §24 — error boundary per
 * route-level). Catches render crashes; never leaks internals.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Foundation: console only. Phase 11 wires the error-monitoring
    // adapter (Sentry per spec §34) with PII scrubbing.
    console.error("[error-boundary]", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
          <h1 className="text-xl">Something went wrong</h1>
          <p className="text-text-secondary">The app hit an unexpected error.</p>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null });
            }}
            className="rounded-md bg-accent-ember px-4 py-2 font-semibold text-accent-on"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
