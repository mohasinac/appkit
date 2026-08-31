/*
 * WHY: Seeds purchase orders representing completed transactions across Beyblade marketplace buyers and sellers.
 * WHAT: Exports 50 orders across 3 buyer/store combos. All statuses distributed. Order IDs: order-{itemCount}-{YYYYMMDD}-{rand6}.
 *
 * ## One fixture per acquisition path
 *
 * The six `acquisitionOrders` below exist so every branch of the
 * `OrderSourceContext` union has real data behind it. `orderType` has five
 * values and cannot separate a settled auction win from a buyout — both are
 * "auction" — which is exactly why `sourceContext` keys on its own
 * discriminator.
 *
 * Every FK in a `sourceContext` points at a real seeded document: the winning
 * bid, the buyout bid, the accepted offer. A provenance record pointing at
 * nothing is worse than none, because it reads as evidence (Root Cause #26).
 *
 * ## `statusHistory` is a DELTA log, never a snapshot
 *
 * Each entry records only the tracked fields that changed. Money is
 * deliberately absent: the final coupon and add-on state already lives on the
 * order document, and replaying pricing churn buries the handful of
 * transitions anyone actually reads. Refunds ARE here — a partial refund
 * changes no tracked field, so it is contributed explicitly.
 *
 * `actorUid` is the only identity an entry may carry. Never a name or an
 * email: `encryptPiiFields` never descends into arrays, so PII inside
 * `statusHistory` would be stored in plaintext.
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

import { withOrderSearchTxt } from "./_helpers/search-txt-wrappers";
import type { OrderDocument } from "../features/orders/schemas/firestore";
import type { StatusChangeEntry } from "../_internal/shared/history/index";
import { seedPhoto } from "./_helpers/media";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

// Deterministic per-product thumbnail — picsum.photos returns a stable image
// for any seed string, so this doesn't need to match the real product seed's
// own image, just be present and consistent across reseeds. Backfills the
// `image`/`imageUrls` fields real checkout orders only started carrying
// 2026-08-20 (see OrderDocumentItem.image), so seeded order fixtures show a
// thumbnail on My Orders / order-detail like real orders do.
function orderItemImage(productId: string): string {
  return seedPhoto(`order-item-${productId}`, 300, 300);
}

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
  "user-yugi-muto": "Mock User 3",
  "user-admin-letitrip": "Mock User 1",
  "user-seto-kaiba": "Mock User 2",
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
    userName: "Mock User 3",
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
    userName: "Mock User 3",
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
    userName: "Mock User 3",
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
    userName: "Mock User 3",
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
    userName: "Mock User 3",
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
    userName: "Mock User 1",
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
    userName: "Mock User 2",
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
  userName: "Mock User 3",
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
  userName: "Mock User 3",
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

// Backfills image/imageUrls (see orderItemImage() above) on every fixture
// regardless of which shape it uses (multi-item `items[]` vs the legacy
// single-item top-level fields), so no seeded order silently renders without
// a thumbnail the way real pre-2026-08-20 orders do.
function withOrderImages(order: Partial<OrderDocument>): Partial<OrderDocument> {
  return {
    ...order,
    imageUrls: order.imageUrls ?? (order.productId ? [orderItemImage(order.productId)] : undefined),
    items: order.items?.map((item) => ({
      ...item,
      image: item.image ?? orderItemImage(item.productId),
    })),
  };
}

/**
 * One history entry, in the same delta shape `withHistory()` writes at runtime,
 * so a seeded timeline and a real one render identically.
 */
function entry(
  at: Date,
  actorRole: StatusChangeEntry["actorRole"],
  trigger: string,
  changes: StatusChangeEntry["changes"],
  extra: { actorUid?: string; note?: string; reason?: string } = {},
): StatusChangeEntry {
  return { at, actorRole, trigger, changes, ...extra };
}

const BUYER_YUGI = "user-yugi-muto";
const BUYER_KAIBA = "user-seto-kaiba";
const BUYER_ADMIN = "user-admin-letitrip";
const ARENA = "store-beyblade-arena";

/**
 * Six orders, one per `OrderSourceContext` path.
 *
 * The two auction fixtures are the point of the set: they are the pair
 * `orderType` alone cannot tell apart.
 */
