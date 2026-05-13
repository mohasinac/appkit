export type OrderType =
  | "standard"
  | "preorder"
  | "auction"
  | "offer"
  | "prize-draw"
  | "bundle";

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
      listingType?: "standard" | "auction" | "pre-order" | "prize-draw" | "bundle";
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
    } else if (item.listingType === "bundle") {
      key = `bundle:${item.itemId}`;
      orderType = "bundle";
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
