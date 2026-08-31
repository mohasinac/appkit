/*
 * WHY: Shared tester sandbox — one order per OrderStatus value (9 statuses) plus one
 *      each for the non-standard order types (auction win, bundle, prize-draw win,
 *      prize-draw loss/auto-refund) so testers can see every order-management state
 *      without manually driving each one through the full checkout/shipping/return
 *      flow first. Buyer is the dedicated user-tester-qa persona. Auto-expires in 7
 *      days via testerSandboxCleanup (orders aren't cascade-deleted — see note below).
 *      Also includes one 5-item order specifically to exercise the "My Orders" /
 *      dashboard Recent Orders item-summary UI (thumbnails/title/qty for the first 3
 *      items + a "+N more" badge beyond that) — the other fixtures here are all
 *      single- or 2-item orders, which never trigger the "+N more" badge at all.
 * WHAT: Exports ordersTesterSeedData — 14 Partial<OrderDocument> for the seed runner.
 *
 * NOTE: OrderDocument does not currently carry isTestData/testDataExpiresAt (unlike
 *       categories/stores/products/blogPosts/events) — testerSandboxCleanup does not
 *       cascade-delete these order documents when the parent product/store expires.
 *       They're small and harmless to leave; extending the cleanup script to cover
 *       orders is a follow-up, not blocking.
 *
 * EXPORTS:
 *   ordersTesterSeedData — Array of 14 Partial<OrderDocument> for the seed runner
 *
 * @tag domain:orders,tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed-cli.mjs
 * @tag sideEffects:none
 */

import type { OrderDocument } from "../../orders/schemas/firestore";
import { seedPhoto } from "../../../seed/_helpers/media";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

// Deterministic per-product thumbnail — see the identical helper's comment
// in appkit/src/seed/orders-seed-data.ts for why this doesn't need to match
// the real product's own seeded image.
function orderItemImage(productId: string): string {
  return seedPhoto(`order-item-${productId}`, 300, 300);
}

const BUYER_ID = "user-tester-qa";
const BUYER_NAME = "QA Tester";
const BUYER_EMAIL = "tester@letitrip.in";
const STORE_ID = "store-tester-sandbox";
const STORE_NAME = "Tester Sandbox Store";

interface StatusOrderInput {
  key: string;
  status: OrderDocument["status"];
  paymentStatus: OrderDocument["paymentStatus"];
  extra?: Partial<OrderDocument>;
}

const STANDARD_PRODUCT_ID = "product-tester-standard-1";
const STANDARD_PRODUCT_TITLE = "Test Gadget — Standard Listing #1";
const PRIZEDRAW_PRODUCT_ID = "prizedraw-tester-sandbox-1";
const PRIZEDRAW_PRODUCT_TITLE = "Test Prize Draw — Reveal Me!";

function standardOrder({ key, status, paymentStatus, extra }: StatusOrderInput): Partial<OrderDocument> {
  return {
    id: `order-tester-sandbox-standard-${key}`,
    productId: STANDARD_PRODUCT_ID,
    productTitle: STANDARD_PRODUCT_TITLE,
    userId: BUYER_ID,
    userName: BUYER_NAME,
    userEmail: BUYER_EMAIL,
    storeId: STORE_ID,
    storeName: STORE_NAME,
    items: [
      { productId: STANDARD_PRODUCT_ID, productTitle: STANDARD_PRODUCT_TITLE, listingType: "standard", quantity: 1, unitPrice: 199, totalPrice: 199 },
    ],
    orderType: "standard",
    quantity: 1,
    unitPrice: 199,
    totalPrice: 199,
    currency: "INR",
    status,
    paymentStatus,
    paymentMethod: "upi_manual",
    shippingAddress: "addr-tester-qa-home",
    orderDate: daysAgo(3),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
    ...extra,
  } as Partial<OrderDocument>;
}

