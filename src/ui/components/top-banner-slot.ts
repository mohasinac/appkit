"use client";

import { useEffect, useState } from "react";

/**
 * The portal target ABOVE the sticky header, published by `AppLayoutShell`.
 *
 * This is the page's topmost band: a dismissible announcement or promo strip
 * that a PAGE owns but that must render above the title bar, which only the
 * layout can place. A page cannot render into the layout's header by returning
 * JSX, so it portals here instead.
 *
 * ── 🛑 Why this exists rather than an `overlay` prop ───────────────────────
 *
 * `AnnouncementBar` used to take `overlay`, which positioned it `absolute
 * inset-x-0 top-0` over the homepage's first section. That reserves no space
 * by design, so the banner painted ON TOP of the hero — the whole reason the
 * component carried a measured-overlap comment about phone widths. Moving it
 * into the real document flow above the header removes the overlap as a class
 * of bug rather than tuning the breakpoint it happens at.
 *
 * ── 🛑 The slot is deliberately OUTSIDE the sticky wrapper ────────────────
 *
 * `AppLayoutShell` measures its sticky header into `--header-height`, and every
 * `StickyToolbar offset="header"` in the app reads that. A banner placed inside
 * that wrapper would inflate the number for as long as it is on screen and
 * shrink it the moment someone dismisses it — so every sticky toolbar on the
 * page would jump. Outside the wrapper, the banner scrolls away with the page,
 * `--header-height` never changes, and dismissal costs no relayout below.
 *
 * Lives in `ui/` for the same reason as `bottom-chrome-slot`: `features/layout`
 * imports from `ui`, so the reverse would close an import cycle through the
 * `ui` barrel. Nothing here imports anything but React.
 */
export const TOP_BANNER_SLOT_ID = "appkit-top-banner-slot";

/**
 * Resolves the top-banner portal target. Returns `null` until after mount, so a
 * consumer never touches the DOM during render — render nothing while it is
 * null, and portal into it once it resolves.
 */
export function useTopBannerSlot(): HTMLElement | null {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlot(document.getElementById(TOP_BANNER_SLOT_ID));
  }, []);
  return slot;
}
