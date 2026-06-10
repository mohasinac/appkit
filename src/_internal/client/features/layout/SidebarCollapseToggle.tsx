"use client";

/**
 * Shared collapse/expand handle rendered on the right edge of every dashboard
 * sidebar (admin, store/seller, user). Replaces three identical inline copies
 * that previously baked hardcoded hex gradients per role — see plan §1.
 *
 * Background uses `--appkit-color-primary-*` / `--appkit-color-secondary-*`
 * tokens so the handle re-themes correctly in light and dark modes. Chevron
 * foreground is pinned to `--appkit-color-text-on-primary` so it stays
 * readable against the gradient regardless of theme.
 */

import React from "react";

export interface SidebarCollapseToggleProps {
  expanded: boolean;
  onToggle: () => void;
  /** aria-label override; defaults to "Collapse sidebar" / "Expand sidebar". */
  expandedLabel?: string;
  collapsedLabel?: string;
}

const HANDLE_STYLE: React.CSSProperties = {
  background:
    "linear-gradient(to bottom, var(--appkit-color-primary-700, var(--appkit-color-primary)), var(--appkit-color-secondary-500, var(--appkit-color-secondary)))",
};

const CHEVRON_STYLE: React.CSSProperties = {
  color: "var(--appkit-color-text-on-primary, #ffffff)",
};

export function SidebarCollapseToggle({
  expanded,
  onToggle,
  expandedLabel = "Collapse sidebar",
  collapsedLabel = "Expand sidebar",
}: SidebarCollapseToggleProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={expanded ? expandedLabel : collapsedLabel}
      aria-expanded={expanded}
      // eslint-disable-next-line lir/no-inline-static-style
      // audit-inline-style-ok: pass-through style prop
      style={HANDLE_STYLE}
      className="w-9 shrink-0 flex items-center justify-center cursor-pointer rounded-r-[1.25rem] shadow-lg transition-all duration-200 hover:shadow-xl hover:brightness-110 active:scale-[0.96]"
    >
      <svg
        className={`w-4 h-4 drop-shadow-sm transition-transform duration-300 ${expanded ? "" : "rotate-180"}`}
        // eslint-disable-next-line lir/no-inline-static-style
        // audit-inline-style-ok: pass-through style prop
        style={CHEVRON_STYLE}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
}