const _rawOrdersTesterSeedData: Partial<OrderDocument>[] = [
  // ── One order per OrderStatus value (9) ──────────────────────────────────────
  standardOrder({ key: "pending", status: "pending", paymentStatus: "pending" }),
  standardOrder({ key: "confirmed", status: "confirmed", paymentStatus: "paid" }),
  standardOrder({ key: "processing", status: "processing", paymentStatus: "paid" }),
  standardOrder({
    key: "shipped",
    status: "shipped",
    paymentStatus: "paid",
    extra: {
      trackingNumber: "TEST-TRACK-001",
      shippingCarrier: "Test Carrier",
      shippingDate: daysAgo(1),
      // Real-looking passthrough URL — exercises the "opens in new tab"
      // tracking-link case on /user/orders/[id]/track (no live courier
      // API integration; this is exactly what a seller/admin would type in).
      trackingUrl: "https://www.example.com/track/TEST-TRACK-001",
    },
  }),
  standardOrder({
    key: "delivered",
    status: "delivered",
    paymentStatus: "paid",
    extra: { trackingNumber: "TEST-TRACK-002", shippingCarrier: "Test Carrier", shippingDate: daysAgo(2), deliveryDate: daysAgo(1) },
  }),
  standardOrder({
    key: "cancelled",
    status: "cancelled",
    paymentStatus: "refunded",
    extra: { cancellationDate: daysAgo(1), cancellationReason: "Disposable test cancellation — buyer changed their mind." },
  }),
  standardOrder({
    key: "refunded",
    status: "refunded",
    paymentStatus: "refunded",
    extra: { refundAmount: 199, refundStatus: "completed", refundNote: "Disposable test refund." },
  }),
  standardOrder({
    key: "return-requested",
    status: "return_requested",
    paymentStatus: "paid",
    extra: { trackingNumber: "TEST-TRACK-003", shippingDate: daysAgo(3), deliveryDate: daysAgo(2) },
  }),
  standardOrder({
    key: "returned",
    status: "returned",
    paymentStatus: "refunded",
    extra: {
      trackingNumber: "TEST-TRACK-004",
      shippingDate: daysAgo(5),
      deliveryDate: daysAgo(4),
      refundAmount: 199,
      refundStatus: "completed",
    },
  }),

  // ── Auction win — order created from the already-ended auction-tester-sandbox-won ──
  {
    id: "order-tester-sandbox-auction-win",
    productId: "auction-tester-sandbox-won",
    productTitle: "Test Auction — Already Won",
    userId: BUYER_ID,
    userName: BUYER_NAME,
    userEmail: BUYER_EMAIL,
    storeId: STORE_ID,
    storeName: STORE_NAME,
    items: [
      { productId: "auction-tester-sandbox-won", productTitle: "Test Auction — Already Won", listingType: "auction", quantity: 1, unitPrice: 15000, totalPrice: 15000 },
    ],
    orderType: "auction",
    quantity: 1,
    unitPrice: 15000,
    totalPrice: 15000,
    currency: "INR",
    status: "delivered",
    paymentStatus: "paid",
    paymentMethod: "upi_manual",
    shippingAddress: "addr-tester-qa-home",
    trackingNumber: "TEST-TRACK-AUCTION-001",
    shippingCarrier: "Test Carrier",
    shippingDate: daysAgo(1),
    deliveryDate: NOW,
    orderDate: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: NOW,
  } as Partial<OrderDocument>,

  // ── Bundle purchase — a real checkout produces ONE order item for the whole
  //    bundle (see addBundleToCartAction / checkout/actions.ts bundle-expansion),
  //    not one item per member product. Previously mis-modeled against
  //    "group-tester-sandbox-bundle" (a real standalone product that separately
  //    demonstrates the Tier-GP product-group "Set" feature, not a bundle at
  //    all) — the actual bundle is the categories row "bundle-tester-sandbox".
  {
    id: "order-tester-sandbox-bundle",
    productId: "bundle-tester-sandbox",
    productTitle: "Test Bundle",
    userId: BUYER_ID,
    userName: BUYER_NAME,
    userEmail: BUYER_EMAIL,
    storeId: STORE_ID,
    storeName: STORE_NAME,
    items: [
      {
        productId: "bundle-tester-sandbox",
        productTitle: "Test Bundle",
        listingType: "standard",
        quantity: 1,
        unitPrice: 199,
        totalPrice: 199,
        bundleCategorySlug: "bundle-tester-sandbox",
        bundleProductIds: ["product-tester-standard-1", "product-tester-standard-2"],
      },
    ],
    orderType: "standard",
    bundleId: "bundle-tester-sandbox",
    isNonRefundable: true,
    quantity: 1,
    unitPrice: 199,
    totalPrice: 199,
    currency: "INR",
    status: "processing",
    paymentStatus: "paid",
    paymentMethod: "upi_manual",
    shippingAddress: "addr-tester-qa-home",
    orderDate: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  } as Partial<OrderDocument>,

  // ── Prize draw — winning entry (auto reveal isn't required for this seed to be
  //    useful; it just represents the post-reveal state a real reveal would produce) ──
  {
    id: "order-tester-sandbox-prizedraw-win",
    productId: PRIZEDRAW_PRODUCT_ID,
    productTitle: PRIZEDRAW_PRODUCT_TITLE,
    userId: BUYER_ID,
    userName: BUYER_NAME,
    userEmail: BUYER_EMAIL,
    storeId: STORE_ID,
    storeName: STORE_NAME,
    items: [
      {
        productId: PRIZEDRAW_PRODUCT_ID,
        productTitle: PRIZEDRAW_PRODUCT_TITLE,
        listingType: "prize-draw",
        quantity: 1,
        unitPrice: 50,
        totalPrice: 50,
        prizeRevealStatus: "revealed",
      },
    ],
    orderType: "prize-draw",
    prizeDrawProductId: PRIZEDRAW_PRODUCT_ID,
    prizeRevealMode: "scheduled",
    prizeWon: { itemNumber: 1, title: "Test Prize — Grand", images: [], wonAt: daysAgo(1) },
    isNonRefundable: true,
    quantity: 1,
    unitPrice: 50,
    totalPrice: 50,
    currency: "INR",
    status: "delivered",
    paymentStatus: "paid",
    paymentMethod: "upi_manual",
    orderDate: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  } as Partial<OrderDocument>,

  // ── Prize draw — a second entry on the same closed draw, revealed to a
  //    different item. Every paid entry on a prize draw is eventually
  //    assigned some item (prizeMaxEntries === item count) — there's no
  //    "losing" outcome under the automatic-reveal model, unlike a lottery
  //    with fewer prizes than tickets. ─────────────────────────────────────
  {
    id: "order-tester-sandbox-prizedraw-lose",
    productId: PRIZEDRAW_PRODUCT_ID,
    productTitle: PRIZEDRAW_PRODUCT_TITLE,
    userId: "user-admin-letitrip",
    userName: "LetItRip Admin",
    userEmail: "admin@letitrip.in",
    storeId: STORE_ID,
    storeName: STORE_NAME,
    items: [
      {
        productId: PRIZEDRAW_PRODUCT_ID,
        productTitle: PRIZEDRAW_PRODUCT_TITLE,
        listingType: "prize-draw",
        quantity: 1,
        unitPrice: 50,
        totalPrice: 50,
        prizeRevealStatus: "revealed",
      },
    ],
    orderType: "prize-draw",
    prizeDrawProductId: PRIZEDRAW_PRODUCT_ID,
    prizeRevealMode: "scheduled",
    prizeWon: { itemNumber: 2, title: "Test Prize — Runner-up", images: [], wonAt: daysAgo(1) },
    isNonRefundable: true,
    quantity: 1,
    unitPrice: 50,
    totalPrice: 50,
    currency: "INR",
    status: "delivered",
    paymentStatus: "paid",
    paymentMethod: "upi_manual",
    orderDate: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: NOW,
  } as Partial<OrderDocument>,

  // ── Multi-item order — 5 line items so the "My Orders" list / dashboard Recent
  //    Orders widget shows real thumbnails+title+qty for the first 3 and a genuine
  //    "+2 more" badge for the rest (every other fixture above tops out at 2 items).
  {
    id: "order-tester-sandbox-multi-item",
    productId: STANDARD_PRODUCT_ID,
    productTitle: STANDARD_PRODUCT_TITLE,
    userId: BUYER_ID,
    userName: BUYER_NAME,
    userEmail: BUYER_EMAIL,
    storeId: STORE_ID,
    storeName: STORE_NAME,
    items: [
      { productId: "product-tester-standard-1", productTitle: "Test Gadget — Standard Listing #1", listingType: "standard", quantity: 1, unitPrice: 199, totalPrice: 199 },
      { productId: "product-tester-standard-2", productTitle: "Test Collectible — Standard Listing #2", listingType: "standard", quantity: 1, unitPrice: 149, totalPrice: 149 },
      { productId: "product-tester-standard-accessory-case", productTitle: "Test Accessory — Carry Case", listingType: "standard", quantity: 1, unitPrice: 99, totalPrice: 99 },
      { productId: "product-tester-standard-accessory-stand", productTitle: "Test Accessory — Display Stand", listingType: "standard", quantity: 2, unitPrice: 49, totalPrice: 98 },
      { productId: "product-tester-standard-accessory-stickers", productTitle: "Test Accessory — Sticker Set", listingType: "standard", quantity: 3, unitPrice: 19, totalPrice: 57 },
    ],
    orderType: "standard",
    quantity: 8,
    unitPrice: 199,
    totalPrice: 602,
    currency: "INR",
    status: "delivered",
    paymentStatus: "paid",
    paymentMethod: "upi_manual",
    shippingAddress: "addr-tester-qa-home",
    trackingNumber: "TEST-TRACK-MULTI-001",
    shippingCarrier: "Test Carrier",
    shippingDate: daysAgo(2),
    deliveryDate: daysAgo(1),
    orderDate: daysAgo(3),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  } as Partial<OrderDocument>,
];

// Backfills image/imageUrls the same way appkit/src/seed/orders-seed-data.ts
// does, so tester-sandbox order fixtures also show a thumbnail on My Orders
// and order-detail like real post-2026-08-20 orders do.
export const ordersTesterSeedData: Partial<OrderDocument>[] = _rawOrdersTesterSeedData.map((order) => ({
  ...order,
  imageUrls: order.imageUrls ?? (order.productId ? [orderItemImage(order.productId)] : undefined),
  items: order.items?.map((item) => ({
    ...item,
    image: item.image ?? orderItemImage(item.productId),
  })),
}));
