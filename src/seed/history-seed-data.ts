/*
 * WHY: Browse history — one doc per user, FIFO-capped at 50, newest-first.
 * WHAT: 2 docs (Rehan, Admin), both live. Vivaan's was removed.
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
 *   historySeedData — Array of HistorySeedDocument for seed runner
 *
 * @tag domain:history
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
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
  // Rehan: 15 recently viewed — mix of all listing types from Beyblade Arena
  makeDoc("user-yugi-muto", [
    { productId: "product-beyblade-original-dranzer-s", productType: "product", viewedAt: hoursAgo(1) },
    { productId: "product-beyblade-original-driger-v", productType: "product", viewedAt: hoursAgo(2) },
    { productId: "auction-beyblade-original-dragoon-storm", productType: "auction", viewedAt: hoursAgo(4) },
    { productId: "product-beyblade-metal-flame-sagittario", productType: "product", viewedAt: hoursAgo(6) },
    { productId: "product-beyblade-burst-valkyrie", productType: "product", viewedAt: hoursAgo(8) },
    { productId: "classified-beyblade-stadium-set", productType: "product", viewedAt: hoursAgo(12) },
    { productId: "product-beyblade-metal-storm-pegasus", productType: "product", viewedAt: hoursAgo(18) },
    { productId: "preorder-beyblade-x-bx-08-wave", productType: "preorder", viewedAt: daysAgo(1) },
    { productId: "digitalcode-beyblade-x-app-starter-pack", productType: "product", viewedAt: daysAgo(1) },
    { productId: "auction-beyblade-metal-lightning-l-drago", productType: "auction", viewedAt: daysAgo(2) },
    { productId: "randomlots-beyblade-mystery-box", productType: "preorder", viewedAt: daysAgo(2) },
    { productId: "product-beyblade-burst-regalia-genesis", productType: "product", viewedAt: daysAgo(3) },
    { productId: "product-beyblade-x-wizard-arrow", productType: "product", viewedAt: daysAgo(4) },
    { productId: "product-beyblade-x-knife-shinobi", productType: "product", viewedAt: daysAgo(5) },
    { productId: "product-beyblade-original-dranzer-s", productType: "product", viewedAt: daysAgo(6) },
  ]),


  // Admin: 10 recently viewed — browsing Beyblade Arena to review inventory
  makeDoc("user-admin-letitrip", [
    { productId: "product-beyblade-metal-storm-pegasus", productType: "product", viewedAt: hoursAgo(1) },
    { productId: "auction-beyblade-original-dragoon-storm", productType: "auction", viewedAt: hoursAgo(3) },
    { productId: "product-beyblade-x-knife-shinobi", productType: "product", viewedAt: hoursAgo(6) },
    { productId: "product-beyblade-burst-valkyrie", productType: "product", viewedAt: hoursAgo(12) },
    { productId: "randomlots-beyblade-mystery-box", productType: "preorder", viewedAt: daysAgo(1) },
    { productId: "product-beyblade-metal-flame-sagittario", productType: "product", viewedAt: daysAgo(1) },
    { productId: "product-beyblade-x-wizard-arrow", productType: "product", viewedAt: daysAgo(2) },
    { productId: "auction-beyblade-metal-lightning-l-drago", productType: "auction", viewedAt: daysAgo(3) },
    { productId: "preorder-beyblade-x-bx-08-wave", productType: "preorder", viewedAt: daysAgo(4) },
    { productId: "product-beyblade-original-dranzer-s", productType: "product", viewedAt: daysAgo(5) },
  ]),
  // Removed 2026-10-22: Vivaan's history (`user-seto-kaiba`) — not live.
  // The two that remain ARE live, so the seed still reproduces them.
];
