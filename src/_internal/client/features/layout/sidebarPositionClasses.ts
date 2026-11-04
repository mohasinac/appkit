import type { HandMode } from "../../hand-mode";

/** Classes for the desktop persistent sidebar rail (Admin/Seller/User
 * `variant="sidebar"`) — flips which edge it docks to, its border side, and
 * its collapsed-state translate direction, based on the hand-mode
 * preference. Kept as a single shared helper so the flip logic isn't
 * hand-forked identically across all three sidebar files. */
export interface SidebarRailClasses {
  edgeClass: string;
  borderClass: string;
  collapsedTranslateClass: string;
}

export function getSidebarRailClasses(hand: HandMode): SidebarRailClasses {
  // Collapsed state hides the panel FULLY off-screen (-translate-x-full /
  // translate-x-full), not a partial `calc(100% - 1.25rem)` that left a
  // ~20px sliver of the full-width, still-text-labelled panel bleeding into
  // the viewport — read as a rendering bug, not a control, and flagged
  // directly (owner screenshot, 2026-11-05). The toggle handle itself
  // (SidebarCollapseToggle) is positioned relative to the panel's own edge
  // via `position: absolute`, independent of this transform, so it stays
  // fully visible and clickable in both states regardless.
  if (hand === "left") {
    return {
      edgeClass: "left-0",
      borderClass: "border-r",
      collapsedTranslateClass: "-translate-x-full",
    };
  }
  return {
    edgeClass: "right-0",
    borderClass: "border-l",
    collapsedTranslateClass: "translate-x-full",
  };
}

/** Classes for the mobile overlay drawer variant (Admin/Seller/User
 * `variant="overlay"` → `DrawerPanel`) — same edge/border flip, no
 * translate state since the panel is conditionally mounted, not animated. */
export interface SidebarOverlayClasses {
  edgeClass: string;
  borderClass: string;
}

export function getSidebarOverlayClasses(hand: HandMode): SidebarOverlayClasses {
  if (hand === "left") {
    return { edgeClass: "left-0", borderClass: "border-r" };
  }
  return { edgeClass: "right-0", borderClass: "border-l" };
}
