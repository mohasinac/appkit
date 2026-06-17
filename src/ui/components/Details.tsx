"use client";

import type { CSSProperties, ReactNode } from "react";

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
  /**
   * Escape hatch for state-related classNames like `group` that drive
   * sibling `group-open:` animations. Variant slots (tone/padding) own
   * the visual styling; this is for behaviour-coupled utility classes.
   */
  className?: string;
  style?: CSSProperties;
}

export interface SummaryProps {
  children: ReactNode;
  className?: string;
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
  className,
  style,
}: DetailsProps) {
  return (
    <details
      open={open ?? defaultOpen}
      onToggle={(event) => {
        if (onToggle) onToggle((event.currentTarget as HTMLDetailsElement).open);
      }}
      name={name}
      // audit-variant-ok: Details is the catalogued primitive for <details>.
      className={`${TONE_CLS[tone]} ${PADDING_CLS[padding]}${className ? ` ${className}` : ""}`.trim()}
      // audit-inline-style-ok: style is a pass-through prop for the catalogued <details> primitive
      style={style}
    >
      {children}
    </details>
  );
}

export function Summary({ children, className }: SummaryProps) {
  return (
    <summary
      // audit-variant-ok: Summary is the catalogued primitive for <summary>.
      className={`cursor-pointer select-none font-medium text-[var(--appkit-color-text)] list-none [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--appkit-color-focus-ring)] rounded${className ? ` ${className}` : ""}`}
    >
      {children}
    </summary>
  );
}
