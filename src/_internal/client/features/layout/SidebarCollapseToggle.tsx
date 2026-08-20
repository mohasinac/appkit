"use client";

/**
 * Shared collapse/expand handle rendered on the right edge of every dashboard
 * sidebar (admin, store/seller, user). Replaces three identical inline copies
 * that previously baked hardcoded hex gradients per role — see plan §1.
 *
 * Background uses `--appkit-gradient-sidebar` so the handle re-themes
 * correctly: blue→green in light mode, pink→sky-blue in dark mode. Chevron
 * foreground is pinned to `--appkit-color-text-on-primary` so it stays
 * readable against the gradient regardless of theme.
 */

import React from "react";
import { IconButton } from "../../../../ui/components/IconButton";

export interface SidebarCollapseToggleProps {
  expanded: boolean;
  onToggle: () => void;
  /** aria-label override; defaults to "Collapse sidebar" / "Expand sidebar". */
  expandedLabel?: string;
  collapsedLabel?: string;
  /** Which edge the parent sidebar panel is docked to. Defaults to "right"
   * (the handle protrudes to the panel's outer/right edge). "left" mirrors
   * the rounded corner and chevron direction for left-hand mode. */
  edge?: "left" | "right";
}

const HANDLE_STYLE: React.CSSProperties = {
  background: "var(--appkit-gradient-sidebar)",
};

const CHEVRON_STYLE: React.CSSProperties = {
  color: "var(--appkit-color-text-on-primary)",
};

export function SidebarCollapseToggle({
  expanded,
  onToggle,
  expandedLabel = "Collapse sidebar",
  collapsedLabel = "Expand sidebar",
  edge = "right",
}: SidebarCollapseToggleProps): React.JSX.Element {
  // The panel's free (open) edge is opposite its dock side: a left-docked
  // panel (edge="left") protrudes its handle to the right, and vice versa.
  const roundedClass = edge === "left" ? "rounded-r-[1.25rem]" : "rounded-l-[1.25rem]";
  // Chevron rotation direction mirrors along with the dock side so it keeps
  // pointing "into" the collapsed panel regardless of which edge it's on.
  const chevronRotated = edge === "left" ? !expanded : expanded;
  return (
    <IconButton
      type="button"
      onClick={onToggle}
      aria-label={expanded ? expandedLabel : collapsedLabel}
      aria-expanded={expanded}
      variant="ghost"
      style={HANDLE_STYLE}
      className={`w-9 shrink-0 ${roundedClass} shadow-lg transition-all duration-200 hover:shadow-xl hover:brightness-110 active:scale-[0.96]`}
      icon={
        <svg
          className={`w-4 h-4 drop-shadow-sm transition-transform duration-300 ${chevronRotated ? "rotate-180" : ""}`}
          style={CHEVRON_STYLE}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
      }
    />
  );
}
