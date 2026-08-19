"use client";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { normalizeError } from "../../errors/normalize";

/**
 * StickyToolbar — primitive for the recurrent translucent sticky bar pattern
 * (`sticky top-[calc(var(--header-height,0px)+var(--appkit-navbar-height,2.5rem))]
 * z-10 ... backdrop-blur-sm border-b ...`) used by search-results pages,
 * leaderboards, sticky pagination rows, etc.
 *
 * The header offset is sourced from `--header-height`, which the global
 * AppLayoutShell sets at runtime. Consumer code never authors the offset
 * manually — only `audit-sticky-offsets` allowlisted files may.
 *
 * Dismiss/hide: pass `dismissible` (with a stable `id`) to let the user
 * collapse the bar to a thin re-expand strip for the rest of the browser
 * session — a viewport-annoyance-avoidance toggle, not a durable
 * preference, so it resets on reload rather than persisting forever. This
 * is what closes the mobile-overlap complaint the sticky toolbar pattern
 * caused across listing pages: at narrow widths, any sticky bar competing
 * with page content for vertical space needs a way out that doesn't require
 * scrolling past it.
 */
export type StickyToolbarOffset = "header" | "header+nav" | "header+pagination" | "header+bulk-actions" | number;
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
  /** Padding preset. Default `"toolbar"`. Use `"none"` + `className` for a responsive/custom padding a preset can't express. */
  padding?: StickyToolbarPadding;
  /**
   * Stacking layer. Default `"above-content"` (z-10). Use `"above-toolbar"`
   * (z-20) for a bar that must stack above another StickyToolbar beneath it
   * — the common case being a bulk-action bar or primary filter toolbar
   * sitting above a secondary sticky pagination row.
   */
  z?: "below-modal" | "above-content" | "above-toolbar";
  /** Accessible role override. */
  role?: string;
  /** Extra classes appended after the primitive's own — the escape hatch for another primitive (e.g. ListingToolbar) built on top of this one. */
  className?: string;
  /** Forwarded to the root element — for `data-testid` and similar test/analytics hooks. */
  dataTestId?: string;
  /**
   * When true, renders a collapse/expand control. Requires `id` — the
   * collapsed state is stored in `sessionStorage` keyed by it, so distinct
   * toolbars on the same page (or the same toolbar across route changes
   * within a session) don't clobber each other.
   */
  dismissible?: boolean;
  /** Required when `dismissible` is true — see above. */
  id?: string;
  /** Accessible label for the collapse/expand button. Default "Toolbar". */
  label?: string;
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

function resolveOffsetClass(offset: StickyToolbarOffset): string {
  if (offset === "header") {
    return "top-[var(--header-height,0px)]";
  }
  if (offset === "header+nav") {
    return "top-[calc(var(--header-height,0px)+var(--appkit-navbar-height,2.5rem))]";
  }
  if (offset === "header+pagination") {
    // Matches the sticky pagination-row offset repeated verbatim across
    // every DataListingView-style index listing (64px = the ListingToolbar
    // row height above it — py-3/py-3.5 padding + its ~38px content row) —
    // consolidated here instead of copy-pasted. Keep in sync with
    // ListingToolbar's own padding classes; a mismatch makes the pagination
    // row overlap/hide behind the toolbar (the "too compact when sticky"
    // regression fixed 2026-08-19).
    return "top-[calc(var(--header-height,0px)+64px)]";
  }
  if (offset === "header+bulk-actions") {
    // Matches the sticky bulk-action-bar offset that stacks below both the
    // filter toolbar (64px) and the pagination row above it (~52px more).
    return "top-[calc(var(--header-height,0px)+116px)]";
  }
  // Numeric offsets are applied via inline style instead (see below) —
  // Tailwind's static scanner can never see a dynamically-interpolated
  // `top-[${offset}px]` arbitrary value, so no CSS rule would ever be
  // generated for it in the compiled stylesheet.
  return "";
}

const STORAGE_PREFIX = "appkit:sticky-toolbar-collapsed:";

function readCollapsed(id: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(STORAGE_PREFIX + id) === "1";
  } catch (_err) {
    void normalizeError(_err);
    return false;
  }
}

function writeCollapsed(id: string, value: boolean): void {
  try {
    if (value) window.sessionStorage.setItem(STORAGE_PREFIX + id, "1");
    else window.sessionStorage.removeItem(STORAGE_PREFIX + id);
  } catch (_err) {
    void normalizeError(_err);
    // sessionStorage unavailable (private browsing, etc.) — collapse still
    // works for the current render, just doesn't survive a re-mount.
  }
}

export function StickyToolbar({
  children,
  offset = "header",
  tone = "translucent",
  border = true,
  padding = "toolbar",
  z = "above-content",
  role,
  className,
  dataTestId,
  dismissible = false,
  id,
  label = "Toolbar",
}: StickyToolbarProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (dismissible && id) setCollapsed(readCollapsed(id));
  }, [dismissible, id]);

  const offsetCls = resolveOffsetClass(offset);
  const offsetStyle = typeof offset === "number" ? { top: `${offset}px` } : undefined;
  const borderCls = border ? "border-b border-[var(--appkit-color-border)]" : "";
  const zCls = z === "above-toolbar" ? "z-20" : z === "above-content" ? "z-10" : "z-[5]";

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (id) writeCollapsed(id, next);
  };

  if (dismissible && id && collapsed) {
    return (
      <div
        data-testid={dataTestId}
        style={offsetStyle}
        className={`sticky ${offsetCls} ${zCls} ${TONE_CLS[tone]} ${borderCls} flex justify-center`}
      >
        <button
          type="button"
          onClick={toggle}
          aria-label={`Show ${label}`}
          aria-expanded={false}
          className="flex items-center gap-1 px-4 py-0.5 text-[length:var(--appkit-text-xs)] text-[var(--appkit-color-text-muted)] hover:text-[var(--appkit-color-text)]"
        >
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          Show {label}
        </button>
      </div>
    );
  }

  return (
    <div
      role={role}
      data-testid={dataTestId}
      style={offsetStyle}
      // for the translucent sticky-toolbar pattern. The header offset is
      // sourced from --header-height (set by AppLayoutShell at runtime).
      // `relative` only when dismissible — the absolutely-positioned toggle
      // button anchors to it without disturbing the existing internal
      // layout of `children` (each of the 27+ migrated call sites has its
      // own Row/Div structure; a flex wrapper here would double-nest and
      // risk breaking their centering).
      className={`sticky ${offsetCls} ${zCls} ${TONE_CLS[tone]} ${borderCls} ${PADDING_CLS[padding]} ${dismissible ? "relative pr-8" : ""} ${className ?? ""}`}
    >
      {children}
      {dismissible && id && (
        <button
          type="button"
          onClick={toggle}
          aria-label={`Hide ${label}`}
          aria-expanded={true}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--appkit-color-text-muted)] hover:bg-[var(--appkit-color-surface-elevated)] hover:text-[var(--appkit-color-text)]"
        >
          <ChevronDown className="h-3.5 w-3.5 rotate-180 transition-transform duration-150" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
