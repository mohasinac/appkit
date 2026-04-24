"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "../ui/components/Button";
import { Heading, Text } from "../ui/components/Typography";
import { THEME_CONSTANTS } from "../tokens";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  renderFallback?: (error: Error | null, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
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
    <div className={`flex min-h-[40vh] flex-col items-center justify-center ${THEME_CONSTANTS.spacing.gap.md} rounded-xl border border-zinc-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900`} data-section="errorboundary-div-445">
      <Heading level={2}>Something went wrong</Heading>
      <Text variant="secondary">
        An unexpected error occurred. Please try again.
      </Text>
      {process.env.NODE_ENV === "development" && error ? (
        <pre className="max-w-full overflow-auto rounded-md bg-zinc-100 p-3 text-left text-xs dark:bg-slate-800">
          {error.message}
        </pre>
      ) : null}
      <Button type="button" onClick={onReset}>
        Try again
      </Button>
    </div>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  private reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.renderFallback) {
      return this.props.renderFallback(this.state.error, this.reset);
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return <DefaultFallback error={this.state.error} onReset={this.reset} />;
  }
}
