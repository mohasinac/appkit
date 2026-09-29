/*
 * WHY: Authored six-part procedures for the cta-layout/product-bottom-bar page.
 * WHAT: 1 case, keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * Verified against ProductDetailActions on 2026-09-29. The mobile bar registers
 * three actions with DISTINCT variants, not two secondaries and a primary:
 *
 *   ghost    Wishlist  (reads 'Saved' and is DISABLED once wishlisted)
 *   outline  Add to Cart  (reads 'Adding…' while busy)
 *   primary  Buy Now      (reads 'Out of Stock' when stock is 0)
 *
 * It also publishes an `infoLabel` carrying the price, which doubles as the
 * bar's re-publish key. Signed in that reads the formatted price; signed out it
 * reads 'Sign in to see price' — so the bar is also where the guest price gate
 * is visible on this page, and a buyer who sees that string is looking at a
 * session that did not resolve.
 *
 * 🛑 product-beyblade-original-dranzer-s is stock 4 and not sold, so the
 * labels are Buy Now / Add to Cart rather than Out of Stock, and it is NOT in
 * this buyer's wishlist: the three seeded wishlists belong to user-yugi-muto,
 * user-seto-kaiba and user-admin-letitrip. So Wishlist is enabled and reads
 * 'Wishlist'. If it reads 'Saved' and is disabled, an earlier case added it
 * and that is not a defect.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

import type { AuthoredCase } from "./_types";

export const authored: Record<string, AuthoredCase> = {
  "checklist-cta-layout-product-bottom-bar-three-actions-wrap-to-second-row": {
    roles: ["buyer"],
    startPage: "/products/product-beyblade-original-dranzer-s",
    steps: [
      "Resize the browser window to 375 pixels wide.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /products/product-beyblade-original-dranzer-s.",
      "Read the bottom action bar and note which buttons share a row.",
      "Compare the widths of the two buttons on the upper row.",
      "Read the price shown on the bar — signed in it should read the formatted price, 1,499 for this product.",
      "Click 'Add to Cart' and watch the bar while the label changes.",
      "Count the rows in the bar during and after the change.",
    ],
    inputs: {
      viewportWidth: 375,
      productId: "product-beyblade-original-dranzer-s",
      price: 1499,
      expectedRows: 2,
    },
    expectedBehaviour:
      "Three actions of different weight are laid out as two secondaries sharing a row above one full-width primary. The secondaries share that row proportionally rather than one being pinned to its content width, which is what made the row read lopsided before.",
    expectedUiState:
      "'Wishlist' and 'Add to Cart' occupy the upper row and neither is squeezed to a fraction of the other. 'Buy Now' spans the full width beneath them. The bar shows the price, which for a signed-in buyer reads the formatted amount and never 'Sign in to see price'. While the label reads 'Adding…' the bar still has exactly two rows — a bar that reflows to three rows and back makes the whole page jump under the buyer's thumb mid-tap.",
    expectedData: { barRowCount: 2, priceOnBar: 1499 },
    endResult:
      "The item is in the cart. Restore the window width and empty the cart afterwards so later cases start clean.",
  },
};
