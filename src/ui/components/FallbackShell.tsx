"use client";

import type { ReactNode } from "react";

/**
 * FallbackShell — primitive used by ErrorBoundary and `app/global-error.tsx`.
 *
 * It inlines its critical CSS so it renders correctly when the Tailwind tree
 * has not loaded yet (or has failed to load). The variant catalogue blocks
 * consumer-side className on every primitive; this component owns its own
 * inline styles by design.
 */
export type FallbackShellTone = "neutral" | "danger" | "warning";

export interface FallbackShellProps {
  /** Title displayed at the top of the shell. */
  title: ReactNode;
  /** Optional description paragraph. */
  description?: ReactNode;
  /** Optional details block (e.g. error message in dev). */
  details?: ReactNode;
  /**
   * Optional action row (e.g. "Reload" / "Go home"). The shell does not style
   * children — caller supplies buttons / links.
   */
  actions?: ReactNode;
  /**
   * Visual tone:
   *  - `"neutral"` (default) — generic fallback UI.
   *  - `"danger"` — uncaught error / global-error route boundary.
   *  - `"warning"` — recoverable issue.
   */
  tone?: FallbackShellTone;
}

const TONE_BG: Record<FallbackShellTone, string> = {
  neutral: "var(--appkit-color-surface-muted)",
  danger: "var(--appkit-color-error-surface)",
  warning: "var(--appkit-color-warning-surface)",
};
const TONE_TITLE: Record<FallbackShellTone, string> = {
  neutral: "var(--appkit-color-text)",
  danger: "var(--appkit-color-error-title)",
  warning: "var(--appkit-color-warning)",
};
const TONE_TEXT: Record<FallbackShellTone, string> = {
  neutral: "var(--appkit-color-text-muted)",
  danger: "var(--appkit-color-error-text)",
  warning: "var(--appkit-color-warning)",
};

export function FallbackShell({
  title,
  description,
  details,
  actions,
  tone = "neutral",
}: FallbackShellProps) {
  return (
    <div
      role="alert"
      // audit-inline-style-ok: FallbackShell ships its own critical CSS so it renders before/without Tailwind. Source-of-truth fallback surface.
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        backgroundColor: TONE_BG[tone],
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        color: TONE_TEXT[tone],
        textAlign: "center",
      }}
    >
      <div
        // audit-inline-style-ok: FallbackShell critical-CSS container — see parent above.
        style={{ maxWidth: "32rem", width: "100%" }}
      >
        <h1
          // audit-inline-style-ok: FallbackShell critical CSS — see container above.
          style={{
            margin: 0,
            fontSize: "1.875rem",
            lineHeight: 1.15,
            fontWeight: 700,
            color: TONE_TITLE[tone],
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h1>
        {description ? (
          <p
            // audit-inline-style-ok: FallbackShell critical CSS — see container above.
            style={{
              margin: "0.75rem 0 0",
              fontSize: "1rem",
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        ) : null}
        {details ? (
          <pre
            // audit-inline-style-ok: FallbackShell critical CSS — see container above.
            style={{
              margin: "1.25rem 0 0",
              padding: "0.75rem 1rem",
              fontSize: "0.75rem",
              lineHeight: 1.4,
              fontFamily:
                "ui-monospace, SFMono-Regular, 'Cascadia Mono', Consolas, monospace",
              textAlign: "left",
              backgroundColor: "rgba(0,0,0,0.04)",
              borderRadius: "0.5rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowX: "auto",
            }}
          >
            {details}
          </pre>
        ) : null}
        {actions ? (
          <div
            // audit-inline-style-ok: FallbackShell critical CSS — see container above.
            style={{
              marginTop: "1.5rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              justifyContent: "center",
            }}
          >
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
