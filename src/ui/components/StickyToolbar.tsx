import type { ReactNode } from "react";

/**
 * StickyToolbar — primitive for the recurrent translucent sticky bar pattern
 * (`sticky top-[calc(var(--header-height,0px)+44px)] z-10 ... backdrop-blur-sm
 * border-b ...`) used by search-results pages, leaderboards, etc.
 *
 * The header offset is sourced from `--header-height`, which the global
 * AppLayoutShell sets at runtime. Consumer code never authors the offset
 * manually — only `audit-sticky-offsets` allowlisted files may.
 */
export type StickyToolbarOffset = "header" | "header+nav" | number;
export type StickyToolbarTone = "default" | "muted" | "translucent" | "inverse";
export type StickyToolbarPadding = "none" | "sm" | "md" | "lg" | "toolbar";

export interface StickyToolbarProps {
  children: ReactNode;
  /** Vertical offset. Default `"header"` (under the AppLayoutShell title bar). */
  offset?: StickyToolbarOffset;
  /** Background tone. Default `"translucent"` (white/slate-950 + backdrop blur). */
  tone?: StickyToolbarTone;
  /** Show a bottom border. Default `true`. */
  border?: boolean;
  /** Padding preset. Default `"toolbar"`. */
  padding?: StickyToolbarPadding;
  /** Stacking layer. Default `"above-content"` (z-10). */
  z?: "below-modal" | "above-content";
  /** Accessible role override. */
  role?: string;
}

const TONE_CLS: Record<StickyToolbarTone, string> = {
  default: "bg-[var(--appkit-color-surface)]",
  muted: "bg-[var(--appkit-color-bg)]",
  translucent:
    "backdrop-blur-sm bg-[color-mix(in_srgb,var(--appkit-color-surface)_95%,transparent)]",
  inverse:
    "bg-[var(--appkit-color-primary)] text-[var(--appkit-color-text-on-primary)]",
};

const PADDING_CLS: Record<StickyToolbarPadding, string> = {
  none: "",
  sm: "px-2 py-1",
  md: "px-3 py-2",
  lg: "px-4 py-3",
  toolbar: "px-3 py-1.5",
};

function resolveOffset(offset: StickyToolbarOffset): string {
  if (offset === "header") {
    return "top-[var(--header-height,0px)]";
  }
  if (offset === "header+nav") {
    return "top-[calc(var(--header-height,0px)+44px)]";
  }
  // Numeric pixel offset.
  return `top-[${offset}px]`;
}

export function StickyToolbar({
  children,
  offset = "header",
  tone = "translucent",
  border = true,
  padding = "toolbar",
  z = "above-content",
  role,
}: StickyToolbarProps) {
  const offsetCls = resolveOffset(offset);
  const borderCls = border ? "border-b border-[var(--appkit-color-border)]" : "";
  const zCls = z === "above-content" ? "z-10" : "z-[5]";
  return (
    <div
      role={role}
      // for the translucent sticky-toolbar pattern. The header offset is
      // sourced from --header-height (set by AppLayoutShell at runtime).
      className={`sticky ${offsetCls} ${zCls} ${TONE_CLS[tone]} ${borderCls} ${PADDING_CLS[padding]}`}
    >
      {children}
    </div>
  );
}
