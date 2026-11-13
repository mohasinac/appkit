"use client";

import { useEffect, useRef } from "react";
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
   * DOM id — makes the disclosure an in-page ANCHOR TARGET.
   *
   * Added so a badge or tag can point at the disclosure that explains it
   * ("Final Sale" → the delivery & returns block). Without an id the only way
   * to reach a collapsed disclosure is to find and click it.
   */
  id?: string;
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
  /**
   * Accessible name for the disclosure control.
   *
   * A summary whose visible label is a shorthand ("… 3 more") reads as nothing
   * useful to a screen reader, and the alternative — padding the visible label
   * — costs the horizontal space the collapse exists to save. A prop rather
   * than a caller's raw attribute, because a raw `aria-label` on a primitive is
   * the className escape hatch by another name (Rule #21).
   */
  ariaLabel?: string;
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
  id,
  className,
  style,
}: DetailsProps) {
  const ref = useRef<HTMLDetailsElement>(null);

  /*
   * 🛑 BEING THE #hash TARGET OPENS IT. Without this, a link to a collapsed
   * disclosure scrolls the buyer to a closed box and makes them click again —
   * measured exactly that way on the PDP: the "Final Sale" badge reached
   * `#pdp-policies` at the right scroll offset with `open === false`.
   *
   * Owner, 2026-11-13: *"the tags auto explain themselves with proper focus
   * and scroll to read."* Landing on a closed box is neither.
   *
   * ⚠ Browsers do NOT do this for `<details>`. The auto-reveal behaviour
   * people remember is `hidden="until-found"`, which is a different mechanism
   * — so relying on it would have looked right in a spec and failed in the
   * product.
   *
   * 🛑 The SUMMARY is focused, not the panel: it is the real control, so a
   * keyboard user lands somewhere they can act (Enter re-collapses) and a
   * screen reader announces an expanded disclosure rather than loose prose.
   * `preventScroll` because the browser's fragment scroll already placed it —
   * focusing again would fight it and undo `scroll-mt`.
   *
   * Controlled instances are skipped: their `open` belongs to the caller, and
   * forcing it here would silently overrule them.
   */
  useEffect(() => {
    if (!id || open !== undefined) return;
    const reveal = () => {
      if (typeof window === "undefined" || window.location.hash !== `#${id}`) return;
      const el = ref.current;
      if (!el || el.open) return;
      el.open = true;
      el.querySelector("summary")?.focus({ preventScroll: true });
    };
    /*
     * 🛑 `hashchange` ALONE IS NOT ENOUGH, and this is the part that was wrong
     * on the first attempt.
     *
     * The badge is a `TextLink` → `next/link`, so clicking it is a CLIENT-SIDE
     * navigation that updates the URL through `history.pushState` — and
     * **pushState does not fire `hashchange`**. The listener was correct, the
     * event simply never arrived: measured in a browser as `location.hash ===
     * "#pdp-policies"`, right scroll offset, and `open === false`.
     *
     * ⚠ It would have worked with a plain `<a>`, which is exactly why reading
     * the code was not enough to catch it — the bug lives in the interaction
     * between the primitive and the router, not in either one.
     *
     * So a capture-phase click listener covers in-app links, and `hashchange`
     * still covers a pasted URL, a back/forward step and a full page load.
     * Cheap: one comparison against a string, only on anchors.
     */
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as Element | null)?.closest?.("a");
      if (anchor?.getAttribute("href") !== `#${id}`) return;
      /*
       * 🛑 OPEN DIRECTLY — do NOT re-check `location.hash` here.
       *
       * The first version deferred to `reveal()`, which reads the hash. With
       * `next/link` the router updates the URL ASYNCHRONOUSLY, so even on a
       * `setTimeout(…, 0)` the hash was still the OLD value, `reveal()` bailed
       * on its own guard, and the disclosure stayed shut — measured exactly
       * that way, twice, with the listener firing correctly both times.
       *
       * The handler already knows the answer: this anchor targets this id.
       * Asking the URL to confirm it was a redundant check that could only be
       * wrong, which is the whole lesson — a guard that re-derives a fact the
       * caller already has is a race, not a safeguard.
       */
      const el = ref.current;
      if (!el || el.open) return;
      el.open = true;
      el.querySelector("summary")?.focus({ preventScroll: true });
    };

    reveal();
    window.addEventListener("hashchange", reveal);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("hashchange", reveal);
      document.removeEventListener("click", onClick, true);
    };
  }, [id, open]);

  return (
    <details
      ref={ref}
      id={id}
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

export function Summary({ children, className, size, weight, paddingX, paddingY, color, layout, align, justify, ariaLabel }: SummaryProps) {
  return (
    <summary
      aria-label={ariaLabel}
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
