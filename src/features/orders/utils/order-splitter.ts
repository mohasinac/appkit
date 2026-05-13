// SB-UNI-D — "bundle" dropped from OrderType; bundle cart lines (once
// add-to-cart-bundle ships) will expand to N product order lines at
// checkout rather than persisting as a bundle order group.
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

/**
 * Split a sequence of cart-items into order groups by `OrderType`.
 *
 * Auctions and offers each settle as their own single-item order (the auction
 * win is one transaction; an accepted offer is locked to one item). Pre-orders
 * and standard items are grouped per-store so each store gets a single
 * shipment.
 *
 * SB1-G Phase 4 — keys off the canonical `CartItem.listingType` discriminator
 * instead of the legacy `isAuction` / `isPreOrder` booleans.
 */
export function splitCartIntoOrderGroups<
  T extends {
    item: {
      itemId: string;
      storeId?: string;
      // SB-UNI-F 2026-05-13 — Phase 2 union extension. classified/live can't
      // hit checkout (capability gate at addToCart), but the type still lets
      // them flow through this splitter as "standard" if they somehow do.
      listingType?:
        | "standard"
        | "auction"
        | "pre-order"
        | "prize-draw"
        | "classified"
        | "digital-code"
        | "live";
      isOffer?: boolean;
    };
  },
>(checks: T[]): OrderGroup<T>[] {
  const groups = new Map<string, OrderGroup<T>>();

  for (const check of checks) {
    const { item } = check;
    let key: string;
    let orderType: OrderType;

    if (item.listingType === "auction") {
      key = `auction:${item.itemId}`;
      orderType = "auction";
    } else if (item.isOffer) {
      key = `offer:${item.itemId}`;
      orderType = "offer";
    } else if (item.listingType === "prize-draw") {
      // Each prize-draw entry is its own order (single reveal per order).
      key = `prize-draw:${item.itemId}`;
      orderType = "prize-draw";
    } else if (item.listingType === "pre-order") {
      key = `preorder:${item.storeId ?? "unknown"}`;
      orderType = "preorder";
    } else {
      key = `standard:${item.storeId ?? "unknown"}`;
      orderType = "standard";
    }

    if (!groups.has(key)) {
      groups.set(key, { items: [], orderType });
    }

    groups.get(key)!.items.push(check);
  }

  return Array.from(groups.values());
}
