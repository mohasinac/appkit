/*
 * WHY: Seeds purchase orders representing completed transactions across Beyblade marketplace buyers and sellers.
 * WHAT: Exports 50 orders across 3 buyer/store combos. All statuses distributed. Order IDs: order-{itemCount}-{YYYYMMDD}-{rand6}.
 *
 * EXPORTS:
 *   ordersSeedData — Array of 50 order documents with full transactional metadata
 *
 * @tag domain:orders,checkout
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import type { OrderDocument } from "../features/orders/schemas/firestore";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

// Deterministic 6-char base36 suffix derived from a seed string — replaces the
// previous Math.random() suffix, which regenerated a fresh id on every module
// import (every `load`/`status`/`delete` CLI invocation), so re-running `load`
// never actually updated existing docs and `status`/`delete` could never find
// what a previous `load` had written. A simple string hash keeps ids stable
// across runs on the same day while remaining unique per (itemCount, daysBack, seed).
function seededSuffix(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0;
  }
  // Force unsigned before base36 so the suffix is always 6 lowercase alnum chars.
  return (hash >>> 0).toString(36).padStart(6, "0").slice(0, 6);
}

const generateOrderId = (itemCount: number, daysBack: number, seed: string): string => {
  const date = new Date(NOW.getTime() - daysBack * 86_400_000);
  const yyyymmdd = date.toISOString().split("T")[0].replace(/-/g, "");
  const rand = seededSuffix(`${itemCount}-${daysBack}-${seed}`);
  return `order-${itemCount}-${yyyymmdd}-${rand}`;
};

const USER_NAMES: Record<string, string> = {
  "user-yugi-muto": "Rehan Sheikh",
  "user-admin-letitrip": "LetItRip Admin",
  "user-seto-kaiba": "Vivaan Kapoor",
};

const USER_EMAILS: Record<string, string> = {
  "user-yugi-muto": "rehan.sheikh@gmail.com",
  "user-admin-letitrip": "admin@letitrip.in",
  "user-seto-kaiba": "vivaan.kapoor@gmail.com",
};

const _rawOrdersSeedData: Partial<OrderDocument>[] = [
  // ────────────────────────────────────────────────────────────────────────────
  // Rehan buying from Beyblade Arena — 4 explicit orders
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: generateOrderId(2, 45, "yugi-dranzer-pegasus"),
    productId: "product-beyblade-original-dranzer-s",
    productTitle: "Beyblade Original Dranzer S",
    userId: "user-yugi-muto",
    userName: "Rehan Sheikh",
    userEmail: "rehan.sheikh@gmail.com",
    storeId: "store-beyblade-arena",
    items: [
      {
        productId: "product-beyblade-original-dranzer-s",
        productTitle: "Beyblade Original Dranzer S",
        listingType: "standard",
        quantity: 1,
        unitPrice: 1799,
        totalPrice: 1799,
      },
      {
        productId: "product-beyblade-metal-storm-pegasus",
        productTitle: "Beyblade Metal Storm Pegasus",
        listingType: "standard",
        quantity: 1,
        unitPrice: 2499,
        totalPrice: 2499,
      },
    ],
    quantity: 2,
    unitPrice: 1799,
    totalPrice: 4298,
    currency: "INR",
    status: "delivered",
    paymentStatus: "paid",
    paymentMethod: "cash",
    paymentId: "pay-yugi-kaiba-001",
    shippingAddress: "addr-yugi-home",
    trackingNumber: "IN-0001-ARENA-DELIVERED",
    shippingCarrier: "India Post",
    shippingDate: daysAgo(30),
    deliveryDate: daysAgo(20),
    orderDate: daysAgo(45),
    createdAt: daysAgo(45),
    updatedAt: daysAgo(20),
  },
  {
    id: generateOrderId(1, 40, "yugi-metal-flame-sagittario"),
    productId: "product-beyblade-metal-flame-sagittario",
    productTitle: "Beyblade Metal Flame Sagittario",
    userId: "user-yugi-muto",
    userName: "Rehan Sheikh",
    userEmail: "rehan.sheikh@gmail.com",
    storeId: "store-beyblade-arena",
    quantity: 1,
    unitPrice: 2299,
    totalPrice: 2299,
    currency: "INR",
    status: "shipped",
    paymentStatus: "paid",
    paymentMethod: "cash",
    paymentId: "pay-yugi-kaiba-002",
    shippingAddress: "addr-yugi-home",
    trackingNumber: "IN-0002-ARENA-SHIPPED",
    shippingCarrier: "India Post",
    shippingDate: daysAgo(8),
    orderDate: daysAgo(40),
    createdAt: daysAgo(40),
    updatedAt: daysAgo(8),
  },
  {
    id: generateOrderId(3, 35, "yugi-x-bx08-wave"),
    productId: "preorder-beyblade-x-bx-08-wave",
    productTitle: "Beyblade X BX-08 Wave",
    userId: "user-yugi-muto",
    userName: "Rehan Sheikh",
    userEmail: "rehan.sheikh@gmail.com",
    storeId: "store-beyblade-arena",
    quantity: 3,
    unitPrice: 899,
    totalPrice: 2697,
    currency: "INR",
    status: "processing",
    paymentStatus: "paid",
    paymentMethod: "cash",
    paymentId: "pay-yugi-kaiba-003",
    shippingAddress: "addr-yugi-home",
    orderDate: daysAgo(35),
    createdAt: daysAgo(35),
    updatedAt: daysAgo(2),
  },
  {
    id: generateOrderId(1, 30, "yugi-burst-valkyrie"),
    productId: "product-beyblade-burst-valkyrie",
    productTitle: "Beyblade Burst Valkyrie",
    userId: "user-yugi-muto",
    userName: "Rehan Sheikh",
    userEmail: "rehan.sheikh@gmail.com",
    storeId: "store-beyblade-arena",
    quantity: 1,
    unitPrice: 1899,
    totalPrice: 1899,
    currency: "INR",
    status: "pending",
    paymentStatus: "pending",
    paymentMethod: "cash",
    paymentId: "pay-yugi-kaiba-004",
    shippingAddress: "addr-yugi-home",
    orderDate: daysAgo(30),
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Rehan buying from LetItRip Official
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: generateOrderId(1, 28, "yugi-mystery-box"),
    productId: "prizedraw-beyblade-mystery-box",
    productTitle: "Beyblade Mystery Box",
    userId: "user-yugi-muto",
    userName: "Rehan Sheikh",
    userEmail: "rehan.sheikh@gmail.com",
    storeId: "store-letitrip-official",
    quantity: 1,
    unitPrice: 499,
    totalPrice: 499,
    currency: "INR",
    status: "delivered",
    paymentStatus: "paid",
    paymentMethod: "cash",
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
  // Admin buying from Beyblade Arena
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: generateOrderId(1, 50, "admin-x-knife-shinobi"),
    productId: "product-beyblade-x-knife-shinobi",
    productTitle: "Beyblade X Knife Shinobi",
    userId: "user-admin-letitrip",
    userName: "LetItRip Admin",
    userEmail: "admin@letitrip.in",
    storeId: "store-beyblade-arena",
    quantity: 1,
    unitPrice: 2999,
    totalPrice: 2999,
    currency: "INR",
    status: "delivered",
    paymentStatus: "paid",
    paymentMethod: "cash",
    paymentId: "pay-admin-kaiba-001",
    shippingAddress: "addr-letitrip-hq",
    trackingNumber: "IN-0010-ARENA-DELIVERED",
    shippingCarrier: "DHL India",
    shippingDate: daysAgo(40),
    deliveryDate: daysAgo(30),
    orderDate: daysAgo(50),
    createdAt: daysAgo(50),
    updatedAt: daysAgo(30),
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Vivaan buying from Beyblade Arena
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: generateOrderId(1, 55, "kaiba-driger-v"),
    productId: "product-beyblade-original-driger-v",
    productTitle: "Beyblade Original Driger V",
    userId: "user-seto-kaiba",
    userName: "Vivaan Kapoor",
    userEmail: "vivaan.kapoor@gmail.com",
    storeId: "store-beyblade-arena",
    quantity: 1,
    unitPrice: 1999,
    totalPrice: 1999,
    currency: "INR",
    status: "delivered",
    paymentStatus: "paid",
    paymentMethod: "cash",
    paymentId: "pay-kaiba-admin-001",
    shippingAddress: "addr-kaiba-mansion",
    trackingNumber: "IN-0005-ARENA-DELIVERED",
    shippingCarrier: "India Post",
    shippingDate: daysAgo(12),
    deliveryDate: daysAgo(5),
    orderDate: daysAgo(55),
    createdAt: daysAgo(55),
    updatedAt: daysAgo(5),
  },
];

const productPool = [
  { productId: "product-beyblade-original-dranzer-s", productTitle: "Beyblade Original Dranzer S", unitPrice: 1799 },
  { productId: "product-beyblade-original-driger-v", productTitle: "Beyblade Original Driger V", unitPrice: 1999 },
  { productId: "product-beyblade-metal-storm-pegasus", productTitle: "Beyblade Metal Storm Pegasus", unitPrice: 2499 },
  { productId: "product-beyblade-metal-flame-sagittario", productTitle: "Beyblade Metal Flame Sagittario", unitPrice: 2299 },
  { productId: "product-beyblade-burst-valkyrie", productTitle: "Beyblade Burst Valkyrie", unitPrice: 1899 },
  { productId: "product-beyblade-burst-regalia-genesis", productTitle: "Beyblade Burst Regalia Genesis", unitPrice: 3499 },
  { productId: "product-beyblade-x-wizard-arrow", productTitle: "Beyblade X Wizard Arrow", unitPrice: 1699 },
  { productId: "product-beyblade-x-knife-shinobi", productTitle: "Beyblade X Knife Shinobi", unitPrice: 2999 },
];

const statuses = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "return_requested",
  "returned",
] as const;

const paymentStatuses: Record<string, string> = {
  pending: "pending",
  confirmed: "paid",
  processing: "processing",
  shipped: "paid",
  delivered: "paid",
  cancelled: "refunded",
  refunded: "refunded",
  return_requested: "paid",
  returned: "refunded",
};

const buyerStoreMatrix = [
  { userId: "user-yugi-muto", storeId: "store-beyblade-arena", addressId: "addr-yugi-home" },
  { userId: "user-yugi-muto", storeId: "store-letitrip-official", addressId: "addr-yugi-home" },
  { userId: "user-admin-letitrip", storeId: "store-beyblade-arena", addressId: "addr-letitrip-hq" },
  { userId: "user-seto-kaiba", storeId: "store-beyblade-arena", addressId: "addr-kaiba-mansion" },
];

const expandedOrders: Partial<OrderDocument>[] = [];
for (let i = _rawOrdersSeedData.length; i < 50; i++) {
  const combo = buyerStoreMatrix[i % buyerStoreMatrix.length];
  const product = productPool[i % productPool.length];
  const status = statuses[i % statuses.length];
  const daysBack = 70 - i;
  const qty = (i % 3) + 1;

  expandedOrders.push({
    id: generateOrderId(qty, daysBack, `${combo.userId}-${product.productId}-${i}`),
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
    paymentMethod: "cash",
    shippingAddress: combo.addressId,
    orderDate: daysAgo(daysBack),
    shippingDate: status === "shipped" || status === "delivered" ? daysAgo(daysBack - 5) : undefined,
    deliveryDate: status === "delivered" ? daysAgo(daysBack - 10) : undefined,
    createdAt: daysAgo(daysBack),
    updatedAt: daysAgo(Math.max(0, daysBack - 10)),
  });
}

// P-1 MVP: two cash/UPI manual payment orders for demo purposes.
// cashOrderPendingProof: buyer submitted proof, admin has NOT yet verified.
const cashOrderPendingProof: Partial<OrderDocument> = {
  id: "order-1-20260729-cash01",
  productId: "product-beyblade-original-dranzer-s",
  productTitle: "Beyblade Original Dranzer S",
  userId: "user-yugi-muto",
  userName: "Rehan Sheikh",
  userEmail: "rehan.sheikh@gmail.com",
  storeId: "store-beyblade-arena",
  quantity: 1,
  unitPrice: 1799,
  totalPrice: 1799,
  currency: "INR",
  status: "pending",
  paymentStatus: "pending",
  paymentMethod: "cash",
  paymentProofUrl: "/media/payment-proof-demo-pending.jpg",
  paymentTransactionId: "UPI-DEMO-20260728-PROOF",
  paymentProofMimeType: "image/jpeg",
  paymentProofUploadedAt: daysAgo(1),
  shippingAddress: "addr-yugi-home",
  orderDate: daysAgo(2),
  createdAt: daysAgo(2),
  updatedAt: daysAgo(1),
};

const cashOrderVerified: Partial<OrderDocument> = {
  id: "order-1-20260729-cash02",
  productId: "product-beyblade-metal-storm-pegasus",
  productTitle: "Beyblade Metal Storm Pegasus",
  userId: "user-yugi-muto",
  userName: "Rehan Sheikh",
  userEmail: "rehan.sheikh@gmail.com",
  storeId: "store-beyblade-arena",
  quantity: 1,
  unitPrice: 2499,
  totalPrice: 2499,
  currency: "INR",
  status: "processing",
  paymentStatus: "paid",
  paymentMethod: "cash",
  paymentProofUrl: "/media/payment-proof-demo-verified.jpg",
  paymentTransactionId: "UPI-DEMO-20260727-YUGI",
  paymentProofMimeType: "image/jpeg",
  paymentProofUploadedAt: daysAgo(3),
  shippingAddress: "addr-yugi-home",
  orderDate: daysAgo(4),
  createdAt: daysAgo(4),
  updatedAt: daysAgo(2),
};

export const ordersSeedData = [
  cashOrderPendingProof,
  cashOrderVerified,
  ...[..._rawOrdersSeedData, ...expandedOrders].slice(0, 48),
] as OrderDocument[];
