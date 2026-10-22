/*
 * WHY: Wishlists — one doc per user, max 20 items, newest-first.
 * WHAT: 1 doc (Admin), the only one live. Rehan's and Vivaan's were removed.
 *
 * 🛑 PRUNED TO MATCH LIVE, 2026-10-22 — the second pass, which caught what the
 * first missed. The rows here were GENERATED (a `.push()` loop, a spread of a
 * generator call, or a factory call with a template-literal id), so a static
 * scan of the array literal read `0` while the loader wrote dozens. The only
 * authority on what a load writes is `npx appkit-seed load --dry-run`.
 *
 * Consequence, recorded rather than left to be discovered: tester cases that
 * acted on this data can now only report "could not test".
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


  // Admin: 4 items — mix from Beyblade Arena (Admin as buyer)
  makeDoc("user-admin-letitrip", [
    { productId: "product-beyblade-metal-storm-pegasus", productType: "product", addedAt: daysAgo(20) },
    { productId: "auction-beyblade-original-dragoon-storm", productType: "auction", addedAt: daysAgo(15) },
    { productId: "product-beyblade-burst-valkyrie", productType: "product", addedAt: daysAgo(8) },
    { productId: "preorder-beyblade-x-bx-08-wave", productType: "preorder", addedAt: daysAgo(2) },
  ]),
  // Removed 2026-10-22: Vivaan's and Yugi's wishlists — neither is live.
  // Only `wishlist-user-admin-letitrip` exists, so only it is seeded.
];
