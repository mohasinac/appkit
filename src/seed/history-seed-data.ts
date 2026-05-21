/*
 * WHY: Seeds browse history for YGO marketplace — one doc per user, FIFO-capped at 50, newest-first.
 * WHAT: 3 history docs (Yugi 15 items, Kaiba 8 items, Admin 10 items). All productIds reference YGO seed products.
 *
 * EXPORTS:
 *   historySeedData — Array of HistorySeedDocument for seed runner
 *
 * @tag domain:history
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

export interface HistoryItemSeed {
  productId: string;
  productType: "product" | "auction" | "preorder";
  viewedAt: Date;
}

export interface HistorySeedDocument {
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
  // Yugi: 15 recently viewed — mix of all listing types from Kaiba's store
  makeDoc("user-yugi-muto", [
    { productId: "product-dark-magician-lob-1st", productType: "product", viewedAt: hoursAgo(1) },
    { productId: "product-dark-magician-girl-ioc", productType: "product", viewedAt: hoursAgo(2) },
    { productId: "auction-blue-eyes-lob-1st-psa10", productType: "auction", viewedAt: hoursAgo(4) },
    { productId: "product-monster-reborn-lob", productType: "product", viewedAt: hoursAgo(6) },
    { productId: "product-pot-of-greed-lob", productType: "product", viewedAt: hoursAgo(8) },
    { productId: "product-kuriboh-mrd", productType: "product", viewedAt: hoursAgo(12) },
    { productId: "product-mirror-force-mrd", productType: "product", viewedAt: hoursAgo(18) },
    { productId: "product-lob-booster-pack", productType: "product", viewedAt: daysAgo(1) },
    { productId: "product-yugi-starter-deck", productType: "product", viewedAt: daysAgo(1) },
    { productId: "auction-dark-magician-girl-psa9", productType: "auction", viewedAt: daysAgo(2) },
    { productId: "preorder-25th-anniversary-lob", productType: "preorder", viewedAt: daysAgo(2) },
    { productId: "product-black-luster-soldier", productType: "product", viewedAt: daysAgo(3) },
    { productId: "product-chaos-emperor-dragon", productType: "product", viewedAt: daysAgo(4) },
    { productId: "product-elemental-hero-neos", productType: "product", viewedAt: daysAgo(5) },
    { productId: "product-cyber-dragon-dp1", productType: "product", viewedAt: daysAgo(6) },
  ]),

  // Kaiba: 8 recently viewed — browsing LetItRip Official products
  makeDoc("user-seto-kaiba", [
    { productId: "product-duelist-kingdom-playmat", productType: "product", viewedAt: hoursAgo(2) },
    { productId: "product-egyptian-gods-playmat", productType: "product", viewedAt: hoursAgo(5) },
    { productId: "product-duel-disk-replica", productType: "product", viewedAt: hoursAgo(10) },
    { productId: "product-millennium-puzzle-model", productType: "product", viewedAt: daysAgo(1) },
    { productId: "product-kaiba-figure-15cm", productType: "product", viewedAt: daysAgo(1) },
    { productId: "product-dark-magician-figure", productType: "product", viewedAt: daysAgo(2) },
    { productId: "product-yugi-plush-20cm", productType: "product", viewedAt: daysAgo(3) },
    { productId: "product-exodia-art-print", productType: "product", viewedAt: daysAgo(4) },
  ]),

  // Admin: 10 recently viewed — browsing Kaiba's store to review inventory
  makeDoc("user-admin-letitrip", [
    { productId: "product-blue-eyes-white-dragon-sdk", productType: "product", viewedAt: hoursAgo(1) },
    { productId: "auction-exodia-complete-set-psa9", productType: "auction", viewedAt: hoursAgo(3) },
    { productId: "product-raigeki-lob", productType: "product", viewedAt: hoursAgo(6) },
    { productId: "product-change-of-heart-mrd", productType: "product", viewedAt: hoursAgo(12) },
    { productId: "product-potd-booster-box", productType: "product", viewedAt: daysAgo(1) },
    { productId: "product-een-booster-box", productType: "product", viewedAt: daysAgo(1) },
    { productId: "product-jaden-yuki-starter", productType: "product", viewedAt: daysAgo(2) },
    { productId: "auction-mirror-force-mrd-1st-psa10", productType: "auction", viewedAt: daysAgo(3) },
    { productId: "preorder-gx-tournament-pack", productType: "preorder", viewedAt: daysAgo(4) },
    { productId: "product-rainbow-dragon", productType: "product", viewedAt: daysAgo(5) },
  ]),
];
