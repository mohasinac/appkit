"use client";

import { useEffect, useState } from "react";
import { CTA_ANCHOR_ATTR } from "./cta-anchor";

/**
 * useCtaReveal — "has the user met the Buy button and scrolled past it?"
 *
 * Returns true when the floating action dock should be on screen:
 *
 *  - the page marks NO CTA anchor          → true immediately (nothing to wait
 *    for; an admin bulk bar has no Buy button)
 *  - the page marks one, not yet seen      → false (the inline CTA is doing the
 *    job; a second copy of it beside itself is noise)
 *  - seen, and now out of view             → true
 *  - seen, and scrolled back into view      → false again
 *
 * 🛑 `IntersectionObserver`, never a scroll-position threshold. The bar this
 * replaces used `window.scrollY > 400`, which is a guess about where a CTA sits
 * — wrong on a short page (the dock appears while the real button is still on
 * screen) and wrong on a long gallery (it appears before the CTA is reached).
 * Observing the element itself is the same rule stated exactly, and it costs no
 * scroll handler.
 *
 * The anchor is looked up on an interval-free `MutationObserver` because the
 * page that owns it mounts AFTER this dock — the dock lives in the app shell
 * and the CTA arrives with the route.
 */
export interface CtaRevealState {
  /** Should the floating dock / bar be on screen? */
  revealed: boolean;
  /**
   * Does this page mark an inline CTA at all?
   *
   * The discriminator between a DETAIL page (a real Buy button exists, so the
   * floating control's job is to take you back to it) and a BULK screen (no
   * Buy button was ever there, so the floating control IS the only affordance
   * and must carry the actions itself).
   */
  hasAnchor: boolean;
  /** Scroll the inline CTA back into view. A no-op when there is no anchor. */
  scrollToAnchor: () => void;
}

export function useCtaReveal(enabled = true, anchorId?: string): CtaRevealState {
  const [anchor, setAnchor] = useState<Element | null>(null);
  const [anchorExists, setAnchorExists] = useState(false);
  const [seen, setSeen] = useState(false);
  const [inView, setInView] = useState(false);

  // Find the anchor, and keep looking — a client-side navigation swaps the
  // page under a dock that never unmounts.
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    const read = () => {
      // An id published through the context wins over the attribute: a page
      // that names its anchor explicitly is making a more specific statement
      // than "somewhere on this page there is a CTA".
      const el = anchorId
        ? document.getElementById(anchorId)
        : document.querySelector(`[${CTA_ANCHOR_ATTR}]`);
      setAnchor((prev) => (prev === el ? prev : el));
      setAnchorExists(!!el);
      // A new page means a fresh question. Without this reset, navigating from
      // a product page (seen, scrolled past) to another one would reveal the
      // dock at the top of the new page, over its own inline CTA.
      if (!el) {
        setSeen(false);
        setInView(false);
      }
    };

    read();
    const mo = new MutationObserver(read);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [enabled, anchorId]);

  useEffect(() => {
    if (!anchor || typeof IntersectionObserver === "undefined") return;
    setSeen(false);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setSeen(true);
      },
      // Any sliver counts as "met it" — a CTA half-cut by the fold has been
      // encountered, and requiring full visibility would leave the dock hidden
      // on a short viewport where it is needed most.
      { threshold: 0 },
    );
    io.observe(anchor);
    return () => io.disconnect();
  }, [anchor]);

  /*
   * Re-read at CLICK time rather than closing over `anchor`. A client-side
   * navigation swaps the page under a dock that never unmounts, and the
   * element captured when the effect last ran may already be detached — a
   * `scrollIntoView` on a detached node silently does nothing.
   */
  const scrollToAnchor = () => {
    if (typeof document === "undefined") return;
    const el = anchorId
      ? document.getElementById(anchorId)
      : document.querySelector(`[${CTA_ANCHOR_ATTR}]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (!enabled) return { revealed: false, hasAnchor: anchorExists, scrollToAnchor };
  if (!anchorExists) return { revealed: true, hasAnchor: false, scrollToAnchor };
  return { revealed: seen && !inView, hasAnchor: true, scrollToAnchor };
}
