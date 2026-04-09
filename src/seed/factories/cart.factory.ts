// appkit/src/seed/factories/cart.factory.ts
let _seq = 1;

export interface SeedCartItemDocument {
  productId: string;
  quantity: number;
  /** Unit price at time of adding to cart */
  price: number;
  storeId?: string;
  sellerId?: string;
  variantId?: string;
}

export interface SeedCartDocument {
  id: string;
  /** Authenticated user ID — mutually exclusive with guestId */
  userId?: string;
  /** Guest session ID — mutually exclusive with userId */
  guestId?: string;
  items: SeedCartItemDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export function makeCartItem(
  overrides: Partial<SeedCartItemDocument> = {},
): SeedCartItemDocument {
  return {
    productId: overrides.productId ?? "product-1",
    quantity: overrides.quantity ?? 1,
    price: overrides.price ?? 100,
    ...overrides,
  };
}

export function makeCart(
  overrides: Partial<SeedCartDocument> = {},
): SeedCartDocument {
  const n = _seq++;
  const now = new Date();
  return {
    id: overrides.id ?? `cart-${n}`,
    userId: overrides.userId ?? `user-${n}`,
    items: overrides.items ?? [makeCartItem()],
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    ...overrides,
  };
}

export function makeFullCart(
  overrides: Partial<SeedCartDocument> = {},
): SeedCartDocument {
  return makeCart({
    items: [
      makeCartItem({ productId: "product-1", quantity: 2, price: 299, storeId: "store-1", sellerId: "seller-1" }),
      makeCartItem({ productId: "product-2", quantity: 1, price: 499, storeId: "store-1", sellerId: "seller-1" }),
    ],
    ...overrides,
  });
}

export const CART_FIXTURES = {
  single: makeCart({ id: "cart-buyer-1", userId: "buyer-user-1" }),
  multi: makeFullCart({ id: "cart-buyer-2", userId: "buyer-user-1" }),
};
