/*
 * WHY: Seeds wishlists for YGO marketplace — one doc per user, max 20 items, newest-first.
 * WHAT: 3 wishlists (Yugi 8 items, Kaiba 5 items, Admin 4 items). All productIds reference YGO seed products.
 *
 * EXPORTS:
 *   wishlistsSeedData — Array of WishlistSeedDocument for seed runner
 *
 * @tag domain:wishlist
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
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
  // Yugi: 8 items — mix of standard + auctions from Kaiba's store
  makeDoc("user-yugi-muto", [
    { productId: "product-dark-magician-lob-1st", productType: "product", addedAt: daysAgo(14) },
    { productId: "product-dark-magician-girl-ioc", productType: "product", addedAt: daysAgo(12) },
    { productId: "product-black-luster-soldier", productType: "product", addedAt: daysAgo(10) },
    { productId: "auction-blue-eyes-lob-1st-psa10", productType: "auction", addedAt: daysAgo(8) },
    { productId: "product-monster-reborn-lob", productType: "product", addedAt: daysAgo(6) },
    { productId: "product-pot-of-greed-lob", productType: "product", addedAt: daysAgo(4) },
    { productId: "auction-dark-magician-girl-psa9", productType: "auction", addedAt: daysAgo(3) },
    { productId: "preorder-25th-anniversary-lob", productType: "preorder", addedAt: daysAgo(1) },
  ]),

  // Kaiba: 5 items from LetItRip Official (Kaiba as buyer)
  makeDoc("user-seto-kaiba", [
    { productId: "product-duelist-kingdom-playmat", productType: "product", addedAt: daysAgo(10) },
    { productId: "product-egyptian-gods-playmat", productType: "product", addedAt: daysAgo(7) },
    { productId: "product-duel-disk-replica", productType: "product", addedAt: daysAgo(5) },
    { productId: "product-millennium-puzzle-model", productType: "product", addedAt: daysAgo(3) },
    { productId: "product-kaiba-figure-15cm", productType: "product", addedAt: daysAgo(1) },
  ]),

  // Admin: 4 items — mix from Kaiba's store (Admin as buyer)
  makeDoc("user-admin-letitrip", [
    { productId: "product-chaos-emperor-dragon", productType: "product", addedAt: daysAgo(20) },
    { productId: "auction-exodia-complete-set-psa9", productType: "auction", addedAt: daysAgo(15) },
    { productId: "product-rainbow-dragon", productType: "product", addedAt: daysAgo(8) },
    { productId: "preorder-gx-tournament-pack", productType: "preorder", addedAt: daysAgo(2) },
  ]),
];
