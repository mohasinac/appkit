"use client";
// appkit/src/ui/components/toolbar-collapse.tsx
import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { normalizeError } from "../../errors/normalize";

/**
 * The collapse mechanism shared by `<StickyToolbar dismissible>` and
 * `<ListingLayout>`'s own mobile toolbar rows.
 *
 * It lives here rather than in either component because there are two
 * unrelated toolbars on listing surfaces — the `StickyToolbar` that
 * `ListingToolbar`/`DataListingView` mount, and `ListingLayout`'s hand-rolled
 * `.appkit-listing-layout__toolbar` — and a second copy of "is it collapsed,
 * and where is that remembered" would drift the first time one of them
 * changed. One implementation, one sessionStorage key space.
 */

const STORAGE_PREFIX = "appkit:sticky-toolbar-collapsed:";

/** Below this the toolbar defaults to collapsed. Matches the `lg` boundary
 *  that both toolbars already use to switch between their mobile and desktop
 *  rows, so the default flips at the same width the layout does. */
const MOBILE_QUERY = "(max-width: 1023px)";

/**
 * Tri-state on purpose: `null` means "the user has never chosen", which is
 * what lets the viewport supply the default. A plain boolean cannot express
 * the difference between "they expanded it" and "they have not touched it".
 */
export function readCollapsedPref(id: string): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + id);
    if (raw === null) return null;
    return raw === "1";
  } catch (_err) {
    void normalizeError(_err);
    return null;
  }
}

/**
 * Writes `"0"` for expanded rather than removing the key. Removing it would
 * leave no stored preference, so on mobile the viewport default would collapse
 * the toolbar again on the next navigation and the user's choice would read as
 * not having stuck.
 */
export function writeCollapsedPref(id: string, value: boolean): void {
  try {
    window.sessionStorage.setItem(STORAGE_PREFIX + id, value ? "1" : "0");
  // sessionStorage blocked (private browsing). Collapsing still works this render, it just will not survive a re-mount.
  } catch (_err) {
    void normalizeError(_err);
  }
}

export function defaultCollapsedForViewport(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(MOBILE_QUERY).matches;
}

export interface UseToolbarCollapseOptions {
  /** Stable id — the sessionStorage key. Collapse is disabled without one. */
  id?: string;
  /** Set false to opt out entirely (the toolbar is always expanded). */
  enabled?: boolean;
  /**
   * Force the expanded state regardless of preference. Used when the toolbar
   * holds controls the user cannot reach any other way — `ListingLayout` keeps
   * it open while rows are selected, since the bulk-action bar renders inside
   * the toolbar and a collapsed one would leave no way to act on a selection.
   */
  forceExpanded?: boolean;
}

export interface UseToolbarCollapseResult {
  collapsed: boolean;
  toggle: () => void;
}

export function useToolbarCollapse({
  id,
  enabled = true,
  forceExpanded = false,
}: UseToolbarCollapseOptions): UseToolbarCollapseResult {
  // Always starts expanded so the server and the first client render agree;
  // the effect below corrects it after mount. Reading sessionStorage or
  // matchMedia in the initialiser would be a hydration mismatch.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!enabled || !id) return;
    const stored = readCollapsedPref(id);
    setCollapsed(stored ?? defaultCollapsedForViewport());
  }, [enabled, id]);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      if (id) writeCollapsedPref(id, next);
      return next;
    });
  }, [id]);

  return { collapsed: enabled && !forceExpanded ? collapsed : false, toggle };
}

/**
 * The collapse/expand control — one component for both states so the two
 * halves of the affordance can't drift apart (the collapsed strip read
 * "Show Toolbar" while the expanded one was a bare, unlabelled chevron
 * pinned to the far right until 2026-08-24).
 */
export function CollapseStrip({
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
