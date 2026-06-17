/**
 * Cart-level shipping-requirement helpers — SB-UNI-S 2026-05-13.
 *
 * Reads `supportsShipping` / `hasInstantFulfillment` / `canAddToCart` off
 * the capability registry for every cart item and answers three questions:
 *
 *  - `cartRequiresShipping(items)` — does ANY line need a shipping address?
 *    If true, the checkout flow MUST collect an address and the order
 *    record persists it. If false, the checkout flow can skip the address
 *    step entirely (digital-code-only carts).
 *
 *  - `cartIsDigitalOnly(items)` — does EVERY line have
 *    `hasInstantFulfillment === true`? If true, the order detail page
 *    surfaces the reveal/claim flow inline and the buyer gets a digital
 *    receipt with no shipping tracking.
 *
 *  - `cartIsChatOnly(items)` — does EVERY line have
 *    `canAddToCart === false`? Lets the cart UI surface "this product
 * can only be reached via chat" when classified items somehow make it
 *    through (defence-in-depth — addToCart already rejects them).
 *
 * Used by both checkout server actions (skip address validation when
 * `!cartRequiresShipping(items)`) and the cart/checkout UI (collapse the
 * address-picker step in the same case).
 */

import { capabilityFor } from "./capabilities";
import type { ListingType } from "../../../features/products/types/index";

interface CartItemLike {
  listingType?: ListingType;
}

function getCap(item: CartItemLike) {
  return capabilityFor(item.listingType ?? "standard");
}

/** True when AT LEAST ONE line in the cart needs a shipping address. */
export function cartRequiresShipping(items: CartItemLike[]): boolean {
  return items.some((it) => getCap(it).supportsShipping);
}

/** True when EVERY line in the cart fulfills instantly (digital-code-only carts). */
export function cartIsDigitalOnly(items: CartItemLike[]): boolean {
  if (items.length === 0) return false;
  return items.every((it) => getCap(it).hasInstantFulfillment);
}

/** True when EVERY line is chat-only (`canAddToCart === false`). Used to
 *  surface "this product can only be reached via chat" at the cart UI. */
export function cartIsChatOnly(items: CartItemLike[]): boolean {
  if (items.length === 0) return false;
  return items.every((it) => !getCap(it).canAddToCart);
}
