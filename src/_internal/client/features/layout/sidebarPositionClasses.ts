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
  if (hand === "left") {
    return {
      edgeClass: "left-0",
      borderClass: "border-r",
      collapsedTranslateClass: "-translate-x-[calc(100%-1.25rem)]",
    };
  }
  return {
    edgeClass: "right-0",
    borderClass: "border-l",
    collapsedTranslateClass: "translate-x-[calc(100%-1.25rem)]",
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
