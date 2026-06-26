"use client";

import type { CSSProperties, ReactNode } from "react";
import { ROUNDED_MAP, type RoundedKey } from "./surface-tokens";

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
  /** Border radius — replaces consumer `rounded-*` className. Overrides any radius baked into `tone`. */
  rounded?: RoundedKey;
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

export type SummarySize = "xs" | "sm" | "base" | "lg";
export type SummaryWeight = "light" | "normal" | "medium" | "semibold" | "bold";
export type SummaryPaddingX = "none" | "x-xs" | "x-sm" | "x-md" | "x-5" | "x-lg";
export type SummaryPaddingY = "none" | "y-xs" | "y-sm" | "y-md" | "y-lg";
export type SummaryColor = "default" | "muted" | "faint";

const SUMMARY_SIZE_MAP: Record<SummarySize, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};

const SUMMARY_WEIGHT_MAP: Record<SummaryWeight, string> = {
  light: "font-light",
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const SUMMARY_PADDING_X_MAP: Record<SummaryPaddingX, string> = {
  none: "",
  "x-xs": "px-2",
  "x-sm": "px-3",
  "x-md": "px-4",
  "x-5": "px-5",
  "x-lg": "px-6",
};

const SUMMARY_PADDING_Y_MAP: Record<SummaryPaddingY, string> = {
  none: "",
  "y-xs": "py-2",
  "y-sm": "py-3",
  "y-md": "py-4",
  "y-lg": "py-6",
};

const SUMMARY_COLOR_MAP: Record<SummaryColor, string> = {
  default: "",
  muted: "text-[var(--appkit-color-text-muted)]",
  faint: "text-[var(--appkit-color-text-faint)]",
};

type SummaryLayout = "flex" | "inline-flex";
const SUMMARY_LAYOUT_MAP: Record<SummaryLayout, string> = {
  flex: "flex",
  "inline-flex": "inline-flex",
};

type SummaryAlign = "center" | "start" | "end" | "stretch" | "baseline";
const SUMMARY_ALIGN_MAP: Record<SummaryAlign, string> = {
  center: "items-center",
  start: "items-start",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

type SummaryJustify = "start" | "center" | "end" | "between" | "around" | "evenly";
const SUMMARY_JUSTIFY_MAP: Record<SummaryJustify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

export interface SummaryProps {
  children: ReactNode;
  className?: string;
  /** Typography size override. */
  size?: SummarySize;
  /** Font weight override. */
  weight?: SummaryWeight;
  /** Horizontal padding override. */
  paddingX?: SummaryPaddingX;
  /** Vertical padding override. */
  paddingY?: SummaryPaddingY;
  /** Colour override. */
  color?: SummaryColor;
  /**
   * Display layout for the summary row.
   * Use `"flex"` to turn the summary into a flex container (e.g. icon + label + chevron).
   */
  layout?: SummaryLayout;
  /** Cross-axis alignment — takes effect when `layout` is set. */
  align?: SummaryAlign;
  /** Main-axis distribution — takes effect when `layout` is set. */
  justify?: SummaryJustify;
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
  rounded,
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
      className={[
        TONE_CLS[tone],
        PADDING_CLS[padding],
        rounded ? ROUNDED_MAP[rounded] : "",
        className ?? "",
      ].filter(Boolean).join(" ") || undefined}
      style={style}
    >
      {children}
    </details>
  );
}

export function Summary({ children, className, size, weight, paddingX, paddingY, color, layout, align, justify }: SummaryProps) {
  return (
    <summary
      className={[
        "cursor-pointer select-none font-medium text-[var(--appkit-color-text)] list-none [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--appkit-color-focus-ring)] rounded",
        size ? SUMMARY_SIZE_MAP[size] : "",
        weight ? SUMMARY_WEIGHT_MAP[weight] : "",
        paddingX ? SUMMARY_PADDING_X_MAP[paddingX] : "",
        paddingY ? SUMMARY_PADDING_Y_MAP[paddingY] : "",
        color ? SUMMARY_COLOR_MAP[color] : "",
        layout ? SUMMARY_LAYOUT_MAP[layout] : "",
        align ? SUMMARY_ALIGN_MAP[align] : "",
        justify ? SUMMARY_JUSTIFY_MAP[justify] : "",
        className ?? "",
      ].filter(Boolean).join(" ")}
    >
      {children}
    </summary>
  );
}
