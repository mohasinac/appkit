/*
 * WHY: Seeds wishlists for the Beyblade marketplace — one doc per user, max 20 items, newest-first.
 * WHAT: 3 wishlists (Rehan 8 items, Vivaan 5 items, Admin 4 items). All productIds reference the real Beyblade seed products.
 *
 * EXPORTS:
 *   wishlistsSeedData — Array of WishlistSeedDocument for seed runner
 *
 * @tag domain:wishlist
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

export interface WishlistItemSeed {
  productId: string;
  productType: "product" | "auction" | "preorder";
  addedAt: Date;
}

export interface WishlistSeedDocument {
  id: string;
  userId: string;
  items: WishlistItemSeed[];
  updatedAt: Date;
}

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

function makeDoc(userId: string, items: WishlistItemSeed[]): WishlistSeedDocument {
  const sorted = [...items].sort(
    (a, b) => b.addedAt.getTime() - a.addedAt.getTime(),
  );
  const latest = sorted[0]?.addedAt ?? NOW;
  return {
    id: `wishlist-${userId}`,
    userId,
    items: sorted,
    updatedAt: latest,
  };
}

export const wishlistsSeedData: WishlistSeedDocument[] = [
  // Rehan: 8 items — mix of standard + auctions from Beyblade Arena
  makeDoc("user-yugi-muto", [
    { productId: "product-beyblade-original-dranzer-s", productType: "product", addedAt: daysAgo(14) },
    { productId: "product-beyblade-original-driger-v", productType: "product", addedAt: daysAgo(12) },
    { productId: "product-beyblade-metal-flame-sagittario", productType: "product", addedAt: daysAgo(10) },
    { productId: "auction-beyblade-original-dragoon-storm", productType: "auction", addedAt: daysAgo(8) },
    { productId: "product-beyblade-burst-valkyrie", productType: "product", addedAt: daysAgo(6) },
    { productId: "product-beyblade-metal-storm-pegasus", productType: "product", addedAt: daysAgo(4) },
    { productId: "auction-beyblade-metal-lightning-l-drago", productType: "auction", addedAt: daysAgo(3) },
    { productId: "preorder-beyblade-x-bx-08-wave", productType: "preorder", addedAt: daysAgo(1) },
  ]),

  // Vivaan: 5 items from Beyblade Arena (Vivaan as buyer)
  makeDoc("user-seto-kaiba", [
    { productId: "product-beyblade-x-wizard-arrow", productType: "product", addedAt: daysAgo(10) },
    { productId: "product-beyblade-x-knife-shinobi", productType: "product", addedAt: daysAgo(7) },
    { productId: "classified-beyblade-stadium-set", productType: "product", addedAt: daysAgo(5) },
    { productId: "digitalcode-beyblade-x-app-unlock", productType: "product", addedAt: daysAgo(3) },
    { productId: "product-beyblade-burst-regalia-genesis", productType: "product", addedAt: daysAgo(1) },
  ]),

  // Admin: 4 items — mix from Beyblade Arena (Admin as buyer)
  makeDoc("user-admin-letitrip", [
    { productId: "product-beyblade-metal-storm-pegasus", productType: "product", addedAt: daysAgo(20) },
    { productId: "auction-beyblade-original-dragoon-storm", productType: "auction", addedAt: daysAgo(15) },
    { productId: "product-beyblade-burst-valkyrie", productType: "product", addedAt: daysAgo(8) },
    { productId: "preorder-beyblade-x-bx-08-wave", productType: "preorder", addedAt: daysAgo(2) },
  ]),
];
