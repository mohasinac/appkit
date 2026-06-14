"use client";

import type { ReactNode } from "react";

/** Details + Summary — primitive for native `<details>` disclosure widget. */
export type DetailsTone = "default" | "muted" | "card";
export type DetailsPadding = "none" | "sm" | "md" | "lg";

export interface DetailsProps {
  children: ReactNode;
  /** Initial open state. */
  defaultOpen?: boolean;
  /** Controlled open state (pair with `onToggle`). */
  open?: boolean;
  onToggle?: (open: boolean) => void;
  tone?: DetailsTone;
  padding?: DetailsPadding;
  /** Auto-collapse other `<Details>` with the same `name` (browser-handled). */
  name?: string;
}

export interface SummaryProps {
  children: ReactNode;
}

const TONE_CLS: Record<DetailsTone, string> = {
  default: "",
  muted: "rounded-lg bg-[var(--appkit-color-bg)]",
  card:
    "rounded-xl bg-[var(--appkit-color-surface)] border border-[var(--appkit-color-border)] shadow-sm",
};

const PADDING_CLS: Record<DetailsPadding, string> = {
  none: "",
  sm: "p-2",
  md: "p-3",
  lg: "p-4",
};

export function Details({
  children,
  defaultOpen,
  open,
  onToggle,
  tone = "default",
  padding = "md",
  name,
}: DetailsProps) {
  return (
    <details
      open={open ?? defaultOpen}
      onToggle={(event) => {
        if (onToggle) onToggle((event.currentTarget as HTMLDetailsElement).open);
      }}
      name={name}
      // audit-variant-ok: Details is the catalogued primitive for <details>.
      className={`${TONE_CLS[tone]} ${PADDING_CLS[padding]}`.trim()}
    >
      {children}
    </details>
  );
}

export function Summary({ children }: SummaryProps) {
  return (
    <summary
      // audit-variant-ok: Summary is the catalogued primitive for <summary>.
      className="cursor-pointer select-none font-medium text-[var(--appkit-color-text)] list-none [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--appkit-color-focus-ring)] rounded"
    >
      {children}
    </summary>
  );
}
