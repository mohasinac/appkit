"use client";

/**
 * GlobalError — Next.js global-error.tsx template.
 *
 * Catches errors in the root layout (above all per-route error.tsx).
 * Must be a Client Component and must render <html> + <body>.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errorjs
 *
 * Usage in your app:
 *   // app/global-error.tsx
 *   export { GlobalError as default } from "@mohasinac/appkit/next";
 */

import { useEffect } from "react";
import {
  trackError,
  ErrorCategory,
  ErrorSeverity,
} from "../../monitoring/error-tracking";

export interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    trackError(error, ErrorCategory.UNKNOWN, ErrorSeverity.CRITICAL, {
      component: "GlobalError",
      metadata: { digest: error.digest },
    });
  }, [error]);

  return (
    <html>
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
          Something went wrong
        </h1>
        <p style={{ opacity: 0.7, marginBottom: "1.5rem" }}>
          A critical error occurred. We&apos;re working on it.
        </p>
        {process.env.NODE_ENV === "development" && (
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
            {error.digest ? `\n(digest: ${error.digest})` : ""}
          </pre>
        )}
        <button onClick={reset} type="button">
          Try again
        </button>
      </body>
    </html>
  );
}
