"use client"
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
/*
 * 🛑 FROM THE DEFINING MODULES, NOT `../../ui`.
 *
 * This file is re-exported by `next/index.ts`, which is appkit's SERVER
 * integration surface (middleware, route handlers, metadata). Importing the UI
 * barrel from here is what put a stylesheet in the server graph: `ui/index.ts`
 * opens with
 *     import "./components/index.style.css";
 *     import "./forms/FormShell.style.css";
 * and Node cannot load CSS at any path. That single edge — three hops,
 * next/index -> GlobalError -> ui/index — is what made
 * `serverExternalPackages: ["@mohasinac/appkit"]` fail with
 * ERR_UNKNOWN_FILE_EXTENSION.
 *
 * The CSS lives on the BARREL, not on the components, so importing Button /
 * Typography / Semantic directly keeps the component behaviour identical and
 * drops the stylesheet edge. It also pulls ~258 modules of UI graph out of the
 * `/next` entry. Root Cause #18 — import from the file that defines the symbol.
 */
import { Button } from "../../ui/components/Button";
import { Heading, Text } from "../../ui/components/Typography";
import { Pre } from "../../ui/components/Semantic";
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
      metadata: { digest: error.digest ?? null },
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
        <Heading level={1} style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
          Something went wrong
        </Heading>
        <Text style={{ opacity: 0.7, marginBottom: "1.5rem" }}>
          A critical error occurred. We&apos;re working on it.
        </Text>
        {process.env.NODE_ENV === "development" && (
          <Pre
            style={{
              fontSize: "0.75rem",
              padding: "1rem",
              background: "var(--appkit-color-zinc-100)",
              borderRadius: "0.5rem",
              textAlign: "left",
              maxWidth: "40rem",
              overflow: "auto",
              marginBottom: "1.5rem",
            }}
          >
            {error.message}
            {error.digest ? `\n(digest: ${error.digest})` : ""}
          </Pre>
        )}
        <Button onClick={reset} type="button">
          Try again
        </Button>
      </body>
    </html>
  );
}
