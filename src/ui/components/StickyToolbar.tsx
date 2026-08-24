"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
 * preference, so it resets on reload rather than persisting forever. Both
 * directions render the same centred, labelled strip ("Hide Toolbar" /
 * "Show Toolbar") so the control is symmetric and self-describing. This
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
    // The sticky pagination-row offset repeated verbatim across every
    // DataListingView-style index listing — consolidated here instead of
    // copy-pasted. It tracks the toolbar's REAL height via
    // --appkit-toolbar-height, which a dismissible StickyToolbar publishes
    // from its own ResizeObserver (see TOOLBAR_HEIGHT_VAR below). A fixed
    // constant can only ever be right in one state: the toolbar is ~64px
    // expanded but ~20px collapsed, so hard-coding 64px left a ~44px gap
    // through which page content scrolled between the two pinned bars.
    // The 64px fallback is the expanded height, used on any page whose
    // toolbar isn't dismissible and therefore publishes nothing.
    return "top-[calc(var(--header-height,0px)+var(--appkit-toolbar-height,64px))]";
  }
  if (offset === "header+bulk-actions") {
    // Stacks below both the filter toolbar (same variable as above) and the
    // pagination row between them (~52px).
    return "top-[calc(var(--header-height,0px)+var(--appkit-toolbar-height,64px)+52px)]";
  }
  // Numeric offsets are applied via inline style instead (see below) —
  // Tailwind's static scanner can never see a dynamically-interpolated
  // `top-[${offset}px]` arbitrary value, so no CSS rule would ever be
  // generated for it in the compiled stylesheet.
  return "";
}

/**
 * Written to `<html>` by every dismissible StickyToolbar from a
 * ResizeObserver, and consumed by the `header+pagination` /
 * `header+bulk-actions` offsets so a bar stacked underneath tracks the real
 * height in both the expanded and collapsed states.
 */
const TOOLBAR_HEIGHT_VAR = "--appkit-toolbar-height";

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

/**
 * The collapse/expand control — one component for both states so the two
 * halves of the affordance can't drift apart (the collapsed strip read
 * "Show Toolbar" while the expanded one was a bare, unlabelled chevron
 * pinned to the far right until 2026-08-24).
 */
function CollapseStrip({
  collapsed,
  label,
  onToggle,
  className,
}: {
  collapsed: boolean;
  label: string;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <div className={`flex justify-center ${className ?? ""}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={`${collapsed ? "Show" : "Hide"} ${label}`}
        aria-expanded={!collapsed}
        className="flex items-center gap-1 px-4 py-0.5 text-[length:var(--appkit-text-xs)] text-[var(--appkit-color-text-muted)] hover:text-[var(--appkit-color-text)]"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-150 ${collapsed ? "" : "rotate-180"}`}
          aria-hidden="true"
        />
        {collapsed ? "Show" : "Hide"} {label}
      </button>
    </div>
  );
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
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (dismissible && id) setCollapsed(readCollapsed(id));
  }, [dismissible, id]);

  // Publish the rendered height so a bar stacked below (sticky pagination,
  // bulk-action bar) can offset itself against what's actually on screen.
  // `collapsed` is a dependency because the two states are distinct elements
  // — React remounts the node, so the observer must re-attach to the new one.
  useEffect(() => {
    if (!dismissible || !id) return;
    const el = rootRef.current;
    if (!el) return;
    const write = () => {
      document.documentElement.style.setProperty(
        TOOLBAR_HEIGHT_VAR,
        `${Math.round(el.getBoundingClientRect().height)}px`,
      );
    };
    write();
    const observer = new ResizeObserver(write);
    observer.observe(el);
    return () => {
      observer.disconnect();
      // Drop it on unmount so a route with no dismissible toolbar falls back
      // to the 64px default instead of inheriting the previous page's value.
      document.documentElement.style.removeProperty(TOOLBAR_HEIGHT_VAR);
    };
  }, [dismissible, id, collapsed]);

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
        ref={rootRef}
        data-testid={dataTestId}
        style={offsetStyle}
        className={`sticky ${offsetCls} ${zCls} ${TONE_CLS[tone]} ${borderCls}`}
      >
        <CollapseStrip collapsed label={label} onToggle={toggle} />
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      role={role}
      data-testid={dataTestId}
      style={offsetStyle}
      // for the translucent sticky-toolbar pattern. The header offset is
      // sourced from --header-height (set by AppLayoutShell at runtime).
      // The collapse control is a full-width strip appended AFTER `children`
      // rather than an element positioned over them, so it never competes
      // with the internal Row/Div layout each of the 27+ migrated call sites
      // brings of its own.
      className={`sticky ${offsetCls} ${zCls} ${TONE_CLS[tone]} ${borderCls} ${PADDING_CLS[padding]} ${className ?? ""}`}
    >
      {children}
      {dismissible && id && (
        <CollapseStrip collapsed={false} label={label} onToggle={toggle} className="mt-1.5" />
      )}
    </div>
  );
}
