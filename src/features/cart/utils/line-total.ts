import { lineTotalFor, type PricedCartLine } from "../../../_internal/shared/checkout/order-math";

/**
 * What one cart line contributes to a subtotal, computed on the CLIENT — where
 * no `ProductDocument` is available.
 *
 * Delegates to `lineTotalFor(item, null)` so the priority order that actually
 * matters stays in one place (`order-math.ts`): a `lockedPrice` beats
 * everything, a bundle is charged its own discounted price and is checked
 * BEFORE its members, a grouped line is the sum of what the buyer picked, and
 * anything else falls back to the cart's snapshotted price.
 *
 * 🛑 Do not re-derive this at a call site. That rule has been hand-rolled six
 * times already and two of the copies silently omitted the `lockedPrice`
 * branch, so an accepted offer was charged at the seller's list price
 * (Recurrent Root Cause #75).
 *
 * The one thing it cannot know is a live listing price that has moved since the
 * line was added — `lineTotalFor` would read that off the product document.
 * That is fine for the surfaces this serves (the cart and the checkout
 * add-ons/fees step): both exist to render immediately with a good figure, and
 * the server pricing preview overwrites it with the authoritative one the
 * moment it lands.
 */
export function clientLineTotal(item: PricedCartLine): number {
  return lineTotalFor(item, null);
}

export type { PricedCartLine };
