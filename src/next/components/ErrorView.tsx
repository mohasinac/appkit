"use client"
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

import { Heading, Text } from "../../ui/components/Typography";
import { Button } from "../../ui/components/Button";
import { Stack } from "@mohasinac/appkit/client";
import {
  trackError,
  ErrorCategory,
  ErrorSeverity,
} from "../../monitoring/error-tracking";

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
      metadata: { digest: error.digest ?? null },
    });
  }, [error]);

  return (
    <Stack justify="center" 
      role="alert"
      className="min-h-[50vh] text-center" padding="x-xl" align="center"
    >
      <Heading level={2} className="mb-2">{heading}</Heading>
      <Text variant="secondary" className="mb-6">{description}</Text>
      {/* Shown in production too, deliberately. A digest is an opaque hash, not
          sensitive data, and it is the ONLY identifier that ties what the user
          sees to the server-side row recorded by `onRequestError`. Hiding it in
          prod meant a user reporting "something went wrong" could hand over
          nothing actionable. */}
      {error.digest && (
        <Text variant="muted" size="xs" className="mb-4">
          Reference: {error.digest}
        </Text>
      )}
      <Button type="button" variant="primary" onClick={reset}>
        {retryLabel}
      </Button>
    </Stack>
  );
}
