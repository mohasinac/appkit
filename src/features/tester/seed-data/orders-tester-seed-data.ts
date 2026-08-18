/*
 * WHY: Shared tester sandbox — one order per OrderStatus value (9 statuses) plus one
 *      each for the non-standard order types (auction win, bundle, prize-draw win,
 *      prize-draw loss/auto-refund) so testers can see every order-management state
 *      without manually driving each one through the full checkout/shipping/return
 *      flow first. Buyer is the dedicated user-tester-qa persona. Auto-expires in 7
 *      days via testerSandboxCleanup (orders aren't cascade-deleted — see note below).
 * WHAT: Exports ordersTesterSeedData — 13 Partial<OrderDocument> for the seed runner.
 *
 * NOTE: OrderDocument does not currently carry isTestData/testDataExpiresAt (unlike
 *       categories/stores/products/blogPosts/events) — testerSandboxCleanup does not
 *       cascade-delete these order documents when the parent product/store expires.
 *       They're small and harmless to leave; extending the cleanup script to cover
 *       orders is a follow-up, not blocking.
 *
 * EXPORTS:
 *   ordersTesterSeedData — Array of 13 Partial<OrderDocument> for the seed runner
 *
 * @tag domain:orders,tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed-cli.mjs
 * @tag sideEffects:none
 */

import type { OrderDocument } from "../../orders/schemas/firestore";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

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

export const ordersTesterSeedData: Partial<OrderDocument>[] = [
  // ── One order per OrderStatus value (9) ──────────────────────────────────────
  standardOrder({ key: "pending", status: "pending", paymentStatus: "pending" }),
  standardOrder({ key: "confirmed", status: "confirmed", paymentStatus: "paid" }),
  standardOrder({ key: "processing", status: "processing", paymentStatus: "paid" }),
  standardOrder({
    key: "shipped",
    status: "shipped",
    paymentStatus: "paid",
    extra: { trackingNumber: "TEST-TRACK-001", shippingCarrier: "Test Carrier", shippingDate: daysAgo(1) },
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

  // ── Bundle purchase — group-tester-sandbox-bundle expands into its two children ──
  {
    id: "order-tester-sandbox-bundle",
    productId: "group-tester-sandbox-bundle",
    productTitle: "Test Bundle — Standard #1 + Standard #2",
    userId: BUYER_ID,
    userName: BUYER_NAME,
    userEmail: BUYER_EMAIL,
    storeId: STORE_ID,
    storeName: STORE_NAME,
    items: [
      {
        productId: "product-tester-standard-1",
        productTitle: "Test Gadget — Standard Listing #1",
        listingType: "standard",
        quantity: 1,
        unitPrice: 199,
        totalPrice: 199,
        bundleCategorySlug: "group-tester-sandbox-bundle",
        bundleProductIds: ["product-tester-standard-1", "product-tester-standard-2"],
      },
      {
        productId: "product-tester-standard-2",
        productTitle: "Test Collectible — Standard Listing #2",
        listingType: "standard",
        quantity: 1,
        unitPrice: 149,
        totalPrice: 149,
        bundleCategorySlug: "group-tester-sandbox-bundle",
        bundleProductIds: ["product-tester-standard-1", "product-tester-standard-2"],
      },
    ],
    orderType: "standard",
    bundleId: "group-tester-sandbox-bundle",
    isNonRefundable: true,
    quantity: 2,
    unitPrice: 164,
    totalPrice: 329,
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
        revealedItemNumber: 1,
      },
    ],
    orderType: "prize-draw",
    prizeDrawProductId: PRIZEDRAW_PRODUCT_ID,
    prizeWon: { itemNumber: 1, title: "Test Prize — Grand", images: [], wonAt: daysAgo(1) },
    prizeRevealDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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

  // ── Prize draw — non-winning entry, auto-refunded ────────────────────────────
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
        prizeRevealStatus: "closed",
      },
    ],
    orderType: "prize-draw",
    prizeDrawProductId: PRIZEDRAW_PRODUCT_ID,
    quantity: 1,
    unitPrice: 50,
    totalPrice: 50,
    currency: "INR",
    status: "refunded",
    paymentStatus: "refunded",
    paymentMethod: "upi_manual",
    refundAmount: 50,
    refundStatus: "completed",
    refundNote: "Disposable test — non-winning prize-draw entry auto-refunded after reveal.",
    orderDate: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: NOW,
  } as Partial<OrderDocument>,
];
