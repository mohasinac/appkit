/*
 * WHY: Seeds the orders that exist in production.
 * WHAT: Order IDs follow order-{itemCount}-{YYYYMMDD}-{rand6}. The 6 demo
 * orders were removed; only live ids remain.
 *
 * 🛑 PRUNED TO MATCH LIVE, 2026-10-21. This file previously seeded demo
 * fixtures that production does not have. `appkit-seed load` has NO
 * production guard and `.env.local` points at the live project, so every one
 * of those rows was one command away from appearing on the live site.
 *
 * Consequence, recorded rather than left to be discovered: tester cases that
 * acted on this data can now only report "could not test". That cost was
 * raised with the owner before the deletion and accepted.
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
import type { OrderPlain } from "../features/orders/schemas/firestore";
import type { StatusChangeEntry } from "../_internal/shared/history/index";
import { seedPhoto } from "./_helpers/media";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

/**
 * The anchor the order IDs are built from — fixed, never `NOW`.
 *
 * 🛑 An ID may not contain a value that moves. `generateOrderId` embeds a
 * `yyyymmdd` derived from its anchor, so with `NOW` every order's id changed on
 * every calendar day: `appkit-seed load` CREATED 50 fresh documents instead of
 * upserting the same 50, and `status`/`delete` computed ids that had never been
 * written.
 *
 * Measured immediately after a successful `load --collections orders` that
 * reported "created 50, errors 0": `appkit-seed status` answered
 * **`orders 50 seed / 0 in db`**. Both numbers were right; they were about
 * different sets of ids.
 *
 * This is exactly the case Recurrent Root Cause #25 names — "`Date.now()` used
 * as an ID component (as opposed to just a display timestamp)". The
 * distinction is the whole fix:
 *
 *   - **IDs** anchor to `SEED_EPOCH`, so they are reproducible forever.
 *   - **Display timestamps** (`orderDate`, `createdAt`, shipping dates) keep
 *     using `daysAgo()` off `NOW`, so a reseeded catalogue still looks recent
 *     and time-bound fixtures re-arm, which is what the tester window needs.
 *
 * It also broke every checklist case that names an order by id: they were
 * authored against one day's ids and could never resolve afterwards.
 */
const SEED_EPOCH = new Date("2026-01-01T00:00:00.000Z");

// Deterministic per-product thumbnail — `seedPhoto` maps a seed string to one
// of six LOCAL tiles, so this doesn't need to match the real product seed's
// own image, just be present and consistent across reseeds. (It used to name
// picsum.photos here; seeded imagery stopped being a third-party fetch on
// 2026-10-09 — see seedPhoto's header.) Backfills the
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
  // SEED_EPOCH, not NOW — see the block comment on SEED_EPOCH. An id that
  // moves with the calendar is an id that never upserts.
  const date = new Date(SEED_EPOCH.getTime() - daysBack * 86_400_000);
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

const _rawOrdersSeedData: Partial<OrderPlain>[] = [
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

const expandedOrders: Partial<OrderPlain>[] = [];
for (let i = _rawOrdersSeedData.length; i < 50; i++) {
  const combo = buyerStoreMatrix[i % buyerStoreMatrix.length];
  const product = productPool[i % productPool.length];
  const status = statuses[i % statuses.length];
  const daysBack = 70 - i;
  const qty = (i % 3) + 1;

  expandedOrders.push({
    id: generateOrderId(qty, daysBack, `${combo.userId}-${product.productId}-${i}`),
    /*
     * 🛑 `items[]` IS THE CANONICAL SHAPE. The flat `productId`/`productTitle`
     * pair below is legacy and is kept only for back-compat readers.
     *
     * This generator emitted the flat fields alone, so 44 of the 50 seeded
     * orders had NO `items[]` — and every order surface reads
     * `items[0].productTitle` for its row label. The admin list therefore
     * rendered "🧾 Order order-1-20260822-aucwon" on 22 of 25 rows: a raw id
     * beside a placeholder emoji, for orders whose product was known all along.
     *
     * Same family as Root Cause #60 — a writer producing a shape no reader can
     * render — except the writer here is the seed, which is why it survived a
     * fix to the readers.
     */
    items: [
      {
        productId: product.productId,
        productTitle: product.productTitle,
        listingType: "standard",
        quantity: qty,
        unitPrice: product.unitPrice,
        totalPrice: product.unitPrice * qty,
      },
    ],
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
const cashOrderPendingProof: Partial<OrderPlain> = {
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

const cashOrderVerified: Partial<OrderPlain> = {
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

/*
 * 🛑 DERIVES `items[]` FROM THE FLAT FIELDS WHEN A FIXTURE OMITS IT.
 *
 * `items[]` is the canonical shape and every orders surface reads
 * `items[0].productTitle` for its row label (Root Cause #52). The generator
 * below was taught to emit it — and that fix was NARROWER THAN THE DEFECT:
 * measured after it shipped, 14 of the 50 seeded orders still had none,
 * because the hand-written fixtures never go through the generator.
 *
 * That is Root Cause #84's shape — a fix scoped to the population you happened
 * to be looking at. Patching those 14 by hand would leave the 15th to whoever
 * writes it next, so the derivation lives here instead, on the path EVERY
 * fixture already takes.
 *
 * It only ever fills a gap: a fixture that declares its own `items[]` (the
 * multi-line ones, where the flat fields cannot express two products) is
 * passed through untouched.
 */
function withOrderItems(order: Partial<OrderPlain>): Partial<OrderPlain> {
  if (Array.isArray(order.items) && order.items.length > 0) return order;
  if (!order.productId) return order;

  const quantity = order.quantity ?? 1;
  const unitPrice = order.unitPrice ?? 0;
  return {
    ...order,
    items: [
      {
        productId: order.productId,
        productTitle: order.productTitle ?? order.productId,
        listingType: "standard",
        quantity,
        unitPrice,
        // Prefer the order's own total: on a single-line order it is the
        // authoritative figure, and re-deriving it would silently drop any
        // fixture that deliberately encodes a locked or negotiated price.
        totalPrice: order.totalPrice ?? unitPrice * quantity,
      },
    ],
  } as Partial<OrderPlain>;
}

// Backfills image/imageUrls (see orderItemImage() above) on every fixture
// regardless of which shape it uses (multi-item `items[]` vs the legacy
// single-item top-level fields), so no seeded order silently renders without
// a thumbnail the way real pre-2026-08-20 orders do.
function withOrderImages(input: Partial<OrderPlain>): Partial<OrderPlain> {
  const order = withOrderItems(input);
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
const acquisitionOrders: Partial<OrderPlain>[] = [];

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
].map(withOrderImages).map(withOrderSearchTxt) as OrderPlain[];
