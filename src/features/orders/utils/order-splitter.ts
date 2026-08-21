// S-SBUNI-RULES 2026-05-13 — rewired from manual if/else chain to checkout
// rule registry. Adding a new listing type only requires a rule file and a
// registry entry; no changes here.
export type OrderType =
  | "standard"
  | "preorder"
  | "auction"
  | "offer"
  | "prize-draw";

export interface OrderGroup<T> {
  items: T[];
  orderType: OrderType;
}

import type { CartItemDocument } from "../../cart/schemas/firestore";
import type { ListingType } from "../../products/types/index";
import {
  getListingRule,
  offerRule,
  auctionRule,
} from "../../../_internal/shared/checkout/rules";
import { CART_LANE, laneOf } from "../../../_internal/shared/checkout/lanes";

/**
 * Split a sequence of cart-items into order groups by `OrderType`.
 *
 * The split key and order type are both derived from the checkout rule
 * registry so new listing types need no changes here.
 *
 * Prize-draw items with qty > PRIZE_DRAW_MAX_REVEALS_PER_ORDER are first
 * expanded into virtual single-batch items (via `rule.splitMultipleOrders`),
 * then each batch lands in its own order group.
 *
 * SB1-G Phase 4 — keys off the canonical `CartItem.listingType` discriminator
 * instead of the legacy `isAuction` / `isPreOrder` booleans.
 * S-SBUNI-RULES 2026-05-13 — rule-registry dispatch replaces if/else chain.
 */
export function splitCartIntoOrderGroups<
  T extends { item: CartItemDocument },
>(checks: T[]): OrderGroup<T>[] {
  const groups = new Map<string, OrderGroup<T>>();

  for (const check of checks) {
    const { item } = check;
    const lt = (item.listingType ?? "standard") as ListingType;
    // Lane first, listing type second. A locked line's obligation — not the
    // product's listing type — decides how it settles: an accepted offer is
    // always its own order, and a won auction is always its own order even
    // though `auctionRule` is otherwise unreachable (auctions are
    // `cartEligible: false` for user-initiated adds; the only way one reaches
    // the cart is auction settlement writing the winner's locked line).
    const lane = laneOf(item);
    const rule =
      lane === CART_LANE.OFFER
        ? offerRule
        : lane === CART_LANE.AUCTION
          ? auctionRule
          : (getListingRule(lt) ?? getListingRule("standard"));

    // Prize-draw (and future types with maxLinesPerOrder < Infinity) may split
    // one cart item into N virtual batch items.
    const virtualItems = rule.splitMultipleOrders(item);

    for (let batchIdx = 0; batchIdx < virtualItems.length; batchIdx++) {
      const virtualItem = virtualItems[batchIdx];
      const virtualCheck = { ...check, item: virtualItem } as T;
      const baseKey = rule.splitKey(virtualItem);
      // Append a batch suffix only when there are multiple batches so the key
      // stays stable for single-order types.
      const key =
        virtualItems.length > 1 ? `${baseKey}:batch-${batchIdx}` : baseKey;

      if (!groups.has(key)) {
        groups.set(key, { items: [], orderType: rule.orderType });
      }
      groups.get(key)!.items.push(virtualCheck);
    }
  }

  return Array.from(groups.values());
}
