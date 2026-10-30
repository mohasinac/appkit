/*
 * WHY: Order fixtures. Production's orders are real purchases, which a seed
 * must not fabricate, so this is empty.
 * WHAT: Empty. `withOrderImages` and `withOrderSearchTxt` are kept — they are
 * the reason a fixture cannot ship without items[] or tokens. A loop running
 * to 50, a `.slice(0, 42)` and two hand-written cash fixtures were removed.
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
 * email: `encryptPiiFields` covers only paths somebody NAMED, and nothing
 * declares `statusHistory[].changes.<key>`, so PII in there is plaintext.
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
import { seedPhoto } from "./_helpers/media";

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

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

/*
 * 🛑 RE-POPULATED 2026-10-30 as EXPLICIT TEST DATA, with the owner's
 * confirmation — reverses the 2026-10-22 prune for this audit sweep's need
 * to exercise cart/checkout/order-detail/returns/payout flows end to end
 * locally. Five orders, one per acquisition/status shape, not the full
 * historical 50 — enough to make every /user/orders tab and /admin/orders
 * status filter non-empty.
 */
const _rawOrdersSeedData: Partial<OrderPlain>[] = [
  {
    id: "order-test-standard-001",
    productId: "product-beyblade-burst-valkyrie",
    productTitle: "Beyblade Burst B-34 Victory Valkyrie Boost Variable",
    userId: "user-meera-bey",
    userName: "Meera Blader",
    userEmail: "meera.blader@gmail.com",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    orderType: "standard",
    quantity: 1,
    unitPrice: 999,
    totalPrice: 999,
    currency: "INR",
    status: "delivered",
    paymentStatus: "paid",
    paymentMethod: "cod",
    createdAt: daysAgo(10),
  },
  {
    id: "order-test-auction-win-001",
    productId: "auction-beyblade-burst-cho-z-achilles",
    productTitle: "Beyblade Burst B-100 Cho-Z Achilles",
    userId: "user-rohit-collector",
    userName: "Rohit Collector",
    userEmail: "rohit.collect@gmail.com",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    orderType: "auction",
    quantity: 1,
    unitPrice: 1650,
    totalPrice: 1650,
    currency: "INR",
    status: "confirmed",
    paymentStatus: "paid",
    paymentMethod: "upi_manual",
    createdAt: daysAgo(3),
  },
  {
    id: "order-test-offer-accepted-001",
    productId: "beyblade-x-xtreme-stadium-bx-10-copy",
    productTitle: "Beyblade X Xtreme Stadium (BX-10) (Copy)",
    userId: "user-rohit-collector",
    userName: "Rohit Collector",
    userEmail: "rohit.collect@gmail.com",
    storeId: "store-letitrip-official",
    storeName: "LetItRip Official",
    orderType: "offer",
    quantity: 1,
    unitPrice: 4000,
    totalPrice: 4000,
    currency: "INR",
    status: "shipped",
    paymentStatus: "paid",
    paymentMethod: "upi_manual",
    trackingNumber: "TEST-TRACK-001",
    createdAt: daysAgo(5),
  },
  {
    id: "order-test-preorder-001",
    productId: "preorder-beyblade-x-bx-08-wave",
    productTitle: "Beyblade X BX-08 Wave",
    userId: "user-ananya-collector",
    userName: "Ananya Patel",
    userEmail: "ananya.patel@gmail.com",
    storeId: "store-letitrip-official",
    storeName: "LetItRip Official",
    orderType: "preorder",
    quantity: 1,
    unitPrice: 799,
    totalPrice: 799,
    currency: "INR",
    status: "pending",
    paymentStatus: "paid",
    paymentMethod: "cod",
    createdAt: daysAgo(1),
  },
  {
    id: "order-test-return-requested-001",
    productId: "product-beyblade-burst-valtryek-v3-sold-out",
    productTitle: "Beyblade Burst God Valkyrie 6Vortex Reboot (Sold Out)",
    userId: "user-meera-bey",
    userName: "Meera Blader",
    userEmail: "meera.blader@gmail.com",
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    orderType: "standard",
    quantity: 1,
    unitPrice: 899,
    totalPrice: 899,
    currency: "INR",
    status: "return_requested",
    paymentStatus: "paid",
    paymentMethod: "cod",
    cancellationReason: "Item not as described.",
    createdAt: daysAgo(15),
  },
];

// Removed 2026-10-22: two cash/UPI manual-payment demo fixtures
// (`order-1-20260729-cash01` and its verified twin). Live has neither, and
// the manual-payment surfaces they exercised are covered by tester cases
// rather than by seeded orders.

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

export const ordersSeedData = _rawOrdersSeedData
  .map(withOrderImages)
  .map(withOrderSearchTxt) as OrderPlain[];
