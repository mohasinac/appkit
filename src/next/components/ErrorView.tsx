"use client";

/**
 * ErrorView — Next.js per-route error.tsx template.
 *
 * Renders when an unexpected error is thrown inside a route segment.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 *
 * Usage in your app:
 *   // app/[locale]/error.tsx
 *   export { ErrorView as default } from "@mohasinac/appkit/next";
 *
 *   // Or with customisation:
 *   import { ErrorView } from "@mohasinac/appkit/next";
 *   export default function Error(props) {
 *     return <ErrorView {...props} heading="Oops!" />;
 *   }
 */

import { useEffect } from "react";
import { trackError, ErrorCategory, ErrorSeverity } from "../../monitoring";

export interface ErrorViewProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Override the heading text. */
  heading?: string;
  /** Override the body text. */
  description?: string;
  /** Override the retry button label. */
  retryLabel?: string;
}

export function ErrorView({
  error,
  reset,
  heading = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  retryLabel = "Try again",
}: ErrorViewProps) {
  useEffect(() => {
    trackError(error, ErrorCategory.UNKNOWN, ErrorSeverity.HIGH, {
      component: "ErrorView",
      metadata: { digest: error.digest },
    });
  }, [error]);

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "50vh",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{heading}</h2>
      <p style={{ opacity: 0.7, marginBottom: "1.5rem" }}>{description}</p>
      {process.env.NODE_ENV === "development" && error.digest && (
        <p style={{ fontSize: "0.75rem", opacity: 0.5, marginBottom: "1rem" }}>
          digest: {error.digest}
        </p>
      )}
      <button onClick={reset} type="button">
        {retryLabel}
      </button>
    </div>
  );
}
