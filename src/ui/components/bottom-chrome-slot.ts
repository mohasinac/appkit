"use client";

import { useEffect, useState } from "react";

/**
 * The portal target inside `<BottomChrome>` — the middle tier of the bottom
 * edge, between the nav bar and BackToTop.
 *
 * Bars that live in the app shell (BottomActions) are rendered as children of
 * the tier directly. Bars authored deep in the tree (ListingLayout's mobile
 * pagination) portal into this node instead, so the tier still measures them
 * and every offset above stays correct.
 *
 * This lives in `ui/` rather than next to `<BottomChrome>` in `features/layout/`
 * on purpose: `features/layout` imports from `ui`, so a `ui` component reaching
 * back into `features/layout` would close an import cycle through the `ui`
 * barrel. Nothing here imports anything but React.
 */
export const BOTTOM_CHROME_SLOT_ID = "appkit-bottom-chrome-slot";

/**
 * Resolves the tier's portal target. Returns `null` until after mount, so a
 * consumer never touches the DOM during render — render nothing while it is
 * null, and portal into it once it resolves.
 */
export function useBottomChromeSlot(): HTMLElement | null {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlot(document.getElementById(BOTTOM_CHROME_SLOT_ID));
  }, []);
  return slot;
}
