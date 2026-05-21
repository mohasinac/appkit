/*
 * WHY: Seeds purchase orders representing completed transactions across YGO marketplace buyers and sellers.
 * WHAT: Exports 50 orders across 3 buyer/store combos. All statuses distributed. Order IDs: order-{itemCount}-{YYYYMMDD}-{rand6}.
 *
 * EXPORTS:
 *   ordersSeedData — Array of 50 order documents with full transactional metadata
 *
 * @tag domain:orders,checkout
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import type { OrderDocument } from "../features/orders/schemas/firestore";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const generateOrderId = (itemCount: number, daysBack: number): string => {
  const date = new Date(NOW.getTime() - daysBack * 86_400_000);
  const yyyymmdd = date.toISOString().split("T")[0].replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 8);
  return `order-${itemCount}-${yyyymmdd}-${rand}`;
};

const USER_NAMES: Record<string, string> = {
  "user-yugi-muto": "Yugi Muto",
  "user-admin-letitrip": "LetItRip Admin",
  "user-seto-kaiba": "Seto Kaiba",
};

const USER_EMAILS: Record<string, string> = {
  "user-yugi-muto": "yugi@duelkingdom.in",
  "user-admin-letitrip": "admin@letitrip.in",
  "user-seto-kaiba": "kaiba@kaibalandmark.in",
};

const _rawOrdersSeedData: Partial<OrderDocument>[] = [
  // ────────────────────────────────────────────────────────────────────────────
  // Yugi buying from Kaiba — 4 explicit orders
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: generateOrderId(2, 45),
    productId: "product-dark-magician-lob-1st",
    productTitle: "Dark Magician — LOB 1st Edition",
    userId: "user-yugi-muto",
    userName: "Yugi Muto",
    userEmail: "yugi@duelkingdom.in",
    storeId: "store-kaiba-corp-cards",
    items: [
      {
        productId: "product-dark-magician-lob-1st",
        productTitle: "Dark Magician — LOB 1st Edition",
        listingType: "standard",
        quantity: 1,
        unitPrice: 499900,
        totalPrice: 499900,
      },
      {
        productId: "sublisting-dark-magician-lob-unlimited",
        productTitle: "Dark Magician — LOB Unlimited (NM)",
        listingType: "standard",
        quantity: 1,
        unitPrice: 299900,
        totalPrice: 299900,
      },
    ],
    quantity: 2,
    unitPrice: 499900,
    totalPrice: 799800,
    currency: "INR",
    status: "delivered",
    paymentStatus: "paid",
    paymentMethod: "cod",
    paymentId: "pay-yugi-kaiba-001",
    shippingAddress: "addr-yugi-home",
    trackingNumber: "JP-0001-KAIBA-DELIVERED",
    shippingCarrier: "Japan Post",
    shippingDate: daysAgo(30),
    deliveryDate: daysAgo(20),
    orderDate: daysAgo(45),
    createdAt: daysAgo(45),
    updatedAt: daysAgo(20),
  },
  {
    id: generateOrderId(1, 40),
    productId: "sublisting-blue-eyes-lob-1st-nm",
    productTitle: "Blue-Eyes White Dragon — LOB 1st Edition (NM)",
    userId: "user-yugi-muto",
    userName: "Yugi Muto",
    userEmail: "yugi@duelkingdom.in",
    storeId: "store-kaiba-corp-cards",
    quantity: 1,
    unitPrice: 799900,
    totalPrice: 799900,
    currency: "INR",
    status: "shipped",
    paymentStatus: "paid",
    paymentMethod: "online",
    paymentId: "pay-yugi-kaiba-002",
    shippingAddress: "addr-yugi-home",
    trackingNumber: "JP-0002-KAIBA-SHIPPED",
    shippingCarrier: "Japan Post",
    shippingDate: daysAgo(8),
    orderDate: daysAgo(40),
    createdAt: daysAgo(40),
    updatedAt: daysAgo(8),
  },
  {
    id: generateOrderId(3, 35),
    productId: "product-lob-booster-pack",
    productTitle: "LOB Booster Pack",
    userId: "user-yugi-muto",
    userName: "Yugi Muto",
    userEmail: "yugi@duelkingdom.in",
    storeId: "store-kaiba-corp-cards",
    quantity: 3,
    unitPrice: 149900,
    totalPrice: 449700,
    currency: "INR",
    status: "processing",
    paymentStatus: "paid",
    paymentMethod: "cod",
    paymentId: "pay-yugi-kaiba-003",
    shippingAddress: "addr-yugi-home",
    orderDate: daysAgo(35),
    createdAt: daysAgo(35),
    updatedAt: daysAgo(2),
  },
  {
    id: generateOrderId(1, 30),
    productId: "sublisting-pot-of-greed-lob-1st",
    productTitle: "Pot of Greed — LOB 1st Edition (NM)",
    userId: "user-yugi-muto",
    userName: "Yugi Muto",
    userEmail: "yugi@duelkingdom.in",
    storeId: "store-kaiba-corp-cards",
    quantity: 1,
    unitPrice: 1499900,
    totalPrice: 1499900,
    currency: "INR",
    status: "pending",
    paymentStatus: "pending",
    paymentMethod: "online",
    paymentId: "pay-yugi-kaiba-004",
    shippingAddress: "addr-yugi-home",
    orderDate: daysAgo(30),
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Yugi buying from LetItRip Official
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: generateOrderId(1, 28),
    productId: "product-duelist-kingdom-playmat",
    productTitle: "Duelist Kingdom Playmat",
    userId: "user-yugi-muto",
    userName: "Yugi Muto",
    userEmail: "yugi@duelkingdom.in",
    storeId: "store-letitrip-official",
    quantity: 1,
    unitPrice: 129900,
    totalPrice: 129900,
    currency: "INR",
    status: "delivered",
    paymentStatus: "paid",
    paymentMethod: "online",
    paymentId: "pay-yugi-admin-001",
    shippingAddress: "addr-yugi-home",
    trackingNumber: "IN-0001-ADMIN-DELIVERED",
    shippingCarrier: "India Post",
    shippingDate: daysAgo(15),
    deliveryDate: daysAgo(8),
    orderDate: daysAgo(28),
    createdAt: daysAgo(28),
    updatedAt: daysAgo(8),
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Admin buying from Kaiba
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: generateOrderId(1, 50),
    productId: "product-kaiba-starter-deck",
    productTitle: "Starter Deck: Kaiba",
    userId: "user-admin-letitrip",
    userName: "LetItRip Admin",
    userEmail: "admin@letitrip.in",
    storeId: "store-kaiba-corp-cards",
    quantity: 1,
    unitPrice: 199900,
    totalPrice: 199900,
    currency: "INR",
    status: "delivered",
    paymentStatus: "paid",
    paymentMethod: "online",
    paymentId: "pay-admin-kaiba-001",
    shippingAddress: "addr-letitrip-hq",
    trackingNumber: "JP-0010-KAIBA-DELIVERED",
    shippingCarrier: "DHL International",
    shippingDate: daysAgo(40),
    deliveryDate: daysAgo(30),
    orderDate: daysAgo(50),
    createdAt: daysAgo(50),
    updatedAt: daysAgo(30),
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Kaiba buying from LetItRip Official
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: generateOrderId(1, 55),
    productId: "product-millennium-puzzle-model",
    productTitle: "Millennium Puzzle Model Kit",
    userId: "user-seto-kaiba",
    userName: "Seto Kaiba",
    userEmail: "kaiba@kaibalandmark.in",
    storeId: "store-letitrip-official",
    quantity: 1,
    unitPrice: 329900,
    totalPrice: 329900,
    currency: "INR",
    status: "delivered",
    paymentStatus: "paid",
    paymentMethod: "online",
    paymentId: "pay-kaiba-admin-001",
    shippingAddress: "addr-kaiba-mansion",
    trackingNumber: "IN-0005-ADMIN-DELIVERED",
    shippingCarrier: "India Post",
    shippingDate: daysAgo(12),
    deliveryDate: daysAgo(5),
    orderDate: daysAgo(55),
    createdAt: daysAgo(55),
    updatedAt: daysAgo(5),
  },
];

const productPool = [
  { productId: "product-dark-magician-lob-1st", productTitle: "Dark Magician — LOB 1st Edition", unitPrice: 499900 },
  { productId: "sublisting-blue-eyes-lob-1st-nm", productTitle: "Blue-Eyes White Dragon — LOB 1st Edition (NM)", unitPrice: 799900 },
  { productId: "product-lob-booster-pack", productTitle: "LOB Booster Pack", unitPrice: 149900 },
  { productId: "product-kaiba-starter-deck", productTitle: "Starter Deck: Kaiba", unitPrice: 199900 },
  { productId: "product-duelist-kingdom-playmat", productTitle: "Duelist Kingdom Playmat", unitPrice: 129900 },
  { productId: "sublisting-pot-of-greed-lob-1st", productTitle: "Pot of Greed — LOB 1st Edition (NM)", unitPrice: 1499900 },
  { productId: "product-millennium-puzzle-model", productTitle: "Millennium Puzzle Model Kit", unitPrice: 329900 },
];

const statuses = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "return_requested",
] as const;

const paymentStatuses: Record<string, string> = {
  pending: "pending",
  processing: "processing",
  shipped: "paid",
  delivered: "paid",
  cancelled: "refunded",
  refunded: "refunded",
  return_requested: "paid",
};

const buyerStoreMatrix = [
  { userId: "user-yugi-muto", storeId: "store-kaiba-corp-cards", addressId: "addr-yugi-home" },
  { userId: "user-yugi-muto", storeId: "store-letitrip-official", addressId: "addr-yugi-home" },
  { userId: "user-admin-letitrip", storeId: "store-kaiba-corp-cards", addressId: "addr-letitrip-hq" },
  { userId: "user-seto-kaiba", storeId: "store-letitrip-official", addressId: "addr-kaiba-mansion" },
];

const expandedOrders: Partial<OrderDocument>[] = [];
for (let i = _rawOrdersSeedData.length; i < 50; i++) {
  const combo = buyerStoreMatrix[i % buyerStoreMatrix.length];
  const product = productPool[i % productPool.length];
  const status = statuses[i % statuses.length];
  const daysBack = 70 - i;
  const qty = (i % 3) + 1;

  expandedOrders.push({
    id: generateOrderId(qty, daysBack),
    productId: product.productId,
    productTitle: product.productTitle,
    userId: combo.userId,
    userName: USER_NAMES[combo.userId],
    userEmail: USER_EMAILS[combo.userId],
    storeId: combo.storeId,
    quantity: qty,
    unitPrice: product.unitPrice,
    totalPrice: product.unitPrice * qty,
    currency: "INR",
    status: status as any,
    paymentStatus: (paymentStatuses[status] ?? "pending") as any,
    paymentMethod: i % 2 === 0 ? "cod" : "online",
    shippingAddress: combo.addressId,
    orderDate: daysAgo(daysBack),
    shippingDate: status === "shipped" || status === "delivered" ? daysAgo(daysBack - 5) : undefined,
    deliveryDate: status === "delivered" ? daysAgo(daysBack - 10) : undefined,
    createdAt: daysAgo(daysBack),
    updatedAt: daysAgo(Math.max(0, daysBack - 10)),
  });
}

export const ordersSeedData = [..._rawOrdersSeedData, ...expandedOrders].slice(
  0,
  50
) as OrderDocument[];
