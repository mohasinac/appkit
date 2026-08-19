/*
 * WHY: Seeds browse history for the Beyblade marketplace — one doc per user, FIFO-capped at 50, newest-first.
 * WHAT: 3 history docs (Rehan 15 items, Vivaan 8 items, Admin 10 items). All productIds reference the real Beyblade seed products.
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
    { productId: "digitalcode-beyblade-x-app-unlock", productType: "product", viewedAt: daysAgo(1) },
    { productId: "auction-beyblade-metal-lightning-l-drago", productType: "auction", viewedAt: daysAgo(2) },
    { productId: "prizedraw-beyblade-mystery-box", productType: "preorder", viewedAt: daysAgo(2) },
    { productId: "product-beyblade-burst-regalia-genesis", productType: "product", viewedAt: daysAgo(3) },
    { productId: "product-beyblade-x-wizard-arrow", productType: "product", viewedAt: daysAgo(4) },
    { productId: "product-beyblade-x-knife-shinobi", productType: "product", viewedAt: daysAgo(5) },
    { productId: "product-beyblade-original-dranzer-s", productType: "product", viewedAt: daysAgo(6) },
  ]),

  // Vivaan: 8 recently viewed — browsing Beyblade Arena products
  makeDoc("user-seto-kaiba", [
    { productId: "product-beyblade-x-wizard-arrow", productType: "product", viewedAt: hoursAgo(2) },
    { productId: "product-beyblade-x-knife-shinobi", productType: "product", viewedAt: hoursAgo(5) },
    { productId: "classified-beyblade-stadium-set", productType: "product", viewedAt: hoursAgo(10) },
    { productId: "digitalcode-beyblade-x-app-unlock", productType: "product", viewedAt: daysAgo(1) },
    { productId: "product-beyblade-burst-regalia-genesis", productType: "product", viewedAt: daysAgo(1) },
    { productId: "product-beyblade-metal-storm-pegasus", productType: "product", viewedAt: daysAgo(2) },
    { productId: "product-beyblade-original-driger-v", productType: "product", viewedAt: daysAgo(3) },
    { productId: "product-beyblade-burst-valkyrie", productType: "product", viewedAt: daysAgo(4) },
  ]),

  // Admin: 10 recently viewed — browsing Beyblade Arena to review inventory
  makeDoc("user-admin-letitrip", [
    { productId: "product-beyblade-metal-storm-pegasus", productType: "product", viewedAt: hoursAgo(1) },
    { productId: "auction-beyblade-original-dragoon-storm", productType: "auction", viewedAt: hoursAgo(3) },
    { productId: "product-beyblade-x-knife-shinobi", productType: "product", viewedAt: hoursAgo(6) },
    { productId: "product-beyblade-burst-valkyrie", productType: "product", viewedAt: hoursAgo(12) },
    { productId: "prizedraw-beyblade-mystery-box", productType: "preorder", viewedAt: daysAgo(1) },
    { productId: "product-beyblade-metal-flame-sagittario", productType: "product", viewedAt: daysAgo(1) },
    { productId: "product-beyblade-x-wizard-arrow", productType: "product", viewedAt: daysAgo(2) },
    { productId: "auction-beyblade-metal-lightning-l-drago", productType: "auction", viewedAt: daysAgo(3) },
    { productId: "preorder-beyblade-x-bx-08-wave", productType: "preorder", viewedAt: daysAgo(4) },
    { productId: "product-beyblade-original-dranzer-s", productType: "product", viewedAt: daysAgo(5) },
  ]),
];
