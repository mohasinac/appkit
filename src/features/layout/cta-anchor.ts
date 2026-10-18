/**
 * CTA anchor — the inline Buy button a floating action dock hides behind.
 *
 * A page marks its own primary CTA with `ctaAnchorProps()`; `SideActionDock`
 * finds it by attribute and reveals itself only once that element has been
 * SEEN and then scrolled out of view.
 *
 * 🛑 An ATTRIBUTE, not a ref passed through the context, on purpose. The dock
 * is mounted once by `AppLayoutShell`, several levels above every page that
 * registers actions, and ~30 call sites publish into that context — threading a
 * ref through all of them to reach a gate that only a handful of detail pages
 * need would make the common case pay for the rare one. An attribute lets a
 * page opt in with one prop spread and lets every other page say nothing.
 *
 * A page with NO anchor reveals the dock immediately. That is the honest
 * default: an admin bulk bar has no Buy button to scroll past, and a dock that
 * waited for an element that will never exist would never appear at all.
 */

export const CTA_ANCHOR_ATTR = "data-cta-anchor";

/**
 * Spread onto the element wrapping a page's inline primary CTA.
 *
 * @example
 * <Stack gap="sm" {...ctaAnchorProps()}>
 *   <Button>Buy Now</Button>
 *   <Button>Add to Cart</Button>
 * </Stack>
 */
export function ctaAnchorProps(): { [CTA_ANCHOR_ATTR]: "true" } {
  return { [CTA_ANCHOR_ATTR]: "true" };
}