const acquisitionOrders: Partial<OrderDocument>[] = [
  // ── standard ──────────────────────────────────────────────────────────
  {
    id: "order-1-20260818-stdctx",
    productId: "product-beyblade-burst-valkyrie",
    productTitle: "Beyblade Burst B-01 Valkyrie",
    userId: BUYER_YUGI,
    userName: "Mock User 3",
    userEmail: "rehan.sheikh@gmail.com",
    storeId: ARENA,
    quantity: 1,
    unitPrice: 999,
    totalPrice: 999,
    currency: "INR",
    status: "delivered",
    paymentStatus: "paid",
    paymentMethod: "cash",
    orderType: "standard",
    shippingAddress: "addr-yugi-home",
    trackingNumber: "LIR-TRK-88213004",
    shippingCarrier: "Delhivery",
    orderDate: daysAgo(12),
    shippingDate: daysAgo(9),
    deliveryDate: daysAgo(6),
    createdAt: daysAgo(12),
    updatedAt: daysAgo(6),
    sourceContext: { path: "standard", listPrice: 999 },
    statusHistory: [
      entry(daysAgo(12), "buyer", "createCheckoutOrder", {
        status: { from: null, to: "pending" },
      }, { actorUid: BUYER_YUGI }),
      entry(daysAgo(11), "seller", "updateOrderStatus", {
        status: { from: "pending", to: "confirmed" },
        paymentStatus: { from: "pending", to: "paid" },
      }, { actorUid: ARENA }),
      entry(daysAgo(9), "seller", "customShipOrder", {
        status: { from: "confirmed", to: "shipped" },
        trackingNumber: { from: null, to: "LIR-TRK-88213004" },
      }, { actorUid: ARENA }),
      entry(daysAgo(6), "system", "deliveryConfirmation", {
        status: { from: "shipped", to: "delivered" },
      }),
    ],
  },

  // ── auction-won — settled at close, against a real ladder ─────────────
  {
    id: "order-1-20260822-aucwon",
    productId: "auction-beyblade-metal-diablo-nemesis",
    productTitle: "Metal Fight Beyblade BB-122 Diablo Nemesis (Ended — Sold)",
    userId: BUYER_KAIBA,
    userName: "Mock User 2",
    userEmail: "vivaan.kapoor@gmail.com",
    storeId: ARENA,
    quantity: 1,
    unitPrice: 6200,
    totalPrice: 6200,
    currency: "INR",
    status: "processing",
    paymentStatus: "paid",
    paymentMethod: "upi_manual",
    orderType: "auction",
    shippingAddress: "addr-kaiba-mansion",
    orderDate: daysAgo(2),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
    sourceContext: {
      path: "auction-won",
      auctionId: "auction-beyblade-metal-diablo-nemesis",
      bidId: "bid-beyblade-metal-diablo-nemesis-rohit-collector-20260601-005",
      winningBidAmount: 6200,
      bidCount: 6,
      startingBid: 3499,
      // No reserve on this auction, so the reserve cannot fail to be met.
      reserveMet: true,
      auctionEndedAt: daysAgo(2),
      runnerUpAmount: 5428,
    },
    statusHistory: [
      entry(daysAgo(2), "system", "auctionSettlement", {
        status: { from: null, to: "pending" },
      }, { reason: "Won at auction close" }),
      entry(daysAgo(1), "admin", "adminVerifyPayment", {
        status: { from: "pending", to: "processing" },
        paymentStatus: { from: "pending", to: "paid" },
        paymentReviewOutcome: { from: null, to: "verified" },
      }, { actorUid: BUYER_ADMIN }),
    ],
  },

  // ── auction-buy-now — a buyout ENDED a live auction ───────────────────
  {
    // Referenced back by the buyout bid's `orderId`, so the link resolves in
    // both directions.
    id: "order-1-20260820-buyout",
    productId: "auction-beyblade-burst-spriggan-requiem-bought-out",
    productTitle: "Beyblade Burst B-128 Spriggan Requiem (Ended — Bought Out)",
    userId: BUYER_KAIBA,
    userName: "Mock User 2",
    userEmail: "vivaan.kapoor@gmail.com",
    storeId: ARENA,
    quantity: 1,
    unitPrice: 4999,
    totalPrice: 4999,
    currency: "INR",
    status: "shipped",
    paymentStatus: "paid",
    paymentMethod: "cash",
    orderType: "auction",
    // What separates this from the win above. Both are orderType "auction";
    // only a buyout gets the 24h admin-review window.
    isBuyout: true,
    shippingAddress: "addr-kaiba-mansion",
    trackingNumber: "LIR-TRK-77410992",
    shippingCarrier: "Blue Dart",
    orderDate: daysAgo(4),
    shippingDate: daysAgo(2),
    createdAt: daysAgo(4),
    updatedAt: daysAgo(2),
    sourceContext: {
      path: "auction-buy-now",
      auctionId: "auction-beyblade-burst-spriggan-requiem-bought-out",
      bidId: "bid-beyblade-burst-spriggan-requiem-seto-kaiba-20260820-buyout",
      buyNowPrice: 4999,
      listPrice: 5499,
      // The highest NON-buyout bid the buyout beat.
      standingBidAtBuyout: 3100,
      // Three, not zero. The old type asserted "zero bids by definition"
      // because Buy Now used to be gated on `!bidsHaveStarted`; that gate was
      // removed, and recording 0 would bake a falsehood into an audit record.
      bidCount: 3,
      boughtAt: daysAgo(4),
      checkoutDeadline: daysAgo(4),
    },
    statusHistory: [
      entry(daysAgo(4), "buyer", "claimAuctionForCheckout", {
        status: { from: null, to: "pending" },
      }, { actorUid: BUYER_KAIBA, reason: "Buy Now claim won" }),
      entry(daysAgo(3), "seller", "updateOrderStatus", {
        status: { from: "pending", to: "confirmed" },
        paymentStatus: { from: "pending", to: "paid" },
      }, { actorUid: ARENA }),
      entry(daysAgo(2), "seller", "customShipOrder", {
        status: { from: "confirmed", to: "shipped" },
        trackingNumber: { from: null, to: "LIR-TRK-77410992" },
      }, { actorUid: ARENA }),
    ],
  },

  // ── offer-accepted — the end of a real negotiation ────────────────────
  {
    id: "order-1-20260813-offerctx",
    productId: "product-beyblade-x-knife-shinobi",
    productTitle: "Beyblade X Knife Shinobi",
    userId: BUYER_ADMIN,
    userName: "Mock User 1",
    userEmail: "admin@letitrip.in",
    storeId: ARENA,
    quantity: 1,
    unitPrice: 800,
    totalPrice: 800,
    currency: "INR",
    status: "delivered",
    paymentStatus: "paid",
    paymentMethod: "cash",
    orderType: "offer",
    // The offer this order settled — its own status is `paid`, and this is the
    // order id it points at.
    offerId: "offer-admin-x-knife-shinobi-paid",
    shippingAddress: "addr-letitrip-hq",
    orderDate: daysAgo(11),
    shippingDate: daysAgo(9),
    deliveryDate: daysAgo(7),
    createdAt: daysAgo(11),
    updatedAt: daysAgo(7),
    sourceContext: {
      path: "offer-accepted",
      offerId: "offer-admin-x-knife-shinobi-paid",
      offeredAmount: 800,
      listPriceAtOffer: 949,
      // Accepted outright — no counter rounds. Compare the Metal Storm
      // Pegasus chain in offers-seed-data.ts, which reaches round 3.
      counterRounds: 1,
      acceptedBy: ARENA,
      acceptedAt: daysAgo(12),
      checkoutDeadline: daysAgo(10),
    },
    statusHistory: [
      entry(daysAgo(11), "buyer", "createCheckoutOrder", {
        status: { from: null, to: "pending" },
      }, { actorUid: BUYER_ADMIN }),
      entry(daysAgo(10), "seller", "updateOrderStatus", {
        status: { from: "pending", to: "confirmed" },
        paymentStatus: { from: "pending", to: "paid" },
      }, { actorUid: ARENA }),
      entry(daysAgo(9), "seller", "customShipOrder", {
        status: { from: "confirmed", to: "shipped" },
        trackingNumber: { from: null, to: "LIR-TRK-30028841" },
      }, { actorUid: ARENA }),
      entry(daysAgo(7), "system", "deliveryConfirmation", {
        status: { from: "shipped", to: "delivered" },
      }),
      // A PARTIAL refund. It changes no tracked field, so it can only reach the
      // timeline as an explicit contribution — diffing `refunds[]` would render
      // as "an array of 0 became an array of 1", which is true and useless.
      entry(daysAgo(6), "admin", "postRefundEvent", {
        refund: {
          from: null,
          to: { refundId: "refund-x-knife-shinobi-1", type: "partial", amount: 120, reason: "Minor box damage in transit" },
        },
      }, { actorUid: BUYER_ADMIN, reason: "Minor box damage in transit" }),
    ],
    trackingNumber: "LIR-TRK-30028841",
    shippingCarrier: "Delhivery",
  },

  // ── pre-order — deposit taken, balance outstanding ────────────────────
  {
    id: "order-1-20260819-preordr",
    productId: "preorder-beyblade-x-bx-08-wave",
    productTitle: "Beyblade X BX-08 Wave (Pre-Order)",
    userId: BUYER_YUGI,
    userName: "Mock User 3",
    userEmail: "rehan.sheikh@gmail.com",
    storeId: ARENA,
    quantity: 1,
    unitPrice: 799,
    totalPrice: 799,
    currency: "INR",
    status: "confirmed",
    paymentStatus: "pending",
    paymentMethod: "cash",
    orderType: "preorder",
    // 25% of ₹799 — matches `preOrderDepositPercent` on the product.
    depositAmount: 199.75,
    shippingAddress: "addr-yugi-home",
    orderDate: daysAgo(5),
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
    sourceContext: {
      path: "pre-order",
      depositAmount: 199.75,
      balanceDue: 599.25,
    },
    statusHistory: [
      entry(daysAgo(5), "buyer", "createCheckoutOrder", {
        status: { from: null, to: "pending" },
      }, { actorUid: BUYER_YUGI }),
      entry(daysAgo(5), "seller", "updateOrderStatus", {
        status: { from: "pending", to: "confirmed" },
      }, { actorUid: ARENA, note: "Deposit received — balance due on dispatch." }),
    ],
  },

  // ── prize-draw — several entries bought in one order ──────────────────
  {
    id: "order-1-20260821-prizedr",
    productId: "prizedraw-beyblade-mystery-box",
    productTitle: "Beyblade Mystery Box — Prize Draw",
    userId: BUYER_KAIBA,
    userName: "Mock User 2",
    userEmail: "vivaan.kapoor@gmail.com",
    storeId: ARENA,
    quantity: 3,
    unitPrice: 99,
    totalPrice: 297,
    currency: "INR",
    status: "confirmed",
    paymentStatus: "paid",
    paymentMethod: "cash",
    orderType: "prize-draw",
    shippingAddress: "addr-kaiba-mansion",
    orderDate: daysAgo(3),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
    sourceContext: {
      path: "prize-draw",
      prizeDrawProductId: "prizedraw-beyblade-mystery-box",
      pricePerEntry: 99,
      entryCount: 3,
      // `prizeDrawMode` is reveal-vs-lottery, a different axis. This records
      // the reveal TIMING: no reveal window means it reveals on sell-out.
      revealMode: "instant",
    },
    statusHistory: [
      entry(daysAgo(3), "buyer", "createCheckoutOrder", {
        status: { from: null, to: "pending" },
      }, { actorUid: BUYER_KAIBA }),
      entry(daysAgo(3), "seller", "updateOrderStatus", {
        status: { from: "pending", to: "confirmed" },
        paymentStatus: { from: "pending", to: "paid" },
      }, { actorUid: ARENA }),
    ],
  },
];

export const ordersSeedData = [
  cashOrderPendingProof,
  cashOrderVerified,
  ...acquisitionOrders,
  // The slice keeps the fixture count stable as fixtures are added above it —
  // it used to be 48 for the two manual-payment orders, and now also absorbs
  // the six acquisition-path orders.
  ...[..._rawOrdersSeedData, ...expandedOrders].slice(0, 42),
// Derived through the wrapper, never written per record — an inline literal
// is how five product seed files shipped their last fixture with no tokens.
].map(withOrderImages).map(withOrderSearchTxt) as OrderDocument[];
