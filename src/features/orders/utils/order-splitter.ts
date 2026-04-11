export type OrderType = "standard" | "preorder" | "auction" | "offer";

export interface OrderGroup<T> {
  items: T[];
  orderType: OrderType;
}

export function splitCartIntoOrderGroups<
  T extends {
    item: {
      itemId: string;
      sellerId?: string;
      isAuction?: boolean;
      isPreOrder?: boolean;
      isOffer?: boolean;
    };
  },
>(checks: T[]): OrderGroup<T>[] {
  const groups = new Map<string, OrderGroup<T>>();

  for (const check of checks) {
    const { item } = check;
    let key: string;
    let orderType: OrderType;

    if (item.isAuction) {
      key = `auction:${item.itemId}`;
      orderType = "auction";
    } else if (item.isOffer) {
      key = `offer:${item.itemId}`;
      orderType = "offer";
    } else if (item.isPreOrder) {
      key = `preorder:${item.sellerId ?? "unknown"}`;
      orderType = "preorder";
    } else {
      key = `standard:${item.sellerId ?? "unknown"}`;
      orderType = "standard";
    }

    if (!groups.has(key)) {
      groups.set(key, { items: [], orderType });
    }

    groups.get(key)!.items.push(check);
  }

  return Array.from(groups.values());
}
