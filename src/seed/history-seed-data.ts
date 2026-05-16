/**
 * History Seed Data — one document per user at top-level `history/history-{userSlug}`.
 *
 * id === slug === `history-{userSlug}`. items[] FIFO-capped at HISTORY_MAX (50),
 * newest-first (viewedAt desc). Re-visit semantics: dedup by productId, max viewedAt wins.
 */

export interface HistoryItemSeed {
  productId: string;
  productType: "product" | "auction" | "preorder";
  viewedAt: Date;
}

export interface HistorySeedDocument {
  /** doc id === slug === `history-{userId}` */
  id: string;
  userId: string;
  items: HistoryItemSeed[];
  updatedAt: Date;
}

const NOW = new Date();
const hoursAgo = (n: number) => new Date(NOW.getTime() - n * 3_600_000);
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

function makeDoc(userId: string, items: HistoryItemSeed[]): HistorySeedDocument {
  const sorted = [...items].sort(
    (a, b) => b.viewedAt.getTime() - a.viewedAt.getTime(),
  );
  return {
    id: `history-${userId}`,
    userId,
    items: sorted,
    updatedAt: sorted[0]?.viewedAt ?? NOW,
  };
}

export const historySeedData: HistorySeedDocument[] = [
  makeDoc("user-rahul-sharma", [
    { productId: "product-pokemon-sv-etb", productType: "product", viewedAt: hoursAgo(2) },
    { productId: "auction-pokemon-charizard-base1-psa9", productType: "auction", viewedAt: hoursAgo(6) },
    { productId: "product-vintage-pokemon-charizard-base-lp", productType: "product", viewedAt: hoursAgo(20) },
    { productId: "product-pokemon-151-booster-box", productType: "product", viewedAt: daysAgo(1) },
    { productId: "preorder-pokemon-prismatic-evolutions", productType: "preorder", viewedAt: daysAgo(2) },
  ]),
  makeDoc("user-priya-patel", [
    { productId: "product-hot-wheels-redline-1969-camaro", productType: "product", viewedAt: hoursAgo(1) },
    { productId: "auction-hot-wheels-redline-camaro-pink", productType: "auction", viewedAt: hoursAgo(8) },
    { productId: "product-hot-wheels-rlc-bone-shaker", productType: "product", viewedAt: daysAgo(1) },
    { productId: "product-vintage-hot-wheels-deora-1968", productType: "product", viewedAt: daysAgo(3) },
  ]),
  makeDoc("user-arjun-singh", [
    { productId: "product-beyblade-x-bx01-dran-sword", productType: "product", viewedAt: hoursAgo(3) },
    { productId: "product-beyblade-burst-b200-valkyrie", productType: "product", viewedAt: hoursAgo(12) },
    { productId: "preorder-beyblade-x-bx10-booster", productType: "preorder", viewedAt: daysAgo(2) },
  ]),
  makeDoc("user-meera-nair", [
    { productId: "product-shf-goku-ultra-instinct", productType: "product", viewedAt: hoursAgo(4) },
    { productId: "product-nendoroid-rem-rezero", productType: "product", viewedAt: hoursAgo(18) },
    { productId: "product-gsc-racing-miku-2023", productType: "product", viewedAt: daysAgo(1) },
    { productId: "preorder-shf-broly-super-hero", productType: "preorder", viewedAt: daysAgo(3) },
  ]),
  makeDoc("user-kavya-iyer", [
    { productId: "product-gundam-rx78-mg", productType: "product", viewedAt: hoursAgo(2) },
    { productId: "product-gundam-wing-zero-rg", productType: "product", viewedAt: hoursAgo(10) },
    { productId: "preorder-gundam-pg-unicorn-ver15", productType: "preorder", viewedAt: daysAgo(2) },
  ]),
  makeDoc("user-sneha-kumar", [
    { productId: "product-yugioh-25th-tin", productType: "product", viewedAt: hoursAgo(5) },
    { productId: "product-pokemon-151-booster-box", productType: "product", viewedAt: daysAgo(1) },
  ]),
  makeDoc("user-kartik-nair", [
    { productId: "product-vintage-hot-wheels-deora-1968", productType: "product", viewedAt: hoursAgo(7) },
    { productId: "product-vintage-motu-he-man-1982", productType: "product", viewedAt: daysAgo(1) },
  ]),
  makeDoc("user-divya-menon", [
    { productId: "preorder-beyblade-x-bx10-booster", productType: "preorder", viewedAt: hoursAgo(3) },
    { productId: "preorder-shf-broly-super-hero", productType: "preorder", viewedAt: hoursAgo(20) },
  ]),
  // Admin browses across all stores to review inventory + check recent purchases
  makeDoc("user-admin-letitrip", [
    { productId: "product-gsc-aqua-konosuba-scale",       productType: "product",  viewedAt: hoursAgo(1) },
    { productId: "auction-pokemon-mew-1st-edition-psa10", productType: "auction",  viewedAt: hoursAgo(4) },
    { productId: "product-mafex-miles-morales-spiderman", productType: "product",  viewedAt: hoursAgo(10) },
    { productId: "product-figma-link-totk",               productType: "product",  viewedAt: hoursAgo(18) },
    { productId: "product-pokemon-151-booster-box",       productType: "product",  viewedAt: daysAgo(1) },
    { productId: "product-yugioh-25th-tin",               productType: "product",  viewedAt: daysAgo(2) },
    { productId: "product-beyblade-x-bx04-knight-shield", productType: "product",  viewedAt: daysAgo(3) },
    { productId: "product-hot-wheels-rlc-bone-shaker",    productType: "product",  viewedAt: daysAgo(4) },
    { productId: "product-gundam-rx78-mg",                productType: "product",  viewedAt: daysAgo(5) },
    { productId: "preorder-pokemon-prismatic-evolutions", productType: "preorder", viewedAt: daysAgo(6) },
  ]),
];
