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
export function useCtaReveal(enabled = true, anchorId?: string): boolean {
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

  if (!enabled) return false;
  if (!anchorExists) return true;
  return seen && !inView;
}
