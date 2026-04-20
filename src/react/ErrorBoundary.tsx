/**
 * Generic React Error Boundary
 *
 * Catches errors anywhere in the wrapped component tree and renders a
 * configurable fallback UI. Pass `fallback` for a fully custom view, or
 * `renderFallback` for a render-prop version that receives the caught error
 * and a reset handler.
 */

import { Component, type ReactNode, type ErrorInfo } from "react";
import { Logger } from "../core/Logger";
import {
  trackError,
  ErrorCategory,
  ErrorSeverity,
} from "../monitoring/error-tracking";

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Static fallback node — shown instead of the default error UI. */
  fallback?: ReactNode;
  /** Render-prop fallback — receives the error and a reset callback. */
  renderFallback?: (error: Error | null, reset: () => void) => ReactNode;
  /** Optional callback invoked after componentDidCatch. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function DefaultFallback({
  error,
  onReset,
}: {
  error: Error | null;
  onReset: () => void;
}) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
        Something went wrong
      </h1>
      <p style={{ marginBottom: "1.5rem", opacity: 0.7 }}>
        An unexpected error occurred. Please try again.
      </p>
      {process.env.NODE_ENV === "development" && error && (
        <pre
          style={{
            fontSize: "0.75rem",
            padding: "1rem",
            background: "#f3f4f6",
            borderRadius: "0.5rem",
            textAlign: "left",
            maxWidth: "40rem",
            overflow: "auto",
            marginBottom: "1.5rem",
          }}
        >
          {error.message}
        </pre>
      )}
      <button onClick={onReset} type="button">
        Try again
      </button>
    </div>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  private readonly log = Logger.getInstance({ enableConsole: true });

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.log.error("ErrorBoundary caught an error", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    trackError(error, ErrorCategory.UI, ErrorSeverity.HIGH);

    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.renderFallback) {
      return this.props.renderFallback(this.state.error, this.handleReset);
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <DefaultFallback error={this.state.error} onReset={this.handleReset} />
    );
  }
}
