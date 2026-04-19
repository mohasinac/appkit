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
import { Div } from "../../ui/components/Div";
import { Heading, Text } from "../../ui/components/Typography";
import { Button } from "../../ui/components/Button";
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
    <Div
      role="alert"
      className="flex flex-col items-center justify-center min-h-[50vh] px-8 text-center"
    >
      <Heading level={2} className="mb-2">{heading}</Heading>
      <Text variant="secondary" className="mb-6">{description}</Text>
      {process.env.NODE_ENV === "development" && error.digest && (
        <Text variant="muted" size="xs" className="mb-4">
          digest: {error.digest}
        </Text>
      )}
      <Button type="button" variant="primary" onClick={reset}>
        {retryLabel}
      </Button>
    </Div>
  );
}
