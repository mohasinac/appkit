/**
 * Wishlist Seed Data — one document per user at top-level `wishlists/wishlist-{userSlug}`.
 *
 * id === slug === `wishlist-{userSlug}`. userSlug === user.uid (per users-seed-data.ts).
 * items[] capped at WISHLIST_MAX (20). Stored newest-first (addedAt desc).
 * All userId + productId values verified against users-seed-data.ts and
 * products-standard-seed-data.ts / products-auctions-seed-data.ts / products-preorders-seed-data.ts.
 */

export interface WishlistItemSeed {
  productId: string;
  productType: "product" | "auction" | "preorder";
  addedAt: Date;
}

export interface WishlistSeedDocument {
  /** doc id === slug === `wishlist-{userId}` */
  id: string;
  userId: string;
  items: WishlistItemSeed[];
  updatedAt: Date;
}

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

function makeDoc(userId: string, items: WishlistItemSeed[]): WishlistSeedDocument {
  // Sort newest-first to match runtime invariant
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
  makeDoc("user-rahul-sharma", [
    { productId: "product-pokemon-sv-etb", productType: "product", addedAt: daysAgo(10) },
    { productId: "product-vintage-pokemon-charizard-base-lp", productType: "product", addedAt: daysAgo(7) },
    { productId: "auction-pokemon-charizard-base1-psa9", productType: "auction", addedAt: daysAgo(5) },
  ]),
  makeDoc("user-priya-patel", [
    { productId: "product-hot-wheels-redline-1969-camaro", productType: "product", addedAt: daysAgo(12) },
    { productId: "product-hot-wheels-rlc-bone-shaker", productType: "product", addedAt: daysAgo(8) },
    { productId: "auction-hot-wheels-redline-camaro-pink", productType: "auction", addedAt: daysAgo(3) },
  ]),
  makeDoc("user-arjun-singh", [
    { productId: "product-beyblade-x-bx01-dran-sword", productType: "product", addedAt: daysAgo(6) },
    { productId: "product-beyblade-burst-b200-valkyrie", productType: "product", addedAt: daysAgo(4) },
  ]),
  makeDoc("user-meera-nair", [
    { productId: "product-shf-goku-ultra-instinct", productType: "product", addedAt: daysAgo(9) },
    { productId: "product-nendoroid-rem-rezero", productType: "product", addedAt: daysAgo(5) },
    { productId: "product-gsc-racing-miku-2023", productType: "product", addedAt: daysAgo(2) },
  ]),
  makeDoc("user-kavya-iyer", [
    { productId: "product-gundam-rx78-mg", productType: "product", addedAt: daysAgo(14) },
    { productId: "product-gundam-wing-zero-rg", productType: "product", addedAt: daysAgo(9) },
    { productId: "preorder-gundam-pg-unicorn-ver15", productType: "preorder", addedAt: daysAgo(4) },
  ]),
  makeDoc("user-sneha-kumar", [
    { productId: "product-yugioh-25th-tin", productType: "product", addedAt: daysAgo(11) },
    { productId: "product-pokemon-151-booster-box", productType: "product", addedAt: daysAgo(6) },
  ]),
  makeDoc("user-kartik-nair", [
    { productId: "product-vintage-hot-wheels-deora-1968", productType: "product", addedAt: daysAgo(13) },
    { productId: "product-vintage-motu-he-man-1982", productType: "product", addedAt: daysAgo(7) },
  ]),
  makeDoc("user-divya-menon", [
    { productId: "preorder-beyblade-x-bx10-booster", productType: "preorder", addedAt: daysAgo(3) },
    { productId: "preorder-shf-broly-super-hero", productType: "preorder", addedAt: daysAgo(1) },
  ]),
];
