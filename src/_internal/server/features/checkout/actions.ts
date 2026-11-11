import { normalizeError } from "../../../../errors/normalize";
import { buildOrderSourceContext } from "./source-context";
import { roundRupees } from "../../../../utils/number.formatter";
/**
 * Checkout server actions (appkit).
 *
 * Lifted from src/app/api/checkout/route.ts so any consumer (REST handler,
 * server component form, RSC action) can place orders by calling these
 * directly. The consumer is responsible for auth/rate-limit/Next-specific
 * concerns; the action only does transactional order placement.
 */

import { ApiError, ValidationError, NotFoundError, ERROR_MESSAGES } from "../../../../errors";
import { ORDER_FIELDS } from "../../../../constants/field-names";
import { serverLogger } from "../../../../monitoring";
/*
 * 🛑 `roundShippingUp` is NO LONGER IMPORTED HERE, and its absence is the fix.
 * It was applied to a client-supplied `chargedRate` and the result was charged
 * — see `CreateCheckoutOrderInput.selectedShippingQuote`. The ₹50 step now
 * applies only where a carrier rate ENTERS the system (`toQuoteOptions`) and
 * inside `buildShippingOptions`, never to anything a browser sent.
 */
import {
  toQuoteOptions,
  type SelectedShippingQuote,
  type ShippingQuoteOption,
} from "../../../shared/shipping/quote";
import {
  unitOfWork,
  adminNotificationsRepository,
  siteSettingsRepository,
  userRepository,
  storeRepository,
  sellerProfileRepository,
  couponsRepository,
  claimedCouponsRepository,
  addressesRepository,
  productRepository,
  /*
   * Phase 3 — the split-settlement records written by the capture request, read
   * back here so each order can record whether ITS seller's share went straight
   * to them out of escrow. That record is the double-payment guard.
   */
  payoutRepository,
} from "../../../../repositories";
import type { SplitSettlementRecord } from "../../../../features/payments/repository/payout.repository";
import type { StoreSettlementVendor } from "../../../../features/stores/schemas/firestore";
import { isIntraStateSupply } from "../../../shared/fees/calculator";
import { resolveStateKey, INDIA_STATES } from "../../../shared/fees/india-states";
import {
  allocatePointsAcrossGroups,
  pointsBaseForGroup,
  computePreOrderDepositAmount,
  lineTotalFor,
  resolvePointsTender,
  sumGroupGst,
  unitPriceFor,
  type GroupGstSummary,
} from "../../../shared/checkout/order-math";
/*
 * D46/D47 — points as a checkout TENDER.
 *
 * `storeAcceptsPoints` resolves decision 22's per-store opt-in (and the
 * platform store's always-accepts, which is decided in code); the repository
 * supplies the balance and owns the ledger write. The ARITHMETIC lives in
 * `resolvePointsTender` above, beside every other money rule, so the tender
 * cannot become a sixth disagreeing total (D37/D38/D40).
 */
import { storeAcceptsPoints } from "../../../shared/features/points/accepts";
import { pointsRepository } from "../../../../features/points/repository/points.repository";
import type { SiteSettingsDocument } from "../../../../features/admin/schemas/firestore";
import { COD_MAX_ORDER_VALUE_FALLBACK } from "../../../../features/admin/schemas/firestore";
import { CHECKOUT_ERROR_CODES } from "../../../../errors/error-codes";
import { failedCheckoutRepository } from "../../../../features/checkout/repository/failed-checkout.repository";
import { sendOrderConfirmationEmail } from "../../../../features/contact/server";
import { splitCartIntoOrderGroups } from "../../../../features/orders/utils/order-splitter";
import type { OrderType } from "../../../../features/orders/utils/order-splitter";
import {
  DEFAULT_STORE_SHIPPING_POLICY,
  quoteShipping,
  toStoreShippingPolicy,
  type StoreShippingPolicy,
} from "../../../shared/features/shipping/mode";
/*
 * The seller's offer, the buyer's pick, and the SERVER's price for it — the
 * money-authority fix of 2026-11-08. `offer.ts`'s header carries the measured
 * defect (a forged `chargedRate` of 1 moved a ₹149 order's total from ₹172.69
 * to ₹222.69) and the reason the fix is re-resolution rather than prohibition:
 * the buyer legitimately CHOOSES between the seller's own rate and a carrier
 * quote, so what must be rejected is the client's AMOUNT, never its CHOICE.
 */
import {
  CUSTOM_SHIPPING_OPTION_ID,
  DEFAULT_SELLER_SHIPPING_OFFER,
  buildShippingOptions,
  impliedObligation,
  offerFromPolicy,
  platformShippingOptionId,
  resolveShippingSelection,
  toSellerShippingOffer,
  type SellerShippingOffer,
  type ShippingObligation,
  type ShippingOptionOffer,
} from "../../../shared/features/shipping/offer";
/*
 * D44's first consumer of `shippingUnavailable`. A store whose shipping cannot
 * be priced is a configuration fault with a money consequence — we ship free —
 * so it belongs in the operator queue, keyed on the store so a hundred
 * checkouts produce one case.
 */
import { paymentCasesRepository } from "../../../../features/payment-cases/repository/payment-cases.repository";
import { computeProtectionFees } from "../../../shared/features/shipping/protections";
/* S5a — one payer, N destinations. Pure: the rates come in snapshotted, and
 * an UNPRICED arrangement is refused rather than quoted at ₹0 (D44's lesson). */
import {
  countDestinations,
  quoteSharedPurchase,
  type SharedPurchaseRates,
} from "../../../shared/features/shipping/shared-purchase";
import { formatMoney } from "../../../../utils/number.formatter";
import { resolveCouponCategorySlugs } from "../../../../features/promotions/actions/coupon-actions";
import {
  assertCheckoutLane,
  assertLockedLinesStillValid,
  finalizeLockedLines,
} from "./locked-lines";
import {
  activeLane,
  defaultCheckoutItems,
  resolveCheckoutItems,
  laneOf,
  type CartLane,
} from "../../../shared/checkout/lanes";
import {
  computeCodHandlingFee,
  type CodHandlingFeeRates,
  computeWhatsAppNotifyFee,
  type WhatsAppNotifyFeeRates,
  computeGiftWrapFee,
  type GiftWrapFeeRates,
  computeShipmentProtectionFee,
  type ShipmentProtectionFeeRates,
  computeSaleProtectionFee,
  type SaleProtectionFeeRates,
  computeCheckoutFees,
  allocateCheckoutFees,
} from "../../../shared/fees/calculator";
import {
  getAdminDb,
  getAdminRealtimeDb,
  RTDB_PATHS,
} from "../../../../providers/db-firebase";
import {
  snapshotDeliveryAddress,
  type DeliverySnapshot,
} from "../../../shared/features/orders/delivery-snapshot";
import { PRODUCT_COLLECTION, PRODUCT_CODES_SUBCOLLECTION } from "../../../../features/products/schemas/firestore";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import { CART_COLLECTION } from "../../../../features/cart/schemas/index";
import type { CartItemDocument, CartStoreAddons } from "../../../../features/cart/schemas/firestore";
// S-SBUNI-RULES 2026-05-13 — bundle cart-line stock fan-out helpers.
import {
  getCartItemMemberIds,
  getExpandedDecrements,
  bucketCartItemsByStock,
  isMultiMemberLine,
  type StockBucketResult,
} from "./bundle-expansion";
import { expandCartLineToOrderRows, assignOrderLineIds } from "./expand-order-items";
import {
  OrderStatusValues,
  PaymentStatusValues,
  PaymentMethodValues,
  OutOfStockPolicyValues,
} from "../../../../features/orders/schemas/index";
import type { OutOfStockPolicy } from "../../../../features/orders/schemas/index";
import { getDefaultCurrency } from "../../../../core/baseline-resolver";
import { getProviders } from "../../../../contracts";
// A4 — the checkout intent is OURS, not PhonePe's; it lives on the contract now.
import type { CheckoutIntentMetadata } from "../../../../contracts/payment";
/*
 * The SDK-free signature module, NOT the provider's `index.ts`. Importing the
 * index would pull a static `import Razorpay from "razorpay"` into this
 * action's import graph for one HMAC comparison — see that file's header.
 */
import { resolveKeys } from "../../../../core/integration-keys";
import { paiseToRupees } from "../../../../core/money";
import { CHECKOUT_DEFAULT_COMMISSIONS, type CheckoutPaymentMethod } from "../../../shared/features/checkout/config";
import { safeRead } from "../../../../errors/safe-read";
import { methodRefusalMessage } from "../../payments/method-gate";
import { collectsOnDelivery } from "../../../shared/payments/method-capabilities";
import { PAYMENT_METHOD_LABEL } from "../../../shared/checkout/rules/payment-gate";
/*
 * 🛑 `amountDueNow` MOVED here from the deleted `features/emi/group` (EMI
 * stage 5a). It is NOT an EMI function — it answers "how much do we collect
 * now" on every order path — and its `emiRemainingBalance` parameter is gone,
 * not defaulted to 0.
 */
import { amountDueNow } from "../../../shared/checkout/order-math";
import type { CartAppliedCoupon } from "../../../../features/cart/schemas/firestore";
import { formatShippingAddress, type CheckoutOrderResult } from "./data";
import { enforceMaxPerUserForCart } from "./prize-bundle-gates";
import type { ListingType } from "../../../../features/products/types/index";
import {
  getListingRule,
  runSyncPreflight,
  assertPaymentMethodAllowed,
} from "../../../shared/checkout/rules";
/*
 * Phase 1c — the PER-CART gateway choice. `assertCollectingGateway` refuses
 * before capture (the `"online"` tender in `createCheckoutOrderAction`);
 * `resolveCollectingGatewayForCart` is the non-throwing form, used at SETTLE
 * where the money has already moved and a refusal would only deny the buyer
 * the order they paid for. See `gateway-selection.ts`.
 */
import {
  assertCollectingGateway,
  resolveCollectingGatewayForCart,
} from "./gateway-selection";
// The `GroupCouponDiscountResult` type is deliberately NOT imported: every
// call site here destructures the result inline, so naming the type would be
// an unused import.
import {
  computeCartCouponDiscount,
  computeGroupCouponDiscount,
} from "../../../shared/checkout/coupon-discount";
import { revalidateGroupLines } from "./group-rule-revalidation";
import { cartIsDigitalOnly, cartRequiresShipping } from "../../../shared/listing-types/cart-shipping";
import type { FirestoreDocument } from "../../../../schemas/types";
import { processRefundAction } from "../refunds/actions";
import {
  sendNotification,
  dispatchNotification,
} from "../../../../features/admin/actions/notification-actions";
import { ORDER_MESSAGES_SELLER } from "../../jobs/handlers/messages";
import { resolveSupplierIdentity } from "./supplier-identity";
import { PAYMENT_WINDOW_MS } from "../../../../features/orders/constants/payment-window";
import { assertCheckoutValueOtp } from "./value-otp-gate";
/*
 * Item 1.39 — the blocking buyer policy agreement. Lives under
 * `_internal/server/payments/` rather than beside the other checkout gates
 * because BOTH order paths need it and one of them (the gateway path) takes
 * consent in a different request from the one that places the order.
 */
import {
  assertBuyerPolicyConsent,
  attachOrdersToPolicyConsent,
  loadBuyerPolicyConsent,
  type SubmittedPolicyConsent,
} from "../../payments/policy-consent";
import type { OrderPolicyConsent } from "../../../shared/checkout/policy-consent";
/*
 * The fulfilment question, asked of the ORDER WORKFLOW REGISTRY rather than of
 * a listing-type literal. See the call site in `finalizeOrderPlacement`: both
 * predicates fold the capability row together with the listing's own
 * `digitalCode.codeDeliveryMethod` opt-in, which is the half the old
 * `listingType === "digital-code"` comparison could not see.
 */
import {
  awaitsManualRelease,
  fulfilsOnPayment,
} from "../../../shared/features/orders/workflow-registry";
/*
 * The `pending_release` write. Server-side and transactional, so it lives
 * beside the release action it hands the line over to rather than in the shared
 * registry — the registry decides, this performs.
 */
import { markAwaitingRelease } from "../digital-code/release";
/*
 * 🛑 The ONLY legal way to read `finalSale`. The field is optional and the
 * platform default is TRUE, so `!p.finalSale` and `p.finalSale === true` both
 * misread absence — see the helper's own header. Imported from the defining
 * module rather than a barrel: it is a pure predicate with no firebase-admin
 * in its chain.
 */
import { isFinalSale } from "../../../../features/products/constants/final-sale";

const AUDIT_LOG_FAIL_MSG = "checkout: audit log failed (non-critical)";

/**
 * How long a `gatewayOrderClaims` holder owns the right to place an order
 * before another caller may take the claim over.
 *
 * 🛑 Sized against the SLOWEST legitimate placement, not the typical one. The
 * route runs with `maxDuration = 60`, and a placement fans out to the gateway
 * re-fetch, the cart read, product validation, stock decrements and N order
 * writes — so a lease shorter than the work would let a second placer start
 * while the first is still mid-write, which is the duplicate order the claim
 * exists to prevent. 90s is that ceiling plus headroom.
 *
 * It is also the buyer's worst-case wait before a retry can succeed, which is
 * the other reason not to make it generous: before this existed the wait was
 * unbounded, because a failed placement left the claim forever.
 */
const GATEWAY_CLAIM_LEASE_MS = 90_000;

/**
 * SB-UNI-N — Atomically claim the next available digital code for a confirmed
 * order. Pre-fetches a candidate code outside the transaction then locks and
 * verifies in a micro-transaction. Fire-and-forget safe (logs on exhaustion
 * but never fails the already-created order).
 */
async function claimDigitalCodeForOrder(
  db: ReturnType<typeof getAdminDb>,
  productId: string,
  orderId: string,
  userId: string,
  opts?: { userEmail?: string; userName?: string; productTitle?: string },
): Promise<void> {
  const codesRef = db
    .collection(PRODUCT_COLLECTION)
    .doc(productId)
    .collection(PRODUCT_CODES_SUBCOLLECTION);
  const snap = await codesRef.where(ORDER_FIELDS.STATUS, "==", "available").limit(1).get();
  if (snap.empty) {
    serverLogger.warn("claimDigitalCode: code pool exhausted", { productId, orderId });
    return;
  }
  const codeRef = snap.docs[0].ref;
  let claimed = false;
  await db.runTransaction(async (tx) => {
    const latest = await tx.get(codeRef);
    if (!latest.exists || latest.data()?.status !== "available") return;
    tx.update(codeRef, {
      status: "claimed",
      orderId,
      claimedByUserId: userId,
      claimedAt: new Date(),
      updatedAt: new Date(),
    });
    claimed = true;
  });
  if (claimed) {
    /*
     * Re-derive both pool counters. Nothing used to do this: the claim flipped a
     * code to `claimed` and left `digitalCode.codesAvailable` exactly as the
     * seller had typed it, so the availability predicate — which reads that
     * counter — could never notice a listing selling out. Counting beats
     * decrementing here because the counter was never trustworthy to begin with
     * (Root Cause #42).
     *
     * Deliberately awaited but non-fatal inside: a failed recount must not undo
     * a claim the buyer has already paid for.
     */
    const { recountPool } = await import("../digital-code/pool");
    await recountPool(productId).catch((e) =>
      serverLogger.error("claimDigitalCode: recount failed", {
        error: normalizeError(e).message,
        productId,
      }),
    );
  }
  if (claimed && opts?.userEmail) {
    const { sendDigitalCodeClaimedEmail } = await import("../../../../features/contact/server");
    sendDigitalCodeClaimedEmail({
      to: opts.userEmail,
      userName: opts.userName ?? "there",
      productTitle: opts.productTitle ?? "your product",
      orderId,
    }).catch((e) => serverLogger.error("claimDigitalCode: email failed", { error: normalizeError(e).message }));
  }
}

/**
 * SB-UNI-O — Live-item jurisdiction guard.
 * Throws ValidationError if any live cart item's allowed states don't include
 * the buyer's delivery address state (case-insensitive substring match).
 * No-ops when the cart has no live items or when jurisdictionAllowed is empty.
 */
function assertLiveJurisdiction(
  cartItemsArg: CartItemDocument[],
  productByIdArg: Map<string, ProductDocument>,
  buyerState: string,
): void {
  const normalised = buyerState.trim().toLowerCase();
  for (const item of cartItemsArg) {
    if ((item.listingType ?? "standard") !== "live") continue;
    const product = productByIdArg.get(item.productId);
    if (!product?.liveItem?.jurisdictionAllowed?.length) continue;
    const allowed = product.liveItem.jurisdictionAllowed;
    const allowed_lower = allowed.map((s) => s.toLowerCase());
    const ok = allowed_lower.some(
      (a) => a === normalised || a.includes(normalised) || normalised.includes(a),
    );
    if (!ok) {
      throw new ValidationError(
        `Delivery to "${buyerState}" is not permitted for "${product.title}". Allowed regions: ${allowed.join(", ")}.`,
      );
    }
  }
}

/**
 * Fire-and-forget in-app notifications when an order is created.
 *
 * The Cloud Function `onOrderStatusChange` only fires on status transitions
 * (not on creates), so a brand-new order never produces an in-app row for
 * either party. We emit the buyer + seller rows here at the create boundary.
 */
function emitOrderPlacedNotifications(args: {
  orderId: string;
  buyerUid: string;
  buyerName: string;
  /**
   * ⚠ NO LONGER READ. The seller is resolved from `storeId` inside
   * `dispatchNotification`, so a notification about a store follows the store
   * rather than whoever owned it when the order was placed.
   *
   * Kept on the type because the caller already has it and removing it would
   * push a signature change into the order-creation path for no behavioural
   * gain. 🛑 Do not reintroduce a send that addresses it.
   */
  storeOwnerId: string | undefined;
  productLabel: string;
  paid: boolean;
  /**
   * The seller. `sendNotification` reads their WhatsApp subscription to decide
   * the WhatsApp arm — the per-order addon this replaced put that choice on the
   * buyer, who should not have to purchase their own delivery updates.
   */
  storeId: string | undefined;
}): void {
  const { orderId, buyerUid, buyerName, productLabel, paid, storeId } = args;

  /*
   * ONE `dispatchNotification`, not two `sendNotification` calls.
   *
   * The two calls this replaces were correct about the thing most such pairs
   * get wrong — the seller already had their own title, message and store
   * action URL — but they were two independent statements of one event, and
   * three things fell out of that:
   *
   * 🛑 The seller never received a WhatsApp message. Only the BUYER's call
   * passed `storeId`, and `storeId` is what `sendNotification`'s WhatsApp arm
   * resolves the store's subscription from. So a seller paying for WhatsApp
   * order updates got an in-app row and an email and nothing on WhatsApp,
   * from the one event they most wanted it for.
   *
   * ⚠ The seller was addressed by `storeOwnerId` captured at checkout rather
   * than resolved from the store. A notification about a store should follow
   * the store, not whoever owned it at the moment the order was placed.
   *
   * ⚠ Neither call consulted the registry, so an admin narrowing
   * `order_placed` in the notification matrix changed nothing here — the
   * screen would have claimed an authority it did not have over this path.
   *
   * `storeOwnerId` is consequently no longer read. It stays on the input type
   * because the caller computes it for other purposes; see the note there.
   */
  void dispatchNotification({
    userId: buyerUid,
    type: "order_placed",
    priority: "normal",
    title: "Order placed",
    message: `Your order for ${productLabel} has been placed.`,
    relatedId: orderId,
    relatedType: "order",
    /*
     * ⚠ Buyer-shaped, and only the buyer receives it: `audience: "seller"`
     * makes the seller arm resolve its own `/store/orders/{id}/view`.
     */
    actionUrl: `/user/orders/view/${orderId}`,
    storeId,
    sellerCopy: {
      title: ORDER_MESSAGES_SELLER.PLACED_TITLE,
      message: ORDER_MESSAGES_SELLER.PLACED_MESSAGE(productLabel, buyerName, paid),
    },
  }).catch((err: unknown) =>
    serverLogger.warn("Failed to dispatch order_placed notifications", {
      err: err instanceof Error ? err.message : String(err),
      orderId,
    }),
  );
}

export interface CreateCheckoutOrderInput {
  userId: string;
  userName: string;
  userEmail: string;
  /** Required for physical carts; omitted for digital-code-only carts (no shipping). */
  addressId?: string;
  paymentMethod: CheckoutPaymentMethod;
  /**
   * LEGACY ONLY. The instalment plan lives on `CartDocument.emiPlan`, written
   * by `PUT /api/cart/emi`, because the online path needs the same answer in
   * two separate requests (see that field's own note). This is honoured solely
   * for a tab opened before 2026-10-22, which posts `paymentMethod: "emi"`
   * plus a tenure here and has nothing on the cart — and it is ignored
   * whenever the cart carries a plan, so a client can never re-price a quote
   * the server has already issued.
   *
   * 🛑 "Pay in instalments" is an opt-in ON THE ORDER, orthogonal to the
   * tender: the token is collected by whichever payment method the buyer
   * picked. `resolveEmiChoice` is the one expression both axes resolve
   * through, and `emiTenderFor` maps the legacy `"emi"` tender.
   */
  emiTenureMonths?: number;
  /**
   * WHICH shipping option the buyer picked. Only `courierId` is read.
   *
   * 🛑 EVERY AMOUNT ON THIS OBJECT IS IGNORED (2026-11-08). The docstring that
   * stood here said *"`chargedRate` is TRUSTED from the client, and that is a
   * deliberate, bounded decision"*, and named re-quoting the carrier at order
   * time as "the gap worth closing … tracked separately". It was not bounded:
   * measured live on a ₹149 item, an honest request charged ₹172.69 and a
   * forged `{ chargedRate: 1 }` charged ₹222.69, because `roundShippingUp`
   * bounds a forgery only to the nearest ₹50 in whichever direction the forger
   * chose. The gap is now closed — `carrierOptionsForDestination` re-quotes
   * server-side and `resolveShippingSelection` prices the choice.
   *
   * The shape is unchanged so no client breaks, and `requestedShippingOptionId`
   * is the one function that narrows it to its identity. Think of it as an
   * option id wearing a legacy wire format.
   *
   * 🛑 OPTIONAL, and its absence is still meaningful: a cart whose carrier quote
   * failed, a digital-only cart, or any caller written before the picker existed
   * falls back to `resolveShippingCost` exactly as before — which is also a
   * server number, resolved from the seller's stored policy. Absence is what
   * makes reconciliation skip the order as "no-quote" rather than measuring a
   * seller's spend against a figure nobody was charged.
   *
   * 🛑 A `courierId` of `"custom"` selects the SELLER'S OWN rate. That is how a
   * client expresses the second half of the owner's spec without a new field;
   * `platformShippingOptionId` namespaces carrier ids so a carrier literally
   * named `custom` cannot land a buyer on the wrong side of the obligation.
   */
  selectedShippingQuote?: SelectedShippingQuote;
  /**
   * The buyer's shipping choice PER SELLER — `storeId` → `optionId`.
   *
   * `"custom"` selects the seller's own rate; `"platform:<courierId>"` selects
   * a carrier quote. Both ids come from `CheckoutPricingPreviewStore.
   * shippingOptions`, which the server built, so a client echoes back an id it
   * was offered rather than inventing one.
   *
   * 🛑 An id this seller does not offer REFUSES the order. It is not defaulted
   * to the cheapest available: the buyer agreed to a named method at a named
   * price, and substituting another is the same wrong as trusting their number,
   * pointed the other way.
   *
   * 🛑 Absent for a store means "no choice made", which falls back to that
   * seller's stored single-mode policy via `resolveShippingCost` — still a
   * server number. That is what keeps a pre-picker client, a digital-only cart
   * and a cart whose carrier quote failed all working unchanged.
   */
  selectedShippingOptions?: Record<string, string>;
  /*
   * 🛑 `pointsToRedeem` was REMOVED from this interface, 2026-10-21 (D46).
   *
   * Its handler debited points without reducing the charge — see the long note
   * at the former call site, further down this file. The field is deleted
   * rather than left as an accepted-but-ignored input, because an input a
   * caller can set is an input somebody wires up: this one had a careful
   * docstring about trimming and triple-checking the balance, all of which was
   * true and none of which mattered, since nothing ever reduced what the
   * gateway captured.
   *
   * When redemption is built properly it arrives as a STAGE in
   * `computeCheckoutTotal`, so the amount flows through the same pipeline as
   * every other money term and the capture, the guard and the order record
   * cannot disagree about it.
   */
  notes?: string;
  excludedProductIds?: string[];
  /**
   * Item 1.39 — what the buyer ticked, as echoed back by the client.
   *
   * 🛑 NOTHING in here is trusted. It is `{ accepted, version, hash }`, and the
   * gate re-resolves the applicable policy from the cart's own listing types
   * and the live settings before comparing. A client cannot assert a weaker
   * policy than the cart requires: a mismatched hash is a refusal, not an
   * override. See `assertBuyerPolicyConsent`.
   */
  policyConsent?: SubmittedPolicyConsent;
  /** When true this is an admin test order — OTP consent is pre-granted and the order is created paid/processing. */
  adminBypass?: boolean;
  /** UID of the admin who triggered the bypass. Set when adminBypass is true. */
  adminBypassBy?: string;
  /**
   * Buyer's choice for what to do when a cart item is unavailable at
   * checkout time. Defaults to "skip_items" — preserves this path's
   * historical behavior (ship the rest of the order) for any caller that
   * omits the field.
   */
  outOfStockPolicy?: OutOfStockPolicy;
  // Add-ons are intentionally absent: they are per-store and read from
  // `CartDocument.storeAddons`, which is the same key the cart splits on and
  // therefore the granularity they are billed at. This action already ignored
  // these fields — they are removed so a caller cannot pass one and be silently
  // overruled (Root Cause #65).
}

function accumulateCouponUsage(
  accumulator: Map<string, { couponId: string; code: string; orderIds: string[]; totalDiscount: number }>,
  couponCode: string,
  couponId: string,
  discountAmount: number,
): void {
  const entry = accumulator.get(couponCode) ?? {
    couponId,
    code: couponCode,
    orderIds: [],
    totalDiscount: 0,
  };
  entry.totalDiscount += discountAmount;
  accumulator.set(couponCode, entry);
}

/**
 * Exported so `/api/payment/create-order` (pre-charge amount) and the
 * read-only `previewCheckoutPricing` (Order Summary display) can compute the
 * exact same per-seller shipping fee that order creation charges/records —
 * a single source of truth instead of a third re-implementation.
 */
export async function resolveShippingCost(
  storeId: string | undefined,
  /**
   * The cart facts needed to QUOTE rather than merely resolve the policy.
   *
   * 🛑 D44 — OMITTING THIS IS TWO MONEY BUGS IN OPPOSITE DIRECTIONS, and until
   * now every one of the five call sites omitted it.
   *
   * `quoteShipping` was called exactly once, here, with `goodsValue: 0` and
   * `carrierRate: null`. Measured against its own logic
   * (`shared/features/shipping/mode.ts`):
   *
   * 1. **Free-above-threshold can never fire.** The test is
   *    `goodsValue >= policy.freeAbove`, and `0 >= 999` is false for any
   *    positive threshold — so a store advertising "free shipping over ₹999"
   *    **charged its base rate on a ₹5,000 order.** The buyer is OVERCHARGED,
   *    and the seller's own offer silently does not exist.
   * 2. **`estimate` mode ships FREE.** No carrier rate returns
   *    `kind: "unavailable"`, which the mapping below turns into
   *    `shippingFee: 0` — and `shippingUnavailable` had **zero consumers**, so
   *    nobody noticed. The platform/seller is UNDERCHARGED, which is what that
   *    field's own 🛑 warns about: "a zero there would ship every parcel free
   *    at our expense, silently, until somebody noticed."
   *
   * `flat` and `free` modes were unaffected, which is why this survived: the
   * common cases are correct and only a store with a threshold or an estimate
   * policy is mispriced.
   *
   * Still optional, because the one legitimate caller is the seller-settings
   * surface that wants the POLICY and has no cart. Every money path passes it.
   */
  opts?: {
    /** The group's goods value in decimal rupees, from `lineTotalFor`. */
    goodsValue?: number;
    /** A real carrier rate, when one was obtained. `null` = none available. */
    carrierRate?: number | null;
  },
): Promise<{
  shippingFee: number;
  storeOwnerId: string | undefined;
  storeState: string | undefined;
  /**
   * §B — this store's payment-method defaults, keyed by method slug.
   *
   * Returned from the store document this function already reads, for the
   * same reason `storeTaxIdentity` and `settlementVendors` are: a separate
   * `storeRepository.findById` to learn one map would spend a Firestore read
   * per order group against Rule #6's round-trip budget.
   *
   * 🛑 `undefined` means NO OPINION, never "nothing allowed".
   * `resolvePaymentMethod` chains `listing ?? store ?? platformDefault` with
   * `??` so an absent map falls through to the platform floor — a store that
   * has never opened the payments screen must keep accepting what the
   * platform accepts.
   */
  storePaymentMethods: Record<string, boolean> | undefined;
  /** C5b — the resolved policy, so a caller can quote with the cart in hand. */
  shippingPolicy: StoreShippingPolicy;
  /**
   * What this seller WILL SHIP BY — the two-axis offer (owner, 2026-11-08).
   *
   * Returned from the store read this function already performs, for the same
   * reason `storeTaxIdentity` and `storeProtections` are: a second `findById`
   * per order group would spend a Firestore read against Rule #6's ~3
   * round-trip budget to learn one object.
   *
   * 🛑 THIS is the authority the buyer's posted option is validated against.
   * `shippingFee` above is the fee for the seller's stored single-mode policy
   * and remains the answer when the buyer selected nothing; it is NOT the
   * answer when they did. See `resolveShippingSelection`.
   */
  shippingOffer: SellerShippingOffer;
  /**
   * The seller's own tax registration, from the store read this function
   * already performs.
   *
   * Returned here rather than re-fetched in `createOrderForGroup` so the
   * checkout path pays no extra Firestore read for data already in scope
   * (Rule #6). Raw fields, not a resolved identity — the seller-vs-platform
   * decision belongs to `resolveSupplierIdentity` alone.
   */
  storeTaxIdentity:
    | { gstin?: string; legalName?: string; registeredAddress?: string }
    | undefined;
  /**
   * 🛑 True when the mode is `estimate` and no carrier rate was supplied.
   *
   * The caller MUST act on this rather than trusting `shippingFee: 0` — a
   * zero there would ship every parcel free at our expense, silently, until
   * somebody noticed. Returning both is what makes the distinction visible.
   */
  shippingUnavailable: boolean;
  /**
   * C5e tier 2 — which protections this seller has agreed to be held to.
   *
   * Carried here rather than read separately because this function already
   * holds the store document, and a second `findById` per order group would
   * spend a Firestore read against Rule #6's ~3-round-trip budget to learn two
   * booleans. (The function already returns `storeEmiEnabled` and `storeState`
   * for the same reason; it resolves per-store checkout facts, and its name is
   * narrower than its job.)
   *
   * 🛑 Absence resolves to `false` HERE, once, so no caller has to decide what
   * `undefined` means on a liability flag.
   */
  storeProtections: { shipping: boolean; sale: boolean };
  /**
   * Decision 22 — does this seller accept buyer points as part-payment?
   *
   * Here for the same reason as `storeProtections` directly above: the store
   * document is already in hand, and the accepting store ABSORBS the
   * redemption against its own payout, so this is a liability flag and absence
   * resolves to `false` exactly once, here.
   *
   * 🛑 Resolved through `storeAcceptsPoints()`, never a bare field read — the
   * platform's own storefront always accepts and that is decided in code
   * rather than by a seeded flag somebody can switch off.
   */
  acceptsPoints: boolean;
  /**
   * S5a — the shared-purchase rates, from the store read this function already
   * performs.
   *
   * Returned RAW rather than as a quote, for the same reason
   * `storeTaxIdentity` is: the decision (how many destinations, and therefore
   * what it costs) belongs to the caller that knows the lines. This function
   * resolves per-store facts.
   *
   * 🛑 `undefined` on a fee is preserved and NOT defaulted to 0 — a seller who
   * opted in without pricing it has not agreed to do it free. `quoteSharedPurchase`
   * reports that as `unpriced` and the caller refuses.
   */
  sharedPurchaseRates: SharedPurchaseRates;
  /**
   * Phase 3 — this store's split-settlement vendor registrations, per gateway.
   *
   * Here for the same reason `storeTaxIdentity`, `storeProtections` and
   * `sharedPurchaseRates` are: this function already holds the store document,
   * and a second `findById` per order group would spend a Firestore read
   * against Rule #6's ~3-round-trip budget to learn one nested object. (Its
   * name is narrower than its job — it resolves per-store checkout facts.)
   *
   * 🛑 Returned RAW, keyed by gateway, with no "is it settleable" verdict. The
   * caller knows WHICH gateway will collect; this function does not, and
   * answering for a gateway it guessed at is how a split instruction gets built
   * against the wrong registration.
   */
  settlementVendors: Record<string, StoreSettlementVendor> | undefined;
}> {
  if (!storeId) {
    return {
      shippingFee: 0,
      storeOwnerId: undefined,
      storeState: undefined,
      // No store, so no seller opinion -- the platform default applies.
      storePaymentMethods: undefined,
      shippingPolicy: DEFAULT_STORE_SHIPPING_POLICY,
      // No store, so no offer. The default is custom at ₹0 — the same thing
      // `DEFAULT_STORE_SHIPPING_POLICY` says, and for the same reason.
      shippingOffer: { ...DEFAULT_SELLER_SHIPPING_OFFER },
      shippingUnavailable: false,
      storeProtections: { shipping: false, sale: false },
      // No store, so no seller to absorb a redemption.
      acceptsPoints: false,
      // No store, so nobody to pack N parcels.
      sharedPurchaseRates: { allowSharedPurchase: false },
      // No store, so no seller registration — the caller falls back to the
      // platform's via resolveSupplierIdentity.
      storeTaxIdentity: undefined,
      // No store, so no vendor. The split builder treats that as NOT settleable
      // and refuses the capture rather than collecting into our own account.
      settlementVendors: undefined,
    };
  }
  const store = await storeRepository.findById(storeId);
  const storeOwnerId = store?.ownerId;
  // `store` is passed in rather than re-fetched inside: G3 needs its `gstin`,
  // and the document is already in hand one line above. A second
  // `storeRepository` read here is what line ~504's comment warns against,
  // and it would cost a Firestore read on every checkout (Rule #6).
  const storeState = await resolveStoreState(storeId, store?.gstin);

  /*
   * ── C5b: the store's shipping MODE, not a flat number ──────────────────
   *
   * This read `sellerUser.shippingConfig.customShippingPrice ?? 0` — one flat
   * rupee figure off the store OWNER's user document, with no weight,
   * destination, pincode or courier in it. Meanwhile `ShippingConfigDocument`
   * (zones, per-kg rates, free-above, express surcharge, full CRUD, seed data)
   * was read by NO money path at all, so there were two shipping-config
   * systems and the authoritative one was the flat number by accident.
   *
   * 🛑 The policy lives on the STORE, because shipping is charged per store
   * and `splitCartIntoOrderGroups` groups on `storeId` — a user who owns two
   * stores would otherwise price both the same, which is Root Cause #65's
   * granularity mismatch.
   *
   * 🛑 The LEGACY flat number is still honoured as a `flat` mode when a store
   * has no policy of its own. Not for compatibility's sake — for correctness:
   * a seller who set ₹100 on the old surface and has not seen the new one must
   * keep charging ₹100, not silently drop to free. Migration is a seller
   * visiting their settings, not a reseed.
   */
  const policy = store?.shippingPricing
    ? toStoreShippingPolicy(store.shippingPricing)
    : await legacyFlatPolicy(storeOwnerId);

  /*
   * 🛑 D44 FIXED HERE: the quote now uses the caller's real goods value.
   *
   * This comment used to read *"`goodsValue: 0` and no carrier rate here,
   * deliberately… a caller that needs the charged amount calls `quoteShipping`
   * with the group's goods value"*. The design was right and **no caller ever
   * did it** — `quoteShipping` had exactly one call site, this one, and all
   * five callers destructured `shippingFee` and ignored both `shippingPolicy`
   * and `shippingUnavailable`. A seam nobody used is not a seam; it is a
   * default, and this default mispriced two policy shapes (see the `opts`
   * docstring above).
   *
   * Defaulting `goodsValue` to 0 keeps the policy-only callers behaving
   * exactly as before, so this is additive for them and corrective for the
   * money paths.
   */
  const quote = quoteShipping({
    policy,
    goodsValue: opts?.goodsValue ?? 0,
    carrierRate: opts?.carrierRate ?? null,
  });

  /*
   * ── D44, the other half: `shippingUnavailable` gets its FIRST CONSUMER ────
   *
   * The field was declared, assigned twice, and read by nothing — its own 🛑
   * said "the caller MUST act on this rather than trusting `shippingFee: 0`"
   * and no caller did. So an `estimate`-mode store shipped every parcel free.
   *
   * 🛑 IT DOES NOT REFUSE THE CHECKOUT, and that is a deliberate choice rather
   * than timidity. **There is no carrier-rate source in the system at all**:
   * Shiprocket is authenticated but its create-order/AWB/rate calls are
   * unverified with zero callers, so `carrierRate` can only ever be null today.
   * Throwing here would therefore break checkout for every estimate-mode store
   * outright — converting a silent revenue leak into a total outage for those
   * sellers, which is the worse of the two.
   *
   * So the leak is made VISIBLE instead: one case per store (the dedupe key is
   * the store, so a hundred checkouts produce one row), carrying the amount we
   * failed to charge. Once somebody has measured how many stores are actually
   * in `estimate` mode, refusing becomes the correct stricter behaviour — and
   * that measurement is a one-line query, not a design question.
   *
   * Fire-and-forget: a case write must never fail the checkout it is
   * reporting on.
   */
  if (quote.kind === "unavailable" && opts?.goodsValue !== undefined) {
    void paymentCasesRepository()
      .openOrObserve({
        kind: "shipping_unpriced",
        subjectId: storeId,
        severity: "warning",
        title: `Shipping could not be priced — ${storeId} is shipping free`,
        detail: [
          `This store's shipping policy is \`estimate\` mode and no carrier rate`,
          `was available, so the quote came back "unavailable" and the checkout`,
          `charged ₹0 for shipping.`,
          "",
          `Store: ${storeId}`,
          `Goods value on this order group: ${opts.goodsValue}`,
          "",
          `🛑 There is no carrier-rate integration wired, so this will recur for`,
          `every order from this store. Fix by giving the store a \`flat\` or`,
          `\`free\` policy in its shipping settings, or by wiring a rate source.`,
        ].join("\n"),
        entityType: "store",
        entityId: storeId,
      })
      .catch((err: unknown) => {
        void normalizeError(err);
      });
  }

  return {
    shippingFee: quote.kind === "charge" ? quote.amount : 0,
    storeOwnerId: storeOwnerId ?? undefined,
    storeState,
    storePaymentMethods: store?.paymentMethods,
    shippingPolicy: policy,
    /*
     * 🛑 Resolved from the STORED `shippingPricing` document, falling back to
     * the offer the legacy single mode implies — never from anything the
     * client sent. `toSellerShippingOffer` reads the explicit `offer` when the
     * seller has saved one and derives it from `mode` otherwise, so there is
     * one stored field and one reader rather than a second config system
     * (`mode.ts`'s header records what happened last time there were two).
     *
     * `store?.shippingPricing` is passed rather than `policy`, because the
     * explicit offer is a sibling of `mode` on that document and `policy` has
     * already discarded it.
     */
    shippingOffer: store?.shippingPricing
      ? toSellerShippingOffer(store.shippingPricing)
      : offerFromPolicy(policy),
    shippingUnavailable: quote.kind === "unavailable",
    storeProtections: {
      shipping: store?.supportsShippingProtection === true,
      sale: store?.supportsSaleProtection === true,
    },
    acceptsPoints: storeAcceptsPoints(store, storeId),
    // S5a — raw, so the caller can tell "not configured" from ₹0.
    sharedPurchaseRates: {
      allowSharedPurchase: store?.allowSharedPurchase === true,
      sharedPurchaseHandlingFee: store?.sharedPurchaseHandlingFee,
      sharedPurchaseExtraShippingPerDestination:
        store?.sharedPurchaseExtraShippingPerDestination,
    },
    /*
     * The seller's own tax registration, returned from the store read this
     * function ALREADY does.
     *
     * Deliberately not a second `storeRepository.findById` in
     * `createOrderForGroup`: that would add one Firestore read per order group
     * to the checkout path for data already sitting in this scope, against
     * Rule #6's round-trip budget. Returning the three raw fields rather than
     * the resolved identity keeps the decision in one place —
     * `resolveSupplierIdentity` — instead of splitting it across a shipping
     * helper and a checkout action.
     */
    storeTaxIdentity: store
      ? {
          gstin: store.gstin,
          legalName: store.legalName,
          registeredAddress: store.registeredAddress,
        }
      : undefined,
    /*
     * Raw and per gateway — see the field's own 🛑. The store document is
     * already in hand, so this costs nothing; deciding settleability here would
     * mean guessing which gateway collects.
     */
    settlementVendors: store?.settlementVendors,
  };
}

/**
 * The carrier options for a destination, obtained SERVER-SIDE at order time.
 *
 * ## 🛑 This outbound call is the whole point
 *
 * `CreateCheckoutOrderInput.selectedShippingQuote` used to carry the rates, and
 * its own docstring conceded the gap: *"the gap worth closing is re-quoting the
 * carrier at order time, which costs an outbound call on the payment path and
 * is tracked separately."* It is closed here. One call, only for a seller who
 * actually accepts carrier quotes, and only when the buyer picked one — a cart
 * whose seller ships their own way performs no call at all.
 *
 * ## 🛑 Returns `[]` on EVERY failure, and `[]` means "no platform option"
 *
 * Not "free", and not "trust whatever the client said". An empty list makes
 * `resolveShippingSelection` refuse a platform pick with
 * `no-method-available`, which is the owner's own rule for this case: *"the
 * platform option is ABSENT at checkout rather than guessed."* The alternatives
 * are both money defects — guessing a rate charges the buyer a number no
 * carrier quoted, and falling back to the client's figure is the defect this
 * whole change exists to remove.
 *
 * Today the registered provider is `ManualShippingProvider`, whose
 * `checkServiceability` returns `{ isServiceable: true, couriers: [] }` — so
 * this legitimately yields zero options on every call until a real carrier
 * account is wired, and a forged platform pick is therefore REFUSED rather than
 * mispriced. Measured, not assumed: `providers.config.ts` defaults
 * `siteSettings.shipping.provider` to `"manual"`.
 */
async function carrierOptionsForDestination(
  pincode: string | undefined,
  weightKg: number,
): Promise<ShippingQuoteOption[]> {
  if (!pincode) return [];
  const shipping = getProviders().shipping;
  if (!shipping) {
    serverLogger.error("checkout carrier re-quote: no shipping provider registered", {
      pincode,
    });
    return [];
  }
  try {
    const result = await shipping.checkServiceability(pincode, weightKg);
    if (!result.isServiceable) return [];
    return toQuoteOptions(result.couriers);
  } catch (err: unknown) {
    /*
     * A carrier outage must not 500 a checkout. It removes the platform option
     * — which is a refusal the buyer can act on ("choose the seller's own
     * shipping, or retry") — rather than taking the order at a price nobody
     * quoted.
     */
    serverLogger.error("checkout carrier re-quote failed", {
      pincode,
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * The carrier's own minimum weight slab, used when the cart cannot say what the
 * parcel weighs.
 *
 * Same figure and same reasoning as `POST /api/shipping/quote`: the cart does
 * not reliably carry per-item weights, 0.5 kg is the carrier's own floor, and a
 * heavier parcel quotes low — which the reconciliation rule already handles by
 * making the seller absorb the difference. Shared as a constant so the quote
 * the buyer was shown and the quote the order is priced from cannot differ by
 * their default weight.
 */
export const CHECKOUT_DEFAULT_PARCEL_WEIGHT_KG = 0.5;

/**
 * Which option id the buyer's posted pick corresponds to.
 *
 * 🛑 Reads the IDENTITY out of `selectedShippingQuote` and discards every
 * amount on it. That object is a legacy wire shape carrying
 * `rawRate`/`chargedRate`, and those two numbers are precisely what must not
 * reach the total — so this function exists to make the narrowing mechanical
 * rather than a thing each call site has to remember.
 *
 * A pick whose `courierId` is the literal custom id maps to the custom option;
 * `platformShippingOptionId` namespaces carrier ids for exactly that reason, so
 * a carrier returning `"custom"` cannot land a buyer on the wrong side of the
 * fulfilment obligation.
 */
function requestedShippingOptionId(
  quote: Pick<SelectedShippingQuote, "courierId"> | undefined,
): string | undefined {
  if (!quote?.courierId) return undefined;
  if (quote.courierId === CUSTOM_SHIPPING_OPTION_ID) return CUSTOM_SHIPPING_OPTION_ID;
  return platformShippingOptionId(quote.courierId);
}

/**
 * The pre-C5b flat number, read as a `flat` mode.
 *
 * One extra read, and only for a store that has never saved a policy — so it
 * disappears as sellers touch their settings rather than needing a migration.
 */
async function legacyFlatPolicy(
  storeOwnerId: string | undefined,
): Promise<StoreShippingPolicy> {
  if (!storeOwnerId) return DEFAULT_STORE_SHIPPING_POLICY;
  // shippingConfig is seller-only data — sellerProfiles, not users.
  const sellerProfile = await sellerProfileRepository.findById(storeOwnerId);
  const legacy = sellerProfile ? sellerProfileRepository.revealProfile(sellerProfile).shippingConfig : undefined;
  if (!legacy?.isConfigured) return DEFAULT_STORE_SHIPPING_POLICY;
  const amount = legacy.customShippingPrice ?? 0;
  if (!(amount > 0)) return DEFAULT_STORE_SHIPPING_POLICY;
  return { mode: { kind: "flat", amount } };
}

/** P-8 GST — the seller's registered/pickup state, used to determine intra- vs inter-state tax. */
async function resolveStoreState(
  storeId: string,
  /**
   * The store's GSTIN, supplied by the caller which already holds the store
   * document. Not re-fetched here — see the call site.
   */
  storeGstin?: string,
): Promise<string | undefined> {
  /*
   * ── G3: the GSTIN's state code wins over the typed pickup address ────────
   *
   * A GSTIN's first two characters ARE the state of registration — it is
   * issued per state, so for a registered seller it is the authoritative
   * place of supply. The pickup address is free text a seller typed, and a
   * store whose pickup state disagrees with its GSTIN prefix (a warehouse in
   * another state, a typo, a seller who moved) splits the tax on the wrong
   * one.
   *
   * `resolveStateKey` accepts a bare code, a full GSTIN, or a name, so the
   * GSTIN goes to it whole rather than being sliced here — that keeps the
   * "first two characters are the state" knowledge in exactly one place.
   *
   * 🛑 Falls back to the pickup address rather than failing: an UNREGISTERED
   * seller legitimately has no GSTIN and is the common case on this platform.
   * Returns the canonical display NAME, not the raw code, so every downstream
   * reader still receives a state name.
   */
  const fromGstin = resolveStateKey(storeGstin);
  if (fromGstin) return INDIA_STATES[fromGstin].name;

  const addresses = await addressesRepository.listByOwner("store", storeId);
  const pickup = addresses.find((a) => a.isDefault) ?? addresses[0];
  return pickup?.state;
}

/*
 * 🛑 `computeGroupCouponDiscount` and `GroupCouponDiscountResult` MOVED to
 * `_internal/shared/checkout/coupon-discount.ts` on 2026-10-21. Imported at
 * the top of this file; do not re-add a local copy.
 *
 * It was module-private here, which meant the three order paths in this file
 * could reach it and `/api/payment/create-order` — the route that decides what
 * the buyer's CARD is charged — could not, because a consumer route cannot
 * deep-import `_internal/server`. That route consequently had no coupon term at
 * all, so every coupon order paid by card over-captured by the discount. One
 * implementation, four callers.
 */

function buildStockUpdatePayload(
  product: ProductDocument,
  qtyDelta: number,
): FirestoreDocument {
  const lt = (product.listingType ?? "standard") as ListingType;
  const rule = getListingRule(lt);
  return {
    availableQuantity: product.availableQuantity - qtyDelta,
    updatedAt: new Date(),
    ...rule.stockDecrementExtras(product, qtyDelta),
  };
}

interface StockResult {
  available: { item: CartItemDocument; product: ProductDocument }[];
  unavailable: NonNullable<CheckoutOrderResult["unavailableItems"]>;
  /**
   * Every product the checkout touched, members included — carried out of the
   * stock transaction rather than re-fetched. The transaction already reads
   * exactly this set for the decrement, so per-member GST costs zero extra
   * reads; the map simply never escaped the closure before.
   */
  productById: Map<string, ProductDocument>;
}

type CouponAccumEntry = { couponId: string; code: string; orderIds: string[]; totalDiscount: number };

export interface DroppedCoupon {
  code: string;
  reason: string;
}

/**
 * Re-checks every coupon persisted on the cart against the items actually
 * being ordered, immediately before pricing.
 *
 * A cart can sit for days, so the `discountAmount` frozen onto
 * `cart.appliedCoupons` at apply-time may since have become wrong or
 * unearned — the coupon may have expired, hit its total/per-user limit, been
 * deactivated, or had its eligible items removed from the cart. Trusting the
 * stored amount let all of those redeem anyway.
 *
 * Invalid coupons are DROPPED (and reported back to the caller) rather than
 * failing the whole checkout: the buyer is on the payment step and cannot fix
 * a lapsed coupon from there, so killing an otherwise-valid order is hostile.
 *
 * One parallel round of reads for at most a handful of coupons (the stacking
 * rule caps it at one per store plus one platform-wide), so this stays inside
 * the Vercel Hobby round-trip budget.
 */
async function revalidateAppliedCoupons(
  appliedCoupons: CartAppliedCoupon[],
  available: { item: CartItemDocument; product: ProductDocument | null }[],
  uid: string,
): Promise<{ coupons: CartAppliedCoupon[]; dropped: DroppedCoupon[] }> {
  if (appliedCoupons.length === 0) return { coupons: [], dropped: [] };

  const cartItems = available.map(({ item, product }) => ({
    productId: item.productId,
    storeId: item.storeId,
    price: unitPriceFor(item, product),
    quantity: item.quantity,
    listingType: (item.listingType ?? "standard") as ListingType,
  }));

  const results = await Promise.all(
    appliedCoupons.map(async (coupon) => {
      try {
        const check = await couponsRepository.validateCouponForCart(
          coupon.code,
          uid,
          cartItems,
          { resolveCategorySlugs: resolveCouponCategorySlugs },
        );
        if (!check.valid) {
          return {
            dropped: {
              code: coupon.code,
              reason: check.message ?? "This coupon is no longer valid",
            },
          };
        }
        // Re-derive the amount and the eligible lines from the CURRENT cart —
        // the stored values were computed against whatever was in the cart at
        // apply-time.
        const applicableItemIds = check.eligibleProductIds
          ? available
              .filter(({ item }) => check.eligibleProductIds!.includes(item.productId))
              .map(({ item }) => item.itemId)
          : undefined;
        return {
          coupon: {
            ...coupon,
            discountAmount: check.discountAmount ?? 0,
            scope: check.scope ?? coupon.scope,
            storeId: check.storeId ?? coupon.storeId,
            applicableItemIds,
          } satisfies CartAppliedCoupon,
        };
      } catch (err) {
        void normalizeError(err);
        // A lookup failure must not silently grant the discount.
        return {
          dropped: {
            code: coupon.code,
            reason: "This coupon could not be verified",
          },
        };
      }
    }),
  );

  const coupons: CartAppliedCoupon[] = [];
  const dropped: DroppedCoupon[] = [];
  for (const r of results) {
    if (r.coupon) coupons.push(r.coupon);
    else if (r.dropped) dropped.push(r.dropped);
  }
  if (dropped.length > 0) {
    serverLogger.info("Dropped invalid coupons at checkout", {
      uid,
      codes: dropped.map((d) => d.code).join(","),
    });
  }
  return { coupons, dropped };
}

async function flushCouponUsageAccumulator(
  accumulator: Map<string, CouponAccumEntry>,
  uid: string,
): Promise<void> {
  if (accumulator.size === 0) return;
  // W4 FIX: was a fire-and-forget `Promise.all(...).catch(...)` — the Vercel
  // lambda could terminate before these writes committed and coupon usage was
  // silently lost. The await below ensures every batch.commit() lands before
  // the caller resolves.
  try {
    await Promise.all(
      [...accumulator.values()].map(async ({ couponId, code, orderIds: ids, totalDiscount }) => {
        await couponsRepository.applyCoupon(couponId, code, uid, ids, totalDiscount);
        try {
          const coupon = await couponsRepository.findById(couponId);
          const perUserLimit = coupon?.usage?.perUserLimit ?? 1;
          const newCount = await couponsRepository.getUserCouponUsageCount(uid, couponId);
          if (newCount >= perUserLimit) {
            await claimedCouponsRepository
              .markUsed(uid, code, ids[0] ?? "")
              .catch(() => { /* no claim row — coupon never went through the wallet */ });
          }
        } catch (err) {
          void normalizeError(err);
          serverLogger.warn("Failed to update claimed-coupon status", { err: err instanceof Error ? err.message : String(err) });
        }
      }),
    );
  } catch (err) {
    void normalizeError(err);
    serverLogger.error("Failed to record coupon usage:", { err: err instanceof Error ? err.message : String(err) });
  }
}

function dispatchOrderConfirmationEmails(
  emailsToSend: Parameters<typeof sendOrderConfirmationEmail>[0][],
): void {
  if (emailsToSend.length === 0) return;
  Promise.all(emailsToSend.map((e) => sendOrderConfirmationEmail(e))).catch(
    (err: unknown) => serverLogger.error("Order confirmation email error:", err),
  );
}

// unitPriceFor now lives in _internal/shared/checkout/order-math.ts — one
// implementation for every money path, so an accepted offer's / won collector drop's
// lockedPrice can never be honoured by some call sites and ignored by others.

interface OrderGroupContext {
  paymentMethod: CheckoutPaymentMethod;
  /**
   * LEGACY cart-wide courier pick. Applied to the FIRST group only.
   *
   * 🛑 Only its `courierId` is read — every amount on it is ignored. See
   * `CreateCheckoutOrderInput.selectedShippingQuote` for the measured defect
   * that made that necessary.
   *
   * 🛑 Superseded by `selectedShippingOptions` below, and kept because a tab
   * opened before that field existed still posts this one. First group only, as
   * it always was: the old picker quoted ONE destination for the whole cart, so
   * applying it to every group would charge a multi-seller cart the same parcel
   * rate N times.
   */
  selectedShippingQuote?: SelectedShippingQuote;
  /**
   * The buyer's shipping choice PER SELLER — `storeId` → `optionId`.
   *
   * 🛑 Per store because shipping IS per store: the cart splits on `storeId`,
   * each seller offers their own methods, and `mocks/18-shipping-fees.qm` draws
   * exactly this — two seller groups in one cart, two shipping lines in the
   * order summary ("Shipping — BeyIndia courier ₹200" and "Shipping — RipZone
   * standard ₹59"). A cart-wide pick cannot express "ship A's parcel yourself
   * and send B's by Delhivery", which is the common case the owner's spec
   * creates the moment both axes can be enabled.
   *
   * 🛑 IDENTIFIERS ONLY. There is deliberately no amount in this shape, so
   * there is nothing for a client to tamper with — the server prices each
   * chosen option from the seller's stored offer plus its own carrier quote.
   * That is the structural half of the fix; the narrowing in
   * `requestedShippingOptionId` is the legacy half.
   */
  selectedShippingOptions?: Record<string, string>;
  /* `emiOptIn` / `emiTenureMonths` / `emiSettings` removed with EMI stage 5a. */
  commissions: CodHandlingFeeRates & WhatsAppNotifyFeeRates & GiftWrapFeeRates & ShipmentProtectionFeeRates & SaleProtectionFeeRates & { codDepositPercent: number };
  appliedCoupons: CartAppliedCoupon[];
  cartSubtotal: number;
  couponUsageAccumulator: Map<string, CouponAccumEntry>;
  uid: string;
  userName: string;
  userEmail: string;
  /**
   * Buyer's add-on selections, keyed by storeId — read off the cart document.
   *
   * Was four cart-wide booleans. Because add-on fees are computed inside the
   * per-group loop, a single boolean silently multiplied every add-on by the
   * number of stores in the cart, and gave the buyer no way to opt in for one
   * seller only. Each group now resolves its own entry.
   */
  storeAddons?: Record<string, CartStoreAddons>;
  /**
   * The buyer-facing platform commission apportioned to this group, in decimal
   * rupees. Computed once for the whole checkout (it is one commission on one
   * transaction, not a per-store charge) and split pro-rata across groups, so
   * the per-order values sum to exactly what the buyer was shown.
   */
  platformFeeByStore: Map<string, { platformFee: number; gstOnFee: number }>;
  /** LEGACY free text. Still written so old readers keep working; never read for booking. */
  shippingAddress?: string;
  /**
   * The structured, immutable copy of what the buyer chose (Part 14).
   * Absent for a digital-only cart, which has nowhere to ship to.
   */
  deliverySnapshot?: DeliverySnapshot;
  notes?: string;
  adminBypass: boolean;
  adminBypassBy?: string;
  adminBatchId?: string;
  orderIds: string[];
  emailsToSend: Parameters<typeof sendOrderConfirmationEmail>[0][];
  /** Buyer's chosen out-of-stock policy — set on every order created from this checkout batch. */
  outOfStockPolicy: OutOfStockPolicy;
  /** Full session's dropped items ("skip_items" policy) — set on every order created from this checkout batch. */
  droppedItems: NonNullable<CheckoutOrderResult["unavailableItems"]>;
  /** P-8 GST — buyer's shipping-address state, used to determine intra- vs inter-state tax. Undefined for digital-only carts. */
  buyerState?: string;
  /** P-8 GST — undefined/disabled means no GST is computed on this checkout. */
  gstSettings?: SiteSettingsDocument["gst"];
  /**
   * §B — the platform's payment block, so the store/listing method gate below
   * is self-sufficient rather than depending on a cart-wide check having
   * already run.
   *
   * A SLICE, not the whole settings singleton, following `gstSettings` beside
   * it: this context is already very large, and handing a group writer every
   * setting invites it to read things that are not its business.
   */
  paymentSettings?: SiteSettingsDocument["payment"];
  /*
   * 🛑 `siteContactUpiVpa` DELETED 2026-11-11. Its ONLY consumer was
   * `resolveDisplayedUpiId`, which went with the manual-payment flow, so it
   * had become config plumbing threaded three levels deep to reach nothing.
   * ⚠ `siteSettings.contact.upiVpa` itself STAYS — an admin can still record
   * the business VPA; checkout simply no longer shows it to a buyer.
   */
  /**
   * Item 1.39 — the buyer's policy agreement for this checkout.
   *
   * 🛑 REQUIRED, not optional, and that is the enforcement. `assertBuyerPolicyConsent`
   * either returns a record or throws, so there is no code path that reaches
   * order creation holding `undefined` — a consentless order is not
   * representable here rather than merely discouraged.
   */
  policyConsent: OrderPolicyConsent;
  /**
   * D46/D47 — the buyer ticked "pay with my points" on the cart.
   *
   * A boolean and nothing more (decision 24): opt in and as many points as the
   * 50% cap allows are applied, the remainder stays in the balance. The
   * AMOUNT is never client input.
   */
  useAllPoints: boolean;
  /**
   * 🛑 The checkout's points budget — a SHARED MUTABLE REMAINDER, not a
   * balance.
   *
   * Read once by the caller and drawn down by each accepting group, exactly as
   * `couponUsageAccumulator` and `platformFeeByStore` are shared across
   * groups. A per-group balance read would let two groups each believe they
   * could spend the whole balance; the second `redeem` would then refuse
   * inside its own transaction and leave an order recorded at a discount
   * nothing funded — a silent under-collection, which is the family this whole
   * pass exists to close.
   *
   * Zero when the buyer did not opt in, so no balance read happens at all.
   */
  pointsBudget: { remaining: number };
  /**
   * Every product touched by this checkout, keyed by id — INCLUDING the members
   * of bundle and grouped lines.
   *
   * The per-group `{item, product}` pairs carry only the line's REPRESENTATIVE
   * product (the first member), which is why per-member GST could not be
   * computed from them: the other members' rates were never in scope. Populated
   * from `getExpandedDecrements(...).productIds`, the same fan-out the stock
   * decrement already runs, so it costs no extra reads.
   */
  productById: Map<string, ProductDocument>;
}

/**
 * The buyer's points balance, or **0** if it cannot be read.
 *
 * 🛑 Failing OPEN to zero is the safe direction and the only safe direction: a
 * balance we could not read becomes "no discount applied", so the buyer is
 * charged the full amount and their points are untouched. The inverse — guessing
 * a balance — would reduce the charge against points that may not exist, which
 * is the shape of the deleted D46 block (it debited points and reduced nothing;
 * this is the same mistake with the signs swapped).
 *
 * A buyer who opted in and sees no discount can retry. There is no recoverable
 * outcome on the other side.
 */
async function safePointsBalance(userId: string): Promise<number> {
  try {
    return await pointsRepository.getBalance(userId);
  } catch (err: unknown) {
    const normalized = normalizeError(err);
    serverLogger.warn("[checkout] points balance unreadable — charging full amount", {
      userId,
      error: normalized.message,
    });
    return 0;
  }
}

/**
 * Debit the points an order was discounted by — the second half of the tender.
 *
 * 🛑 ONE implementation, called from BOTH order-creation paths. They are
 * ~200-line twins that have already drifted once (add-on fees, Root Cause
 * #65), and a money rule reachable by copy-paste gets copied (Root Cause #75).
 *
 * Runs AFTER the order exists and BEFORE the gateway is asked for anything.
 * That ordering is the whole D46 fix: the deleted block ran after capture, so a
 * redemption that succeeded took points from a buyer who had just paid full
 * price while its own comment claimed "the balance intact".
 *
 * 🛑 A REFUSED REDEEM REVERTS THE DISCOUNT; it is never swallowed. `redeem`
 * re-reads the balance inside its own transaction and refuses rather than going
 * negative — so a refusal means the budget was wrong and the order is recording
 * a discount nobody funded. Reverting is the only honest response: the buyer
 * pays full price, which they can see and query, where an unfunded discount is
 * a silent under-collection on every order that hits it.
 *
 * `orderId` is the natural idempotency key — this runs once per created order,
 * and an order is created once.
 */
async function settlePointsTender(input: {
  orderId: string;
  userId: string;
  pointsApplied: number;
  pointsBudget: { remaining: number };
}): Promise<void> {
  if (input.pointsApplied <= 0) return;
  try {
    await pointsRepository.redeem({
      userId: input.userId,
      points: input.pointsApplied,
      orderId: input.orderId,
      description: `Points applied to order ${input.orderId}`,
    });
  } catch (err: unknown) {
    const normalized = normalizeError(err);
    serverLogger.error("[checkout] points redemption refused — reverting the discount", {
      orderId: input.orderId,
      userId: input.userId,
      pointsApplied: input.pointsApplied,
      error: normalized.message,
    });
    // Hand the budget back, so a later group in the same checkout is not
    // charged for a spend that did not happen.
    input.pointsBudget.remaining += input.pointsApplied;
    await unitOfWork.orders
      .update(input.orderId, { pointsApplied: undefined, amountDue: undefined })
      .catch((e: unknown) => {
        /*
         * 🛑 The one genuinely bad outcome, so it is reported rather than
         * logged: the order still says `amountDue`, the points were never
         * taken, and the gateway is about to be asked for the discounted
         * figure. A case names the amount and the order; `safeRead`'s silent
         * degrade would be wrong here because nothing downstream can detect it.
         */
        const inner = normalizeError(e);
        serverLogger.error("[checkout] points revert FAILED — order under-collects", {
          orderId: input.orderId,
          amountUnfunded: input.pointsApplied,
          error: inner.message,
        });
        void paymentCasesRepository()
          .openOrObserve({
            kind: "amount_mismatch",
            // The problem is this order's unfunded discount, so the subject is
            // the order — one case however many times it is observed.
            subjectId: input.orderId,
            severity: "error",
            entityType: "order",
            entityId: input.orderId,
            orderIds: [input.orderId],
            title: "Order carries a points discount that was never funded",
            detail:
              `Redemption of ${input.pointsApplied} points was refused and the ` +
              `revert also failed, so this order will be captured at its ` +
              `discounted amountDue with no matching ledger debit.`,
            amountAtRisk: input.pointsApplied,
          })
          .catch(() => undefined);
      });
  }
}

/**
 * §Payment cross-gateway duplication pass (overhaul brief, 2026-11-05) —
 * the ~45-line post-write side-effect tail `createOrderForGroup` and
 * `createPhonePeGroupOrder` both ran in the exact same order, independently
 * copy-pasted: settlePointsTender → finalizeLockedLines → digital-code
 * claim → coupon-usage accumulation → email queueing →
 * emitOrderPlacedNotifications. Pure sequencing, no business-logic
 * branching between the two copies — the plan's own read-first pass found
 * this the one real, clean consolidation candidate (the order-literal
 * assembly itself is NOT: real per-gateway field differences there trip
 * the Duplication Decision Framework's keep-separate rule).
 *
 * `paymentMethod`/`paid` are the only two values that differ between the
 * two original call sites (dynamic on the manual/COD path, a fixed
 * `PaymentMethodValues.ONLINE`/`true` on the online-gateway path) — both
 * are caller-supplied params here rather than re-derived, so this function
 * makes no payment-method assumption of its own.
 *
 * `emailsToSend` is the SAME shared, whole-checkout accumulator array both
 * original call sites pushed into directly (mutated by reference, same
 * pattern `couponUsageAccumulator` already uses) — not a return value,
 * since the caller flushes it once per whole checkout, not per group.
 */
async function finalizeOrderPlacement(input: {
  orderId: string;
  uid: string;
  group: Array<{ item: CartItemDocument; product: ProductDocument | null }>;
  pointsApplied: number;
  pointsBudget: { remaining: number };
  firstItem: CartItemDocument;
  userEmail: string | undefined;
  userName: string;
  groupCouponCodes: Set<string>;
  couponUsageAccumulator: Map<string, CouponAccumEntry>;
  emailsToSend: Parameters<typeof sendOrderConfirmationEmail>[0][];
  orderItems: unknown[];
  totalQuantity: number;
  orderTotal: number;
  shippingAddress: unknown;
  paymentMethod: string;
  storeOwnerId: string | undefined;
  paid: boolean;
  storeId: string | undefined;
}): Promise<void> {
  const {
    orderId,
    uid,
    group,
    pointsApplied,
    pointsBudget,
    firstItem,
    userEmail,
    userName,
    groupCouponCodes,
    couponUsageAccumulator,
    emailsToSend,
    orderItems,
    totalQuantity,
    orderTotal,
    shippingAddress,
    paymentMethod,
    storeOwnerId,
    paid,
    storeId,
  } = input;

  // The second half of the points tender — see `settlePointsTender`. Runs
  // before the caller asks the gateway for anything.
  await settlePointsTender({ orderId, userId: uid, pointsApplied, pointsBudget });

  // Close the loop on any locked line this order settled: flip the offer to
  // "paid" (its terminal status had NO server-side writer before 2026-08-21,
  // so an accepted offer could be re-added and re-ordered) and back-link the
  // winning bid to the order it became.
  await finalizeLockedLines(
    group.map(({ item }) => item),
    orderId,
  );

  /*
   * SB-UNI-N — fulfilment on payment, decided by CAPABILITY and by the
   * seller's own opt-in. Fire-and-forget on the claim: the order is already
   * persisted, so an exhausted pool is logged rather than thrown.
   *
   * 🛑 This used to read `listingType === "digital-code"`, which was wrong in a
   * way a typecheck could never see. `digitalCode.codeDeliveryMethod` is
   * seller-settable (`auto-claim` | `manual-email`), is in the seller form, is
   * validated by the request schema, and two seeded listings already carry
   * `manual-email` — but the type comparison auto-claimed a code regardless.
   * A seller who deliberately chose to release codes by hand got instant issue
   * anyway, and the setting looked implemented while doing nothing.
   *
   * `fulfilsOnPayment` / `awaitsManualRelease` answer the two questions this
   * site actually has ("does this line complete on its own when the money
   * lands?" / "is a human release owed?") out of
   * `fulfilmentModeFor`, which reads the capability registry × the listing's
   * opt-in. So enabling instant or deferred fulfilment on another listing type
   * is a capability-row edit plus that type's flag — never an edit here.
   *
   * 🛑 `markAwaitingRelease` is AWAITED while the claim is not, and the
   * asymmetry is deliberate: a claim that fails leaves the pool untouched and
   * the line simply undelivered, whereas a `pending_release` that fails to
   * write leaves a paid line indistinguishable from one whose pool was empty —
   * the ambiguity that function exists to remove. One of those is a normal
   * state the buyer should see; the other is an incident.
   */
  const fulfilmentProduct = group[0]?.product;
  if (fulfilsOnPayment(fulfilmentProduct?.listingType, fulfilmentProduct)) {
    claimDigitalCodeForOrder(getAdminDb(), firstItem.productId, orderId, uid, {
      userEmail: userEmail || undefined,
      userName,
      productTitle: firstItem.productTitle,
    }).catch((e) => serverLogger.error("claimDigitalCode", { error: normalizeError(e).message }));
  } else if (awaitsManualRelease(fulfilmentProduct?.listingType, fulfilmentProduct)) {
    await markAwaitingRelease(orderId, firstItem.productId);
  }

  for (const code of groupCouponCodes) {
    const entry = couponUsageAccumulator.get(code);
    if (entry) entry.orderIds.push(orderId);
  }

  if (userEmail) {
    emailsToSend.push({
      to: userEmail,
      userName,
      orderId,
      productTitle: orderItems.length > 1 ? `${orderItems.length} items` : firstItem.productTitle,
      quantity: totalQuantity,
      totalPrice: orderTotal,
      currency: firstItem.currency ?? getDefaultCurrency(),
      shippingAddress,
      paymentMethod,
      items: orderItems,
    } as Parameters<typeof sendOrderConfirmationEmail>[0]);
  }

  emitOrderPlacedNotifications({
    orderId,
    buyerUid: uid,
    buyerName: userName,
    storeOwnerId,
    productLabel: orderItems.length > 1 ? `${orderItems.length} items` : firstItem.productTitle,
    paid,
    storeId,
  });
}

/**
 * Places one order for one seller-group of the checkout cart — fee math
 * (COD deposit/handling, EMI schedule), coupon apportionment, order-doc
 * creation, digital-code claim, and notification fan-out. Pushes into
 * `ctx.orderIds` / `ctx.emailsToSend` and returns the group's full,
 * fee-inclusive charged total (`orderTotal`) so the caller can accumulate
 * the checkout-wide `total` — 🛑 CORRECTED 2026-11-05: this used to return
 * `groupTotal` (the pre-fee goods subtotal only), while the sibling
 * `createPhonePeGroupOrder` returned `orderTotal` (the full amount) under
 * the identically-typed, identically-named `CheckoutOrderResult.total`.
 * Confirmed latent, not live-user-visible (the checkout success page reads
 * the freshly-fetched Firestore order's own `totalPrice`, which was always
 * `orderTotal`-correct on both paths) — but the in-memory return value is
 * summed across every seller-group in `orderGroups.reduce`-style checkout
 * orchestration, where only the full fee-inclusive figure is the correct
 * term (shipping/GST/fees are computed per-group already, never shared
 * across groups, so summing `orderTotal` per group cannot double-count
 * anything here).
 */
async function createOrderForGroup(
  group: Array<{ item: CartItemDocument; product: ProductDocument }>,
  orderType: OrderType,
  ctx: OrderGroupContext,
): Promise<number> {
  const {
    paymentMethod,
    commissions,
    appliedCoupons,
    cartSubtotal,
    couponUsageAccumulator,
    uid,
    userName,
    userEmail,
    shippingAddress,
    deliverySnapshot,
    notes,
    adminBypass,
    adminBypassBy,
    adminBatchId,
    orderIds,
    emailsToSend,
    outOfStockPolicy,
    droppedItems,
    buyerState,
    gstSettings,
    storeAddons,
    policyConsent,
    platformFeeByStore,
    selectedShippingQuote,
    selectedShippingOptions,
    useAllPoints,
    pointsBudget,
  } = ctx;

  const firstItem = group[0].item;
  const firstProduct = group[0].product;

  // Add-ons are this store's choice, not the cart's — see OrderGroupContext.
  const {
    whatsappNotifyAddon = false,
    giftWrapAddon = false,
    giftWrapMessage,
    shipmentProtectionAddon = false,
    saleProtectionAddon = false,
  } = storeAddons?.[firstItem.storeId] ?? {};
  const { platformFee = 0, gstOnFee: platformFeeGst = 0 } =
    platformFeeByStore.get(firstItem.storeId) ?? {};
  const groupTotal = group.reduce(
    (sum, { item, product }) => sum + lineTotalFor(item, product),
    0,
  );

  /*
   * ── G1: the discount is computed HERE, before the GST, on purpose ────────
   *
   * This used to sit ~150 lines below, after `sumGroupGst` had already backed
   * the tax out of the UNDISCOUNTED gross — so the order recorded tax on money
   * the buyer never paid (₹30.51 on a ₹1,000 item with a ₹200 coupon at 18%,
   * verified).
   *
   * A discount shown on the invoice generally reduces the value of supply, so
   * the pipeline order has to be goods → discount → tax, and that makes the
   * computation's POSITION load-bearing rather than incidental. Moved up
   * rather than duplicated: it is pure (no Firestore, no side effects — the
   * usage-accumulator bookkeeping is layered on separately below), so hoisting
   * it changes nothing but the order of two pure steps.
   *
   * 🛑 Do not move `sumGroupGst` above this, and do not recompute the discount
   * below. Both re-open the defect.
   */
  const groupLines = group.map(({ item, product }) => ({
    itemId: item.itemId,
    lineTotal: lineTotalFor(item, product),
  }));
  const { couponDiscount, appliedDiscounts } = computeGroupCouponDiscount(
    appliedCoupons,
    groupLines,
    groupTotal,
    cartSubtotal,
    firstItem.storeId,
  );

  // S-SBUNI-RULES 2026-05-13 — order-item decoration via rule registry.
  // A multi-member line expands into one row PER MEMBER sharing a groupSlug, so
  // each row carries its own HSN/GST and can be cancelled independently; the
  // receipt still collapses them under one header.
  const baseOrderItems = group.flatMap(({ item, product }) => {
    const lt = (product.listingType ?? "standard") as ListingType;
    const itemRule = getListingRule(lt);
    return expandCartLineToOrderRows(item, product, ctx.productById).map((baseLine) =>
      itemRule.decorateOrderItem(baseLine, product),
    );
  });
  /*
   * Part 14 — freeze the parts a composed listing was sold as containing.
   *
   * A separate pass because composition lives in `modelCompositions` keyed by
   * the model's CATEGORY leaf, not on the product, so it needs a read — and
   * `expandCartLineToOrderRows` is pure by design.
   *
   * 🛑 Usually free: it returns immediately unless some line's listing type
   * has a composition at all, and then reads only the DISTINCT leaves,
   * capped. It never throws — a parts list we could not read must not fail a
   * payment (see the module header).
   */
  /*
   * Part 14 (parts freezing) REMOVED 2026-11-08 — owner decision. The parts
   * taxonomy (partGlossary · modelComposition) leaves the shop database
   * entirely; the wiki owns it as JSON and will expose an API for it, the way
   * it already does for tools. There is no composition to read here any more,
   * so this is the pure expansion it always wanted to be.
   */
  /*
   * 🛑 Line ids stamped HERE, after the flatMap -- see `assignOrderLineIds`.
   * The gateway path calls the same function; a line with no id cannot be the
   * subject of a dispute entry or a shipment's contents.
   */
  const orderItems = assignOrderLineIds(baseOrderItems);
  const totalQuantity = group.reduce((sum, { item }) => sum + item.quantity, 0);

  /*
   * D44: the group's real goods value, so free-above-threshold can fire.
   *
   * `lineTotalFor`, never `item.price * item.quantity` — that is the
   * hand-rolled rule Root Cause #75 is about, and on a locked-price or
   * grouped line the two differ.
   */
  const groupGoodsValue = group.reduce(
    (sum, { item, product }) => sum + lineTotalFor(item, product),
    0,
  );
  const { shippingFee: resolvedShippingFee, shippingOffer, storeOwnerId, storeState, storeProtections, storeTaxIdentity, acceptsPoints, sharedPurchaseRates, storePaymentMethods } =
    await resolveShippingCost(firstItem.storeId, { goodsValue: groupGoodsValue });

  /*
   * ── §B: THE STORE AND LISTING LEVELS OF THE METHOD PRECEDENCE ────────────
   *
   * The platform ceiling and the buyer deny already ran cart-wide in
   * `createCheckoutOrderAction`, before any stock was touched. These two
   * levels could not run there: both need the store document and the
   * resolved listings, which exist per SELLER GROUP.
   *
   * 🛑 Per group is the CORRECT granularity, not a convenience. A two-seller
   * cart can legitimately have one store that takes cash on delivery and one
   * that does not; a single cart-wide answer would either refuse the whole
   * cart because of one seller's setting or admit it for both.
   *
   * 🛑 EVERY listing in the group is checked and the STRICTEST answer wins.
   * One prepaid-only item makes its whole group prepaid-only, because the
   * group is paid as one order — so the method has to satisfy every line in
   * it. Reading only the first item's opinion would let a prepaid-only
   * listing be paid by cash on delivery simply by adding a cheap
   * COD-eligible item beside it in the cart.
   *
   * ⚠ COMPOSES with `assertPaymentMethodAllowed`, which ran earlier and
   * answers a DIFFERENT question: that gate enforces per-listing-TYPE rules
   * (`getListingRule(type).blockedPaymentMethods`) and the acquirer's
   * prohibited-category list — facts about the TYPE and the GATEWAY. This one
   * enforces what the platform, this store and this listing have CHOSEN. Two
   * questions, two gates, deliberately; folding them together would mean one
   * of the two reasons gets reported for the other's refusal, and a buyer
   * told the wrong reason picks the wrong remedy.
   *
   * ⚠ `storePaymentMethods` comes off the store document `resolveShippingCost`
   * already read, so this costs no extra Firestore round trip (Rule #6).
   */
  if (!adminBypass) {
    const methodLabel =
      PAYMENT_METHOD_LABEL[paymentMethod as CheckoutPaymentMethod] ?? paymentMethod;
    for (const { product } of group) {
      const refusal = methodRefusalMessage(paymentMethod, methodLabel, {
        settings: { payment: ctx.paymentSettings },
        store: { paymentMethods: storePaymentMethods },
        listing: product,
      });
      if (refusal) throw new ValidationError(refusal);
    }
  }

  /*
   * ════════════════════════════════════════════════════════════════════════
   * 🛑 SERVER AUTHORITY OVER THE SHIPPING FEE — owner's spec, 2026-11-08
   * ════════════════════════════════════════════════════════════════════════
   *
   * ## What was here, and what it cost
   *
   *   shippingFee = roundShippingUp(selectedShippingQuote.chargedRate)
   *
   * `resolveShippingCost` was called, its answer destructured, and then
   * DISCARDED whenever the client posted a quote. Measured live on a ₹149 item:
   * an honest request charged **₹172.69**; a forged `{ chargedRate: 1 }`
   * charged **₹222.69**. A client-supplied number reached the charged total.
   *
   * The comment that stood here argued the trust was bounded because
   * `roundShippingUp` re-rounds the value. It does — onto a ₹50 step. ₹1
   * becomes ₹50 and ₹10,000 stays ₹10,000, so the "bound" was the attacker's
   * choice of multiple of fifty, in either direction. Undercutting was
   * unexploitable only because no seeded store had `shippingPricing` set, so
   * every resolved fee was ₹0 — a data accident due to expire the moment a
   * vendor saved a real rate.
   *
   * ## 🛑 Why the fix is NOT "reject any client shipping value"
   *
   * The owner's spec gives the buyer a real choice between the seller's own
   * rate and a live carrier quote, *"if they find the other cheap they can
   * choose whatever they wish"*. So the client MUST be able to say which option
   * it picked. What it must never say is what that option costs.
   *
   * Hence: the posted object contributes its `courierId` ONLY
   * (`requestedShippingOptionId` discards `rawRate` and `chargedRate`), the
   * option is re-priced from the seller's STORED offer plus a carrier quote
   * this server obtained itself, and an option the seller does not offer is a
   * REFUSAL rather than a fallback — charging the buyer for a method they did
   * not choose is the same wrong pointing the other way.
   *
   * ## 🛑 `shippingRequired` is a CAPABILITY read
   *
   * `cartRequiresShipping` asks the registry for `supportsShipping` on each
   * line. A digital-code group therefore acquires no fee and no fulfilment
   * obligation — not because this code knows what a digital code is, but
   * because no line in it supports shipping. No `listingType ===` anywhere.
   *
   * ## 🛑 Still FIRST GROUP ONLY
   *
   * Unchanged from before and for the unchanged reason: the picker quotes one
   * destination, and a cart split across sellers must not be charged the same
   * parcel rate once per seller. See the field's note on `OrderGroupContext`.
   */
  const isFirstGroup = ctx.orderIds.length === 0;
  const groupRequiresShipping = cartRequiresShipping(
    group.map(({ product }) => ({ listingType: product.listingType })),
  );
  /*
   * 🛑 THE PER-STORE PICK WINS, and the legacy cart-wide one is the fallback.
   *
   * `selectedShippingOptions[storeId]` is the shape the owner's spec needs —
   * each seller offers their own methods, so each group has its own answer, and
   * `mocks/18-shipping-fees.qm` shows two shipping lines in one order summary.
   * The legacy `selectedShippingQuote` stays usable for a tab opened before
   * that field existed, and stays FIRST-GROUP-ONLY for the reason it always
   * was: it quoted one destination for the whole cart, so honouring it on every
   * group would charge a multi-seller cart the same parcel rate N times.
   */
  const requestedOptionId =
    selectedShippingOptions?.[firstItem.storeId] ??
    (isFirstGroup ? requestedShippingOptionId(selectedShippingQuote) : undefined);
  /*
   * The outbound call is skipped unless it can change the answer: the seller
   * must accept carrier quotes AND the buyer must have picked one. An ordinary
   * checkout against a self-shipping seller performs no carrier call at all,
   * which is what keeps this inside Rule #6's round-trip budget.
   */
  const needsCarrierQuote =
    groupRequiresShipping &&
    shippingOffer.platformQuotesAccepted &&
    requestedOptionId !== undefined &&
    requestedOptionId !== CUSTOM_SHIPPING_OPTION_ID;
  const carrierOptions = needsCarrierQuote
    ? await carrierOptionsForDestination(
        deliverySnapshot?.deliveryPincode,
        CHECKOUT_DEFAULT_PARCEL_WEIGHT_KG,
      )
    : [];

  const selection = resolveShippingSelection({
    shippingRequired: groupRequiresShipping,
    offer: shippingOffer,
    goodsValue: groupGoodsValue,
    carrierOptions,
    requestedOptionId,
  });

  /*
   * 🛑 REFUSES rather than falling back, and the refusal happens BEFORE any
   * money moves on this path (`createCheckoutOrderAction` is the COD/manual
   * entry point; the gateway path runs the same resolution inside
   * `verifyAndPlaceGatewayOrderAction`). `groupEmiGate` directly below sets the
   * precedent and states the reason: *"silently producing a full-price order
   * from an EMI request is money the buyer did not agree to."* Silently
   * producing a differently-shipped order from a shipping request is the same
   * class of wrong.
   */
  if (selection.kind === "refused") {
    throw new ValidationError(selection.message);
  }

  const shippingFee =
    selection.kind === "resolved"
      ? selection.option.amount
      : selection.kind === "not-required"
        ? 0
        : /*
           * `unselected` — this seller got no pick, so their stored single-mode
           * policy answers, exactly as it did before the picker existed. Still
           * a SERVER number: `resolveShippingCost` computed it from
           * `shippingPricing`, and nothing the client sent is in it.
           *
           * 🛑 The one case that charges ₹0 instead: a LATER group under the
           * LEGACY cart-wide quote, with no per-store pick anywhere. That quote
           * priced one parcel to one destination, so billing it again here
           * would charge the buyer twice for one courier — the behaviour this
           * branch has always had, preserved deliberately rather than
           * inherited. A per-store pick never reaches it.
           */
          isFirstGroup || !selectedShippingQuote || selectedShippingOptions
          ? resolvedShippingFee
          : 0;

  /**
   * What the buyer committed to, frozen so part C of the spec is evidenced.
   *
   * 🛑 Written only on the group that actually CARRIES the fee. A later group
   * in a multi-seller cart is charged ₹0 shipping, and recording a
   * self-fulfilment obligation there would bind a seller to a price they were
   * never paid.
   */
  const shippingObligation: ShippingObligation | undefined =
    selection.kind === "resolved" ? selection.obligation : undefined;

  /*
   * Who issues this invoice — the seller if they have their own GSTIN, the
   * platform otherwise. ONE function decides, and it is the only place that
   * knows the order (Root Cause #75: a money rule reachable by copy-paste
   * gets copied, and the copies miss branches added later).
   *
   * Snapshot below and never recomputed: `OrderDocument`'s own comment is
   * that these are the registration "as it stood at the moment of supply".
   */
  const supplier = resolveSupplierIdentity(
    storeTaxIdentity,
    gstSettings ? { gst: gstSettings } : undefined,
  );

  // P-8 GST — sum per-line-item tax (each product may carry its own gstRate),
  // then split the group total into a single cgst/sgst/igst breakdown for the
  // order document. Skipped entirely when GST is off or the buyer's state is
  // unknown (digital-only carts have no shipping address).

  /*
   * ⚠ `cod` ALONE now. `upi_manual` was retired as unverifiable and `cash`
   * (cash on pickup) followed it 2026-11-11 -- owner: *"we only stick with
   * online or cod which will be handled by the shipment provider."* The name
   * survives because the predicate is about the SHAPE of the tender (money
   * collected later, not before the order exists), and keeping it reads
   * better at the call sites than `isCod` would if a second deferred tender
   * ever appears.
   */
  /*
   * 🛑 The variable was already named for the PROPERTY while testing the
   * IDENTITY — `isCodLike`, one line above `=== "cod"`. It asks whether money
   * arrives at delivery rather than at checkout, which is now a lookup.
   *
   * ⚠ An unknown method answers `false` here: an order must not be placeable
   * with nothing captured on a method this build cannot describe.
   */
  const isCodLike = collectsOnDelivery(paymentMethod);
  /*
   * 🛑 D43 — THE DEPOSIT/REMAINING SPLIT MOVED DOWN, BELOW `orderTotal`.
   *
   * It used to be computed HERE, on `groupTotal` — the goods value — so
   * `depositAmount + codRemainingAmount` summed to the goods only and omitted
   * shipping, the COD handling fee, add-ons, the platform fee and its GST.
   * A COD buyer was told to "pay ₹X on delivery" where X was short by every
   * fee they had just agreed to, and the courier would collect the wrong
   * amount.
   *
   * It could not be fixed in place: `codHandlingFee` (below), `giftWrapFee`
   * and both protection fees are all computed AFTER this point, so the total
   * simply did not exist yet. The split now sits immediately after
   * `orderTotal`, which is the only place every term is known.
   */

  /*
   * 🛑 The per-group EMI GATE and SCHEDULE were removed with EMI stage 5a.
   * `groupEmiGate` refused an ineligible EMI order and `groupEmiSchedule`
   * built the instalment plan; both lived in `shared/features/emi/group`,
   * which is deleted. No order can carry a plan now, so there is nothing to
   * gate and nothing to schedule.
   */
  // Handling fee charged to the buyer for choosing COD, on top of the order
  // total — not deducted from the deposit/remaining split above.
  const codHandlingFee =
    paymentMethod === "cod" ? computeCodHandlingFee(groupTotal, commissions) : 0;
  const whatsappNotifyFee = computeWhatsAppNotifyFee(whatsappNotifyAddon, commissions);
  const giftWrapFee = computeGiftWrapFee(giftWrapAddon, commissions);
  /*
   * ── C5e: all three protection tiers, enforced SERVER-SIDE ────────────────
   *
   * 🛑 The picker filtering the checkbox is not enough. `storeAddons` is a
   * field on the cart document, so a hand-crafted `PUT /api/cart/addons` can
   * tick a protection the seller declined — and billing for cover we will not
   * honour is worse than any of the defects C5e exists to close. So the fee is
   * gated here too, on the same three tiers the picker renders.
   *
   * The `finalSale` test reads the ORDER ITEMS we are about to write, i.e. the
   * snapshot, never the live product — `OrderDocumentItem.finalSale` exists
   * precisely so a seller cannot flip the switch after the sale.
   */
  const groupHasFinalSale = orderItems.some((line) => line.finalSale === true);
  const { shippingProtectionFee: shipmentProtectionFee, saleProtectionFee } = computeProtectionFees({
    subtotal: groupTotal,
    selected: { shipping: shipmentProtectionAddon, sale: saleProtectionAddon },
    tiers: {
      platformShipping: commissions.shipmentProtectionFeeEnabled === true,
      platformSale: commissions.saleProtectionFeeEnabled === true,
      sellerShipping: storeProtections.shipping,
      sellerSale: storeProtections.sale,
      finalSale: groupHasFinalSale,
    },
    shippingFee: (s, sel) => computeShipmentProtectionFee(s, sel, commissions),
    saleFee: (s, sel) => computeSaleProtectionFee(s, sel, commissions),
  });

  /*
   * 🛑 THIS BLOCK WAS MOVED DOWN (2026-10-21) and its position is load-bearing.
   *
   * It used to sit ~90 lines above, before `codHandlingFee`, `giftWrapFee` and
   * the two protection fees were computed — so it could not possibly tax them,
   * and they entered the order total as bare addends carrying no tax (G5).
   *
   * It now runs after every ancillary charge is known and before `orderTotal`
   * consumes them. Do not move it back up, and do not move a fee computation
   * below it.
   */
  let gstBreakdown: GroupGstSummary | undefined;
  if (gstSettings?.enabled && buyerState) {
    /*
     * 🛑 `isIntraStateSupply`, not `storeState === buyerState`. That raw
     * comparison read "Karnataka" / "karnataka" / "KA" as three different
     * states — the exact drift `constants/geo/subdivisions.ts` opens by
     * documenting — and a store with no address resolved to `false`, i.e.
     * silently inter-state. `null` means "cannot tell" and is logged rather
     * than guessed; the AMOUNT is identical either way (IGST total ==
     * CGST+SGST total), so what was wrong was the split on the invoice.
     */
    const intra = isIntraStateSupply(storeState, buyerState);
    if (intra === null) {
      serverLogger.warn(
        "[gst] place of supply undetermined — defaulting to inter-state (IGST)",
        { storeId: firstItem.storeId, hasStoreState: !!storeState },
      );
    }
    // Per-member, not per-line: a bundle or grouped line spans several products
    // with several different rates, and taxing the whole line at one product's
    // rate is wrong in both directions. Shared with previewCheckoutPricing so
    // the figure shown and the figure charged cannot drift.
    const summary = sumGroupGst(
      group.map(({ item }) => item),
      ctx.productById,
      intra ?? false,
      // G1 — the taxable value is the POST-discount gross. See the hoist above.
      couponDiscount,
      /*
       * G5 — the ancillary charges, taxed at the principal rate. Shipping,
       * COD handling, gift wrap and both protections; NOT the platform fee,
       * which already carries its own `platformFeeGst` and would be taxed
       * twice, and NOT the EMI surcharge, which is a financing charge with
       * its own treatment and is deliberately outside the decided scope.
       */
      roundRupees(
        shippingFee + codHandlingFee + giftWrapFee + shipmentProtectionFee + saleProtectionFee,
      ),
    );
    /*
     * The split is taken AS COMPUTED, per slice, by `calculateGst` inside
     * `sumGroupGst`. It used to be re-derived here as
     * `Math.round(gstAmount / 2)` — whole rupees, so ₹161.82 became
     * 81.00/80.82 rather than 80.91/80.91, and a ₹0.52 total rounded to 0 and
     * was then dropped off the invoice entirely by the `|| undefined` below.
     *
     * The guard is on EITHER base: an order of purely exempt goods has a real
     * taxable value to report and zero tax, and skipping it left the invoice
     * unable to reconcile.
     */
    if (summary.taxableAmount > 0 || summary.exemptAmount > 0) {
      gstBreakdown = summary;
    }
  }

  const groupCouponCodes = new Set<string>();
  /*
   * 🛑 `couponDiscount` / `appliedDiscounts` are HOISTED to just after
   * `groupTotal` (~line 860), not computed here. The move is load-bearing:
   * `sumGroupGst` sits between the two and now takes the discount, because the
   * taxable value is the post-discount gross (G1). Recomputing here would be a
   * second copy; moving the GST call below this would re-open the defect.
   *
   * What REMAINS here is the side effect — accumulating coupon usage — which
   * must stay where it is, after the group has been confirmed placeable.
   *
   * Also fixed in the hoist: `groupLines` was built with
   * `item.price * item.quantity` while `groupTotal` (155 lines above, same
   * function) used `lineTotalFor`, and `computeGroupCouponDiscount` divides one
   * by the other — so on a locked-price line the numerator carried the LIST
   * price and the denominator the AGREED one, the ratio exceeded 1, and the
   * coupon over-discounted that group. Root Cause #75, sixth copy.
   */
  for (const discount of appliedDiscounts) {
    if (discount.couponId) {
      accumulateCouponUsage(couponUsageAccumulator, discount.code, discount.couponId, discount.discountAmount);
      groupCouponCodes.add(discount.code);
    }
  }

  /*
   * ── S5a: a shared purchase — one payer, N destinations ────────────────────
   *
   * Computed BEFORE `orderTotal` because it is a term in it. The rates come
   * off the store document and are SNAPSHOTTED onto the order below: a
   * coordinator commits against a quoted total, and re-reading a rate at
   * settle would let a seller raise it afterwards. That is D61's rule, and the
   * precedent is the refund path reading `finalSale` from the order snapshot
   * for exactly this reason.
   *
   * 🛑 `countDestinations` counts DISTINCT addresses and collapses every line
   * with no `destinationAddressId` into one bucket — the order's own address.
   * Counting items instead would charge an ordinary three-item order for two
   * extra legs it never asked for.
   */
  const sharedQuote = quoteSharedPurchase({
    destinationCount: countDestinations(group.map(({ item }) => item)),
    rates: sharedPurchaseRates,
  });
  /*
   * 🛑 An UNPRICED arrangement is refused, not given away. The seller opted in
   * without setting a rate, which is not consent to do the extra packing for
   * free — and quoting ₹0 is exactly D44: `shippingUnavailable` carried a
   * docstring saying "the caller MUST act on this rather than trusting
   * `shippingFee: 0`", had zero consumers, and every `estimate`-mode store
   * shipped free on every path as a result.
   */
  if (sharedQuote.unpriced) {
    throw new ValidationError(
      "This seller has not set a price for splitting an order across addresses. " +
        "Send everything to one address, or contact the seller.",
    );
  }
  /*
   * A multi-destination order from a store that has NOT opted in. The quote
   * prices; it does not authorise — so the refusal is here, where the buyer
   * can be told something true and specific.
   */
  if (
    !sharedQuote.isShared &&
    countDestinations(group.map(({ item }) => item)) > 1
  ) {
    throw new ValidationError(
      "This seller ships one order to one address. Remove the extra delivery addresses, " +
        "or order the items separately.",
    );
  }

  // The platform commission is now charged on EVERY payment method. It used to
  // be added only on the online-payment path, so COD / UPI-manual / cash / EMI
  // buyers silently never paid it.
  const orderTotal =
    /*
     * 🛑 Product GST is NOT a term here, and its absence is the model.
     *
     * Prices are tax-INCLUSIVE: the GST is already inside `groupTotal`, backed
     * out by `sumGroupGst` for reporting rather than added on top. A ₹999
     * listing at 5% charges ₹999, of which ₹47.57 is tax we remit.
     *
     * `platformFeeGst` IS a term, and the asymmetry is correct: that is GST on
     * OUR service fee to the seller, charged to the buyer on top of the fee —
     * not tax on the goods.
     */
    /*
     * 🛑 D42 — ROUNDED ONCE, HERE, AT THE END.
     *
     * This was a raw float sum of nine 2dp terms written verbatim to
     * Firestore. IEEE-754 does not represent 0.1 exactly, so a nine-term sum
     * lands on values like 1011.8000000000001 — and that is what got stored as
     * the order's total, rendered on the invoice, and compared against the
     * captured amount. The capture route was saved only because
     * `rupeesToPaise` rounds on the way to the gateway; the Firestore write had
     * no such protection.
     *
     * Rounded ONCE on the sum, never per term: rounding each addend first
     * compounds nine half-paisa errors instead of one, which is how a total
     * drifts from the sum of the lines shown beside it.
     */
    roundRupees(
      Math.max(0, groupTotal - couponDiscount) + shippingFee + codHandlingFee + whatsappNotifyFee + giftWrapFee + shipmentProtectionFee + saleProtectionFee + platformFee + platformFeeGst + sharedQuote.total,
    );

  /*
   * ── D43: the COD deposit/remaining split, on the ORDER TOTAL ──────────────
   *
   * Moved here from ~150 lines above, where it was computed on `groupTotal`
   * and therefore summed to the goods value alone — see the 🛑 at its old
   * site. Every term `orderTotal` needs is finally known at this point, which
   * is why this is the only correct home for it.
   *
   * 🛑 The pre-order branch is deliberately left on `group`:
   * `computePreOrderDepositAmount` reads each line's own
   * `preOrderDepositPercent`, because a pre-order deposit is a per-PRODUCT
   * commercial term the seller set, not a percentage of the order. Rebasing it
   * on `orderTotal` would silently change what every existing pre-order
   * charges — a different defect, not this one.
   *
   * `roundRupees` on both halves, and the remainder is taken as
   * `orderTotal − deposit` rather than independently rounded, so the two
   * provably sum to the total instead of drifting by a paisa (D42's shape).
   */
  const depositAmount = !isCodLike
    ? undefined
    : orderType === "preorder"
      ? computePreOrderDepositAmount(group, commissions.codDepositPercent)
      : roundRupees(orderTotal * (commissions.codDepositPercent / 100));
  const codRemainingAmount = isCodLike
    ? roundRupees(orderTotal - (depositAmount ?? 0))
    : undefined;

  const imageUrls = [
    ...new Set(
      group
        .map(({ product }) => product.mainImage)
        .filter((url): url is string => typeof url === "string" && url.length > 0),
    ),
  ];

  // S-SBUNI-RULES 2026-05-13 — order-doc decoration via rule registry.
  const lt0 = (group[0].product.listingType ?? "standard") as ListingType;
  const groupRule = getListingRule(lt0);
  const extraOrderFields = {
    ...groupRule.decorateOrderDoc(group[0].item, group[0].product),
  };

  // ── 15-minute payment window + seller UPI resolution (Tier PP) ──────────
  // Deadline + displayed UPI apply only to methods with a buyer-uploaded
  /*
   * ── 🛑 THE 15-MINUTE PAYMENT WINDOW IS RETIRED (2026-11-11) ──────────────
   *
   * It existed for tenders that settle OUT OF BAND: the buyer was shown an
   * address, given 15 minutes to pay and upload proof, and the order was
   * cancelled and restocked if they did not. Every one of those tenders is
   * now gone -- `upi_manual` as unverifiable, then `cash` on the owner's
   * decision. `cod` never had a window (money arrives with the courier) and
   * `online` cannot have one (payment is captured before the order exists).
   *
   * So `paymentDeadline` is no longer stamped on any order.
   *
   * 🛑 DO NOT delete `paymentWindowTimeout` on the strength of that. The
   * sweep carries TWO unrelated jobs riding along, folded in deliberately
   * because Cloud Scheduler bills per registered job:
   * `reconcileStuckGatewayEvents` (webhook events we received and lost) and
   * `runDueJobRetries`. Removing the sweep would silently take out
   * gateway-event reconciliation, which is a money path. Strip its
   * payment-window half; keep the schedule and the passengers.
   */
  const paymentDeadline: Date | undefined = undefined;
  /*
   * 🛑 `displayedUpiId` / `resolveDisplayedUpiId` DELETED 2026-11-11.
   *
   * It resolved the seller's UPI address to show a buyer paying by hand, and
   * stored it on the order as the "ground truth" half of the
   * buyer-reported-UPI cross-check. Both halves are gone: with manual payment
   * retired nobody is shown an address to pay, and the cross-check it fed
   * compared two strings WE and the BUYER supplied -- it never touched a bank,
   * so a buyer who copied the address back correctly produced a clean match
   * having paid nothing.
   *
   * ⚠ `paymentDeadline` above SURVIVES. It is the payment WINDOW, still used
   * by `paymentWindowTimeout` to cancel and restock a cash-on-pickup order
   * nobody completes.
   */

  /*
   * ── POINTS TENDER (D46/D47) — a STAGE, after `orderTotal` is rounded ──────
   *
   * The deleted code redeemed points AFTER the orders existed and after the
   * gateway had captured `orderTotal`, so a successful redemption took points
   * from a buyer who had just paid full price — while its own comment claimed
   * "the balance intact". This is the same feature done as a pipeline stage:
   * `amountDue` is derived here, and `amountDue` is what the gateway captures
   * and what the post-capture guard compares.
   *
   * 🛑 `useAllPoints` is the only client input and it is a BOOLEAN (decision
   * 24). The amount comes from the live balance and the 50% cap; a
   * client-supplied money figure is a client-supplied discount.
   *
   * 🛑 Per group, because the ACCEPTING store absorbs the redemption against
   * its own payout (decision 3). A cart spanning an accepting and a
   * non-accepting store must not pool the discount — so this reads
   * `acceptsPoints`, which `resolveShippingCost` resolved from the store
   * document it had already fetched.
   *
   * 🛑 `pointsBudget` is a SHARED MUTABLE REMAINDER, read once per checkout by
   * the caller and decremented here — the same shape as
   * `couponUsageAccumulator` and `platformFeeByStore`. Reading the balance
   * per group would let two groups each spend the whole balance: `redeem`
   * would then refuse the second one inside its transaction, leaving an order
   * recorded at a discount that was never funded. One budget, drawn down in
   * order, is what makes the sum of the groups equal what the buyer has.
   */
  const pointsOptedIn = useAllPoints === true;
  const pointsAccepted = pointsOptedIn && acceptsPoints;
  const { pointsApplied } = resolvePointsTender({
    orderTotal,
    balance: pointsAccepted ? pointsBudget.remaining : 0,
    accepted: pointsAccepted,
    optedIn: pointsOptedIn,
  });
  if (pointsApplied > 0) pointsBudget.remaining -= pointsApplied;

  /*
   * What is COLLECTED, composing both tenders that reduce it. On a plain order
   * this equals `orderTotal`, so the field is omitted below and every
   * `amountDue ?? totalPrice` reader is unaffected.
   */
  const amountDueOnOrder = amountDueNow({ orderTotal, pointsApplied });

  // Both creation paths call the SAME builder — two hand-written copies is the
  // create-vs-create axis of Root Cause #39, and these two functions have
  // already drifted once before (add-on fees, Root Cause #65).
  const sourceContext = await buildOrderSourceContext(firstItem, firstProduct, orderType);

  const order = await unitOfWork.orders.createOrder({
    productId: firstItem.productId,
    productTitle: firstItem.productTitle,
    userId: uid,
    userName,
    userEmail,
    quantity: totalQuantity,
    unitPrice: unitPriceFor(firstItem, firstProduct),
    totalPrice: orderTotal,
    /*
     * D46/D47 — what the points paid for, and what is left to collect.
     *
     * 🛑 `totalPrice` stays the FULL order value and is not reduced. It is the
     * value of the supply, it is what the GST breakdown above was computed on,
     * and it is what `refundableBase` measures against — netting the points
     * off it would silently shrink the refundable base and the taxable value
     * at once. Points are a DISCOUNT settled against goods (decision 5), so
     * they reduce the amount COLLECTED, not the amount supplied.
     *
     * 🛑 Both are written only when non-zero, so an order placed without
     * points carries neither field and every reader's `amountDue ?? totalPrice`
     * fallback resolves to the right number on the 100% of historical orders
     * that predate this.
     */
    pointsApplied: pointsApplied > 0 ? pointsApplied : undefined,
    /*
     * 🛑 WHAT IS COLLECTED NOW, and on an EMI order that is the token — not
     * the whole total.
     *
     * This was `pointsApplied > 0 ? amountDue : undefined`, so an EMI order
     * carried no `amountDue` at all and every reader fell back to
     * `order.total`. The buyer's manual-payment page therefore asked an EMI
     * buyer to transfer the FULL order value up front and then showed them a
     * schedule of monthly instalments: `emiTokenAmount` was computed, stored,
     * and read by nothing (measured — zero readers across both repos).
     *
     * `amountDueNow` subtracts the deferred balance as well as the points, so
     * the two tenders compose. Written only when it differs from the total, so
     * every historical order keeps resolving through the same
     * `amountDue ?? totalPrice` fallback its readers already use.
     */
    amountDue: amountDueOnOrder !== orderTotal ? amountDueOnOrder : undefined,
    currency: firstItem.currency ?? getDefaultCurrency(),
    storeId: firstItem.storeId || undefined,
    storeName: firstItem.storeName || undefined,
    items: orderItems,
    orderType,
    // How the buyer earned the right to buy at this price. `orderType` cannot
    // answer that — it has five values, and both a settled win and a buyout
    // are "collector-drop". Written ONCE here and never recomputed: the collector drop and
    // offer documents it summarises are mutable and eventually archived.
    sourceContext,
    /*
     * Frozen onto the order so reconciliation has a charged figure to measure
     * the seller's real postage against. Only on the group that actually
     * carries the shipping fee — a later group in a multi-seller cart is
     * charged ₹0 shipping, so recording a quote there would invite a credit
     * against money that group never collected.
     *
     * 🛑 REBUILT FROM THE SERVER'S RESOLUTION, not from the posted object.
     * `rawRate` is the carrier's own figure as WE re-quoted it; it used to be
     * whatever the client sent, which meant `reconcileShipping` later compared
     * a seller's real spend against a buyer-supplied number. Only a platform
     * option has a carrier rate at all — the seller's own price is not a
     * carrier quote and must not masquerade as one, so a custom pick records
     * the obligation below and no `selectedShippingQuote`.
     */
    selectedShippingQuote:
      selection.kind === "resolved" && selection.option.kind === "platform"
        ? {
            courierId: selection.option.courierId ?? selection.option.optionId,
            courierName: selection.option.courierName ?? selection.option.label,
            rawRate:
              carrierOptions.find((c) => c.courierId === selection.option.courierId)?.rawRate ??
              selection.option.amount,
            chargedRate: shippingFee,
            estimatedDays: selection.option.estimatedDays ?? 0,
            // Stamped server-side. A buyer-supplied timestamp is unverifiable,
            // and this field exists so a stale quote is recognisable later.
            quotedAt: new Date(),
          }
        : undefined,
    /*
     * ── PART C: THE FULFILMENT OBLIGATION, RECORDED ───────────────────────
     *
     * Owner: *"if they have selected that, then it is up to the seller to
     * fulfil as is, they cannot use the platform to ship for the other, as we
     * have already taken money from the customer."*
     *
     * 🛑 Written at checkout because the rule is BROKEN at pack time, possibly
     * days later. A rule nobody can evidence after the fact is not a rule —
     * `mayBookPlatformLabel` reads this one field, and `reconcileShipping`
     * already computes both money directions (excess back to the buyer,
     * shortfall absorbed by the seller) from `chargedAmount` versus the real
     * spend. This flag is what says which of them the seller agreed to.
     */
    shippingObligation,
    offerId: firstItem.offerId ?? undefined,
    // Distinguishes a Buy Now purchase from a settled collector drop win. Both are
    // orderType "collector-drop"; only this one gets the 24h admin-review window.
    isBuyout: firstItem.isBuyout ? true : undefined,
    status: adminBypass ? OrderStatusValues.PROCESSING : OrderStatusValues.PENDING,
    paymentStatus: adminBypass ? PaymentStatusValues.PAID : PaymentStatusValues.PENDING,
    paymentMethod: adminBypass ? PaymentMethodValues.ADMIN_BYPASS : paymentMethod,
    paymentId: adminBatchId,
    paymentDeadline,
    adminBypassBy: adminBypassBy,
    shippingAddress,
    /*
     * 🛑 Spread BEFORE `placeOfSupply`, which now prefers the snapshot's
     * state. Spreading after would let an absent snapshot overwrite a
     * state the digital-cart fallback had already resolved.
     */
    ...(deliverySnapshot ?? {}),
    notes,
    shippingFee: shippingFee > 0 ? shippingFee : undefined,
    depositAmount: adminBypass ? undefined : depositAmount,
    codRemainingAmount: adminBypass ? undefined : codRemainingAmount,
    codHandlingFee: !adminBypass && codHandlingFee > 0 ? codHandlingFee : undefined,
    // This group's pro-rata share of the checkout's single capped commission —
    // the shares across a multi-store checkout sum to exactly what was charged.
    platformFee: !adminBypass && platformFee > 0 ? platformFee : undefined,
    /*
     * Persisted alongside the fee, 2026-10-21. It was computed here, charged
     * to the buyer as its own term in `orderTotal`, and then folded into
     * `gstAmount` — so no field held the fee's own tax and a refund had to
     * re-derive it from live percentages, which is how D32's ~10x
     * over-deduction happened. The note above this function's `orderTotal`
     * already explains why the two are kept separate; this persists the second
     * one so a later reader does not have to reconstruct it.
     */
    platformFeeGst: !adminBypass && platformFeeGst > 0 ? platformFeeGst : undefined,
    whatsappNotifyAddon: !adminBypass && whatsappNotifyFee > 0 ? true : undefined,
    whatsappNotifyFee: !adminBypass && whatsappNotifyFee > 0 ? whatsappNotifyFee : undefined,
    giftWrapAddon: !adminBypass && giftWrapFee > 0 ? true : undefined,
    giftWrapFee: !adminBypass && giftWrapFee > 0 ? giftWrapFee : undefined,
    giftWrapMessage: !adminBypass && giftWrapFee > 0 ? giftWrapMessage?.slice(0, 500) : undefined,
    shipmentProtectionAddon: !adminBypass && shipmentProtectionFee > 0 ? true : undefined,
    shipmentProtectionFee: !adminBypass && shipmentProtectionFee > 0 ? shipmentProtectionFee : undefined,
    saleProtectionAddon: !adminBypass && saleProtectionFee > 0 ? true : undefined,
    saleProtectionFee: !adminBypass && saleProtectionFee > 0 ? saleProtectionFee : undefined,
    /*
     * S5a — the arrangement, snapshotted. Written only when it IS a shared
     * purchase, so an ordinary order carries no field at all and every reader
     * can test presence rather than compare a count to 1.
     *
     * 🛑 The FEES AS CHARGED, not the store's current rates. That is the whole
     * point of a snapshot: an order refunded in six months must reverse what
     * was collected, not what the seller charges by then.
     */
    sharedPurchase: sharedQuote.isShared
      ? {
          destinationCount: countDestinations(group.map(({ item }) => item)),
          handlingFee: sharedQuote.handlingFee,
          extraShippingFee: sharedQuote.extraShippingFee,
        }
      : undefined,
    taxableAmount: gstBreakdown?.taxableAmount,
    /* Exempt goods are a reportable nil-rated supply, kept OUT of
     * `taxableAmount` so the taxed base stays the base the tax was charged on,
     * and recorded here so the invoice's columns can reconcile. */
    exemptAmount: gstBreakdown?.exemptAmount || undefined,
    /*
     * Phase 7 — the place of supply, which is the INPUT the CGST/SGST-vs-IGST
     * split above was computed from. Only the split's RESULT was recorded
     * before, so an order could not state why it was taxed the way it was, and
     * GSTR-1's mandatory place-of-supply column had nothing to read.
     */
    /*
     * Part 14 — the snapshot's state is authoritative, because it is the
     * field the invoice and GSTR-1 actually read. `buyerState` stays as
     * the fallback for a digital cart, which has no delivery address.
     */
    placeOfSupply: deliverySnapshot?.deliveryState || buyerState || undefined,
    /* The supplier of record AS IT STANDS NOW. A tax invoice without the
     * supplier's GSTIN is not a tax invoice, and the invoice page cannot read
     * it from site settings — `gst` is in PRIVATE_SITE_FIELDS. See the schema.
     *
     * 🛑 This was `gstSettings.gstin` unconditionally — the PLATFORM's
     * registration on every order ever placed, with no way for a seller to
     * invoice under their own, while the seeded FAQ told buyers otherwise.
     * It now resolves seller-first via `resolveSupplierIdentity`. */
    supplierGstin: supplier.gstin,
    supplierLegalName: supplier.legalName,
    supplierAddress: supplier.address,
    /* Per-rate, for Rule 46. Computed by `sumGroupGst` rather than re-derived
     * downstream — a mixed 5%+18% order cannot produce a compliant invoice
     * from the aggregate triple alone. */
    gstByRate: gstBreakdown?.byRate.length ? gstBreakdown.byRate : undefined,
    /*
     * 🛑 This must include the GST on the PLATFORM FEE, not just product GST.
     *
     * `gstBreakdown` exists only when product GST is non-zero, and this
     * catalogue's products carry no `gstRate` — so for every real order so far
     * this resolved to `undefined`. Measured 2026-10-03: 0 of 40 live orders
     * had a `gstAmount`, and the order page's Tax row (which maps from it via
     * adapters.ts `tax: doc.gstAmount`) had therefore NEVER rendered.
     *
     * Meanwhile the buyer IS charged `platformFeeGst` — it is a term in the
     * `orderTotal` expression above — and checkout displays it: a real order
     * showed "GST ₹1.80" at checkout and an order page whose lines summed
     * ₹1.80 short of its own total, with nothing naming the gap.
     *
     * Summing both is what makes the order reconcile. Keep `cgst`/`sgst`/`igst`
     * as the product-only split; they describe the intra/inter-state breakdown
     * of goods, which fee GST is not part of.
     */
    gstAmount: (gstBreakdown?.gstAmount ?? 0) + platformFeeGst || undefined,
    cgst: gstBreakdown?.cgst || undefined,
    sgst: gstBreakdown?.sgst || undefined,
    igst: gstBreakdown?.igst || undefined,
    /* The eleven `emi*` order fields went with EMI stage 5a — they are off
       `OrderDocument` and `emiOrderFields` is deleted. */
    couponCode: appliedDiscounts[0]?.code,
    couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
    appliedDiscounts: appliedDiscounts.length > 0 ? appliedDiscounts : undefined,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    outOfStockPolicy,
    droppedItems: droppedItems.length > 0 ? droppedItems : undefined,
    /*
     * Item 1.39 — the consent record, stamped on EVERY order this checkout
     * produced rather than on the first one.
     *
     * 🛑 A multi-seller cart splits into N orders and each is separately
     * cancellable, refundable and disputable, so each needs the agreement that
     * governs it. Writing it once and joining through a batch id would make
     * "what did this buyer agree to for this order" a query that can fail.
     */
    policyConsent,
    ...extraOrderFields,
  });

  orderIds.push(order.id);

  await finalizeOrderPlacement({
    orderId: order.id,
    uid,
    group,
    pointsApplied,
    pointsBudget,
    firstItem,
    userEmail,
    userName,
    groupCouponCodes,
    couponUsageAccumulator,
    emailsToSend,
    orderItems,
    totalQuantity,
    orderTotal,
    shippingAddress,
    paymentMethod,
    storeOwnerId,
    paid: adminBypass,
    storeId: order.storeId,
  });

  return orderTotal;
}

/**
 * Place order(s) from the user's cart in a single Firestore transaction.
 *
 * Mirrors the existing /api/checkout route handler. Consumers should perform
 * auth + rate-limiting before calling this and supply the resolved user fields.
 */
export async function createCheckoutOrderAction(
  input: CreateCheckoutOrderInput,
): Promise<CheckoutOrderResult> {
  const {
    userId: uid,
    userName,
    userEmail,
    addressId,
    notes,
    excludedProductIds = [],
    adminBypass = false,
    adminBypassBy,
    outOfStockPolicy = OutOfStockPolicyValues.SKIP_ITEMS,
  } = input;

  /*
   * The TENDER, resolved before anything else because the COD and manual-UPI
   * guards below are about the tender and run before the cart read. The
   * ARRANGEMENT (`emiOptIn` + tenure) lives on the cart and is resolved after
   * it — see the block below the cart load.
   */
  /* `emiTenderFor` removed with EMI stage 5a: there is no `emi` tender to map. */
  const paymentMethod = input.paymentMethod;

  const siteSettings = await siteSettingsRepository.getSingleton();
  const commissions = siteSettings?.commissions ?? CHECKOUT_DEFAULT_COMMISSIONS;

  /*
   * ── §B: THE PLATFORM LEVEL OF THE METHOD PRECEDENCE ──────────────────────
   *
   * Replaces two hand-written per-method `if` blocks (`cod` against
   * `codEnabled`, `cash` against `upiManualEnabled`). They are gone rather
   * than kept alongside, because what they checked is a strict subset of what
   * `resolveMethodForContext` checks and two gates on one question is how they
   * drift.
   *
   * ⚠ `platformMethodRule` BRIDGES those same legacy toggles, so an admin who
   * had turned COD off on the existing screen stays in force — this is
   * additive, not a re-interpretation of stored config.
   *
   * 🛑 The STORE and LISTING levels cannot be resolved here: they need the
   * cart, which is loaded below. They are enforced per seller group further
   * down, where the store and its listings are already in hand. This block is
   * the platform ceiling and the buyer deny only — both of which are
   * cart-independent, and both of which should refuse before any stock is
   * touched.
   *
   * ⚠ `adminBypass` skips it, as it did before: an operator placing an order
   * on a buyer's behalf is the documented escape hatch, and it is already
   * gated on an admin permission at the action's edge.
   */
  if (!adminBypass) {
    /*
     * ⚠ A failed read yields `null`, which resolves to "not restricted" — a
     * risk control failing OPEN. Accepted here, narrowly, because the window
     * is nil: the next statement reads the cart from the same Firestore, so a
     * genuine outage fails this checkout a line later regardless. The
     * alternative (refusing every method when one read fails) would turn a
     * blip into a total checkout outage, which the plan rejects explicitly.
     * 🛑 This reasoning holds only while the value is LOCAL. If the deny-list
     * ever moves to auth behind an HTTP hop, revisit it — a remote read can
     * fail while Firestore is healthy, and then this really is fail-open.
     */
    const buyerDoc = await safeRead(() => userRepository.findById(uid), {
      route: "checkout/method-gate",
      key: `methodGate.buyer:${uid}`,
      fallback: null,
    });
    const refusal = methodRefusalMessage(
      paymentMethod,
      PAYMENT_METHOD_LABEL[paymentMethod as CheckoutPaymentMethod] ?? paymentMethod,
      { settings: siteSettings, buyer: buyerDoc },
    );
    if (refusal) throw new ValidationError(refusal);
  }

  const cart = await unitOfWork.carts.getOrCreate(uid);
  if (!cart.items || cart.items.length === 0) {
    throw new ValidationError(ERROR_MESSAGES.CHECKOUT.CART_EMPTY);
  }

  /*
   * ── The two payment axes, resolved ONCE, AFTER the cart is loaded ────────
   *
   * Everything below reads `paymentMethod` (the tender) and `emiOptIn` (the
   * arrangement) from here, never from `input`. A second place deciding "is
   * this an EMI order" is the drift this normaliser exists to prevent, and
   * the legacy `paymentMethod: "emi"` mapping only holds if exactly one
   * expression performs it.
   *
   * 🛑 It has to sit below the cart read because the plan LIVES on the cart,
   * not in the request — see `CartDocument.emiPlan`. The cart is loaded here
   * anyway, so this costs nothing.
   */
  /*
   * 🛑 The EMI ARRANGEMENT resolver was removed with EMI stage 5a. It read the
   * plan off `CartDocument.emiPlan` (now deleted) and normalised the legacy
   * `paymentMethod: "emi"` tender into an opt-in plus a tenure. No cart can
   * carry a plan, so every order is a full-price order.
   */

  const excludedSet = new Set(excludedProductIds);
  const selectedSet = cart.selectedItemIds?.length
    ? new Set(cart.selectedItemIds)
    : null;
  // No explicit selection means THE ACTIVE LANE, not the whole cart — see
  // defaultCheckoutItems. Falling back to every line made assertCheckoutLane
  // below throw on any multi-lane cart, which is most of them.
  const candidateItems = selectedSet
    ? cart.items.filter((item) => selectedSet.has(item.itemId))
    : defaultCheckoutItems(cart.items);
  const cartItems = candidateItems.filter(
    (item) => !excludedSet.has(item.productId),
  );
  if (cartItems.length === 0) {
    throw new ValidationError(ERROR_MESSAGES.CHECKOUT.CART_EMPTY);
  }

  // Lane priority + locked-line revalidation, before any money math runs.
  assertCheckoutLane(cart.items, cartItems);
  await assertLockedLinesStillValid(cartItems, uid);

  // Tier PP — OTP gate for high-value checkouts. Evaluated against the
  // WHOLE checkout batch's total (not each resulting per-seller order),
  // otherwise a buyer could dodge it by splitting a big cart across
  // sellers. Skipped for COD (physical hand-off at the door is its own
  // verification) and admin-bypass checkouts.
  await assertCheckoutValueOtp({
    uid,
    amount: cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    threshold: siteSettings?.payment?.otpCheckoutThreshold,
    paymentMethod,
    adminBypass,
  });


  /*
   * COD value cap — the SERVER half of the gate.
   *
   * 🛑 The checkout UI already disables the COD option above the cap and says
   * why. That is an affordance, not enforcement: this action is reachable by
   * POST with `paymentMethod: "cod"` regardless of what the page rendered, and
   * the whole point of the cap is the cash exposure on a refusal at the door.
   * A limit enforced only in the browser is not a limit (Root Cause #46 — a
   * field the schema accepts but the handler never verifies).
   *
   * Measured against the WHOLE checkout batch for the same reason the OTP gate
   * above is: per-seller orders are a split of one cart, so capping each one
   * would let a buyer clear a ₹3,000 limit with a ₹9,000 cart across three
   * sellers. Same `cartItems` reduction, deliberately not shared with the OTP
   * block — that one skips COD entirely, so the two can never be one test.
   *
   * `>` not `>=`: the setting is a maximum, so a cart exactly at the cap is
   * allowed. The client comparison is spelled the same way.
   */
  if (!adminBypass && paymentMethod === "cod") {
    const codMax = siteSettings?.payment?.codMaxOrderValue;
    const effectiveCodMax =
      typeof codMax === "number" ? codMax : COD_MAX_ORDER_VALUE_FALLBACK;
    const cartTotalForCodCheck = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    if (cartTotalForCodCheck > effectiveCodMax) {
      failedCheckoutRepository
        .logCheckout(uid, "cod_over_limit", "Cart exceeds the COD value cap", {
          addressId: addressId ?? "",
          paymentMethod,
        })
        .catch(() => undefined);
      throw new ApiError(400, CHECKOUT_ERROR_CODES.COD_LIMIT_EXCEEDED);
    }
  }

  const isDigitalCart = cartIsDigitalOnly(cartItems);

  let shippingAddress: string | undefined;
  let deliverySnapshot: DeliverySnapshot | undefined;
  let resolvedAddress: import("../../../../features/addresses/schemas/firestore").AddressDocument | null = null;
  if (!isDigitalCart) {
    if (!addressId) {
      failedCheckoutRepository
        .logCheckout(uid, "address_not_found", "Address required for physical cart", { addressId: "", paymentMethod })
        .catch((err: unknown) => { void normalizeError(err); serverLogger.warn(AUDIT_LOG_FAIL_MSG, { error: err instanceof Error ? err.message : String(err) }); });
      throw new NotFoundError(ERROR_MESSAGES.CHECKOUT.ADDRESS_REQUIRED);
    }
    const addressDoc = await unitOfWork.addresses.findById(addressId);
    resolvedAddress =
      addressDoc && addressDoc.ownerType === "user" && addressDoc.ownerId === uid
        ? addressDoc
        : null;
    if (!resolvedAddress) {
      failedCheckoutRepository
        .logCheckout(uid, "address_not_found", "Address not found", { addressId, paymentMethod })
        .catch((err: unknown) => { void normalizeError(err); serverLogger.warn(AUDIT_LOG_FAIL_MSG, { error: err instanceof Error ? err.message : String(err) }); });
      throw new NotFoundError(ERROR_MESSAGES.CHECKOUT.ADDRESS_REQUIRED);
    }
    shippingAddress = formatShippingAddress(resolvedAddress);
    /*
     * 🛑 REVEALED first. `findById` returns this PII encrypted, and
     * `snapshotDeliveryAddress` demands `AddressPlain` precisely so that
     * freezing `enc:v1:…` onto an invoice is a compile error rather than
     * something discovered on a printed label.
     */
    deliverySnapshot = snapshotDeliveryAddress(
      unitOfWork.addresses.revealAddress(resolvedAddress),
    );
  }

  const db = getAdminDb();

  // SB6-C — pre-tx fetch products so we can run the maxPerUser cap check
  // (count queries can't run inside a Firestore transaction). The same
  // product docs are re-read inside the transaction below for stock + prize
  // pool checks; this is intentional (the tx is the source of truth for the
  // counts we actually mutate).
  //
  // SB-UNI-5 2026-05-13 — for bundle cart-lines we pair the bundle item with
  // its FIRST member product (so the maxPerUser cap check uses real product
  // data instead of failing the bundle's category-id lookup). The full
  // bundle-member stock fan-out happens in-tx below.
  const preTxLookup = getExpandedDecrements(cartItems);
  const preTxProductRefs = preTxLookup.productIds.map((pid) =>
    db.collection(PRODUCT_COLLECTION).doc(pid),
  );
  const preTxProductSnaps = await Promise.all(preTxProductRefs.map((r) => r.get()));
  const preTxProductById = new Map<string, ProductDocument>();
  for (let i = 0; i < preTxLookup.productIds.length; i++) {
    const snap = preTxProductSnaps[i];
    if (snap.exists) {
      preTxProductById.set(
        preTxLookup.productIds[i],
        snap.data() as ProductDocument,
      );
    }
  }

  /*
   * ── ITEM 1.39 — THE BLOCKING BUYER POLICY AGREEMENT ───────────────
   *
   * Pre-mutation and pre-capture. Everything between the cart read and here is
   * reads and validation; the transaction is far below. This is the last point
   * at which refusing costs nothing. On the COD/manual path "before the order"
   * and "before the money" are the same instant; on the gateway path they are
   * two different requests, which is why that path takes its consent at
   * create-order time instead (see `verifyAndPlaceGatewayOrderAction`).
   *
   * 🛑 Throws on absence or mismatch. A consentless order is REJECTED, never
   * placed-with-a-warning — the no-refund-after-reveal mechanic is only
   * defensible if the agreement that enables it was actually taken.
   *
   * 🛑 LISTING TYPES COME FROM THE PRODUCT DOCUMENTS — not the cart's
   * denormalised copy, and never the request. `CartItemDocument.listingType` is
   * written server-side at add-to-cart time, which makes it untampered but not
   * CURRENT: a product retyped to a concealed listing after it was added would
   * leave a stale `standard` on the line, and the reveal clause would be
   * silently dropped from the one order that most needs it.
   * `preTxProductById` is the authoritative read and is already in hand for the
   * max-per-user gate, so this costs no extra round trip — which is why the
   * gate sits here rather than beside the OTP check above.
   *
   * The cart copy is the FALLBACK for a line whose product could not be read
   * (deleted mid-checkout — the stock check below refuses it anyway), and
   * `standard` is the last resort: it carries `supportsShipping`, so the
   * no-refund-after-dispatch clause still applies rather than vanishing.
   */
  const policyConsent = await assertBuyerPolicyConsent({
    uid,
    listingTypes: cartItems.map(
      (item) =>
        (preTxProductById.get(item.productId)?.listingType ??
          item.listingType ??
          "standard") as ListingType,
    ),
    /*
     * §C — the TENDER, so the cash-on-delivery clauses resolve. Passing the
     * normalised `paymentMethod` rather than `input.paymentMethod`: the
     * legacy `"emi"` tender is mapped before this point, and the gate must
     * hash the method the ORDER will actually carry, not the one the request
     * named.
     */
    paymentMethod,
    settings: siteSettings?.checkoutPolicies,
    submitted: input.policyConsent,
    capturedOn: "checkout",
    /*
     * 🛑 A REQUEST, re-verified inside the gate against
     * `admin:checkout:bypass` — never a trusted boolean. `adminBypass` arrives
     * on this action's own input, so the day a route wires it from a request
     * body a trusted flag here would make the whole consent gate switchable off
     * by any client. The gate answers 403 when the uid does not hold it.
     */
    requestAdminBypass: adminBypass,
  });
  /*
   * Payment-method gate — before `enforceMaxPerUserForCart`, which runs count
   * queries, because this answer needs no reads at all.
   *
   * 🛑 `preTxProductById` is the right map and `preTxPairs` below is NOT: that
   * pairing keeps only `getCartItemMemberIds(item)[0]`, so a bundle or grouped
   * line contributes one member and the rest are invisible. The gate walks
   * every member of every line against this map.
   *
   * 🛑 This ONE call site is complete coverage, and that is worth stating so
   * nobody adds a second. Only `cod`/`cash`/`emi` are ever blocked (collector drop,
   * bundle, prize-draw) and all three arrive here; the Razorpay path is always
   * `"online"`, which no rule blocks — and a throw there would land AFTER
   * capture, taking the buyer's money and then refusing the order. Pre-capture
   * is the only safe place for this, and the method is decided here.
   */
  /*
   * 🛑 The third argument is NOT optional in effect, even though its type
   * allows omission. The gate FAILS CLOSED: a listing type carrying
   * `requiresGatewayPermission` (collector-drop, clearance) is refused
   * online payment unless the ACTIVE gateway declares it accepts that type.
   * Razorpay and PhonePe declare nothing, because both name "Bidding/Auction
   * houses" in their prohibited-merchant lists; only Cashfree opens them.
   *
   * Read off the registered provider rather than compared against the string
   * "cashfree", so a second permitted gateway is a change to that adapter and
   * not to this call site (Root Cause #61).
   */
  /*
   * ── Phase 1c: WHICH gateway may collect, for the ONLINE tender ────────────
   *
   * 🛑 Gated on `paymentMethod === "online"`, and that gate is the rule rather
   * than an optimisation. The commingling this guards against is a property of
   * a GATEWAY CAPTURE: the money lands in the aggregator's escrow and is
   * settled out of it. COD, cash and a manual bank/UPI transfer involve no
   * capture at all — a manual transfer is already buyer-to-whoever-the-admin-
   * names — so applying the rule there would refuse the one set of tenders
   * that has no commingling problem.
   *
   * 🛑 Reachable, which is why this is not capture-route-only: `/api/checkout`
   * accepts `paymentMethod: "online"`, so this action creates orders for an
   * online tender BEFORE any capture exists. Guarding only
   * `/api/payment/create-order` would leave this entry point open.
   *
   * 🛑 RESOLVED NON-THROWING FIRST, so the gate below can be told which gateway
   * would really collect. Passing `getProviders().payment` there — the
   * process-level tie-break winner — would refuse a collector-drop whenever
   * PhonePe sorts ahead of an enabled Cashfree, i.e. exactly the configuration
   * Phase 1c exists to make work. The two gates then compose instead of
   * disagreeing.
   */
  const collectingGateway =
    paymentMethod === "online"
      ? resolveCollectingGatewayForCart({
          items: cartItems,
          productById: preTxProductById,
          platformStoreId: siteSettings?.payment?.platformStoreId,
        })
      : null;

  assertPaymentMethodAllowed(cartItems, preTxProductById, paymentMethod, {
    /*
     * The gateway that would actually collect when there is one; otherwise the
     * process default, which is what every non-online tender is measured
     * against and is unchanged. Either way `undefined` means ACCEPTS NOTHING
     * (`PaymentGateContext.gatewayAccepts`), so a failed resolution cannot
     * widen this.
     */
    gatewayAccepts: collectingGateway
      ? collectingGateway.provider?.acceptsRestrictedListingTypes
      : getProviders().payment?.acceptsRestrictedListingTypes,
  });

  /*
   * Thrown AFTER the listing-level gate, deliberately. A listing that forbids
   * online payment outright (`blockedPaymentMethods`) should say so in its own
   * words; the gateway refusal is the narrower, second reason and must not
   * mask it. When only this one binds it throws `GATEWAY_UNAVAILABLE_FOR_CART`
   * naming which of the two independent constraints applied.
   */
  if (collectingGateway && !collectingGateway.resolution.ok) {
    /*
     * Re-resolves rather than re-throwing the stored resolution, because the
     * error SHAPE (code, `constraint`, `detail`) belongs to
     * `assertCollectingGateway` and must have exactly one definition — a
     * hand-rolled `Object.assign(new ValidationError(...))` here would be a
     * second one to drift from (Root Cause #61). The resolution is pure with
     * no IO, so the repeat costs nothing.
     */
    assertCollectingGateway({
      items: cartItems,
      productById: preTxProductById,
      platformStoreId: siteSettings?.payment?.platformStoreId,
    });
  }
  /*
   * 🛑 The second axis needs its own assertion, and omitting it would have
   * been a silent regression of a rule that already exists.
   *
   * `clearanceRule.blockedPaymentMethods` lists `"emi"` because winner
   * assignment waits on confirmed payment. Once EMI stopped being a tender,
   * that entry stopped matching anything — the gate above would see
   * `upi_manual` (explicitly ALLOWED for prize draws) and wave through an
   * instalment plan on a listing type that forbids one. This reads the SAME
   * declaration rather than a second list, so a rule written once still
   * governs both axes.
   */
  /* `assertEmiOptInAllowed` removed with EMI stage 5a — it returned early
     unless `emiOptIn`, and nothing can opt in now. */

  const preTxPairs = cartItems
    .map((item): { item: CartItemDocument; product: ProductDocument } | null => {
      const [firstMember] = getCartItemMemberIds(item);
      const product = preTxProductById.get(firstMember);
      return product ? { item, product } : null;
    })
    .filter((pair): pair is { item: CartItemDocument; product: ProductDocument } => pair !== null);
  await enforceMaxPerUserForCart({ userId: uid, items: preTxPairs });

  // SB-UNI-O 2026-05-15 — Live-item jurisdiction guard (pre-tx, uses pre-tx product map).
  if (!isDigitalCart && resolvedAddress) {
    assertLiveJurisdiction(cartItems, preTxProductById, resolvedAddress.state);
  }

  let stockResult: StockResult;
  try {
    stockResult = await db.runTransaction(async (tx): Promise<StockResult> => {
      // SB-UNI-5 2026-05-13 — bundle-aware stock fan-out. Build the unique
      // product-id set across the whole cart (regular items + each bundle's
      // members) and fetch each one ONCE. Validation walks per cart-line and
      // checks every required member against the cart-cumulative decrement.
      const expansion = getExpandedDecrements(cartItems);
      const productRefById = new Map<
        string,
        FirebaseFirestore.DocumentReference
      >();
      for (const pid of expansion.productIds) {
        productRefById.set(pid, db.collection(PRODUCT_COLLECTION).doc(pid));
      }
      const productDocs = await Promise.all(
        expansion.productIds.map((pid) =>
          tx.get(productRefById.get(pid) as FirebaseFirestore.DocumentReference),
        ),
      );
      const productById = new Map<string, ProductDocument>();
      for (let i = 0; i < expansion.productIds.length; i++) {
        const doc = productDocs[i];
        if (doc.exists) {
          productById.set(
            expansion.productIds[i],
            doc.data() as ProductDocument,
          );
        }
      }

      // Bundle cart-lines surface the first member as the "product" so
      // downstream listingType branching (prize-draw) stays sound — bundle
      // pricing is always "standard" so the prize-draw cap isn't enforced.
      const bucketed = bucketCartItemsByStock(
        cartItems,
        productById,
        expansion.decrements,
        (item) => productById.get(getCartItemMemberIds(item)[0]) ?? null,
      );
      const unavailableItems: StockResult["unavailable"] = bucketed.unavailable;

      // outOfStockPolicy: "cancel_order" — abort the WHOLE checkout batch if
      // anything is short. This throw happens before any tx.update/tx.set
      // below, so Firestore's transaction semantics guarantee zero writes
      // land — no compensating rollback logic needed.
      if (outOfStockPolicy === OutOfStockPolicyValues.CANCEL_ORDER && unavailableItems.length > 0) {
        throw new ValidationError(ERROR_MESSAGES.CHECKOUT.INSUFFICIENT_STOCK);
      }

      const availableItems: StockResult["available"] = [];
      for (const { item, product } of bucketed.available) {
        // S-SBUNI-RULES 2026-05-13 — sync preflight (prize-pool cap, pre-order
        // quota) via rule registry. Multi-member lines skip: their listingType
        // describes the wrapper, not the members.
        if (!isMultiMemberLine(item)) {
          runSyncPreflight([{ item, product }], paymentMethod);
        }
        availableItems.push({ item, product });
      }

      // Apply per-product decrements ONCE per unique product (sums across the
      // cart) so two cart lines sharing a product don't double-decrement.
      if (availableItems.length > 0) {
        for (const [pid, qtyDelta] of expansion.decrements) {
          const product = productById.get(pid);
          if (!product) continue;
          const update = buildStockUpdatePayload(product, qtyDelta);
          tx.update(
            productRefById.get(pid) as FirebaseFirestore.DocumentReference,
            update,
          );
        }
      }

      if (availableItems.length > 0) {
        // Clear by LINE identity, not by productId. `itemId` is what uniquely
        // identifies a line; `productId` is not unique across lines and is not
        // even a product id on a bundle/group line (it points at the bundle
        // category, or at the group parent — which is itself purchasable). So
        // matching on it deleted every OTHER line that happened to share the
        // value: a loose "Set" parent sitting beside a group line built from
        // that same group, or two lines of one product, both vanished when only
        // one was ordered.
        const orderedItemIds = new Set(availableItems.map((a) => a.item.itemId));
        const remainingCartItems = cart.items.filter((ci) => !orderedItemIds.has(ci.itemId));
        const cartRef = db.collection(CART_COLLECTION).doc(uid);
        tx.set(
          cartRef,
          {
            items: remainingCartItems,
            appliedCoupons: [],
            selectedItemIds: null,
            updatedAt: new Date(),
          },
          { merge: true },
        );
      }

      return { available: availableItems, unavailable: unavailableItems, productById };
    });
  } catch (err: unknown) {
    void normalizeError(err);
    failedCheckoutRepository
      .logCheckout(uid, "unknown", err instanceof Error ? err.message : String(err), {
        addressId,
        paymentMethod,
      })
      .catch((logErr: unknown) => { void normalizeError(logErr); serverLogger.warn(AUDIT_LOG_FAIL_MSG, { error: logErr instanceof Error ? logErr.message : String(logErr) }); });
    throw err;
  }
  const { available, unavailable, productById: checkoutProductById } = stockResult;

  if (available.length === 0) {
    failedCheckoutRepository
      .logCheckout(uid, "stock_failed", "All items out of stock", {
        addressId,
        paymentMethod,
        cartItemCount: cartItems.length,
      })
      .catch((logErr: unknown) => { void normalizeError(logErr); serverLogger.warn(AUDIT_LOG_FAIL_MSG, { error: logErr instanceof Error ? logErr.message : String(logErr) }); });
    throw new ValidationError(ERROR_MESSAGES.CHECKOUT.INSUFFICIENT_STOCK);
  }

  const { coupons: appliedCoupons, dropped: droppedCoupons } =
    await revalidateAppliedCoupons(cart.appliedCoupons ?? [], available, uid);

  /*
   * The THIRD group-rule enforcement point: the picker mirrors the rules,
   * `addGroupLineToCart` enforces them at add time, and this re-checks them at
   * placement. Without it a rule edited after a line was already in a cart is
   * never re-checked at all, and a quoted discount percentage outlives the rule
   * it was copied from.
   *
   * 🛑 Runs AFTER the stock bucketing, over `available` rather than the whole
   * cart — a line already dropped for being out of stock does not need its
   * group rules adjudicated too, and reporting both about one line would be two
   * explanations for one outcome.
   *
   * A blocked line THROWS: its selection is no longer valid and no price is
   * right for it. A repriced one is surfaced, which is `droppedCoupons`'
   * discipline — the buyer is on the payment step and cannot fix a seller's
   * rule change from there.
   */
  const groupRecheck = await revalidateGroupLines(available.map(({ item }) => item));
  if (groupRecheck.blocked.length > 0) {
    const first = groupRecheck.blocked[0];
    throw Object.assign(
      new ValidationError(
        `"${first.groupTitle}" can no longer be bought as selected. ${first.reason} Update that line in your cart and try again.`,
      ),
      { code: "GROUP_RULES_CHANGED" },
    );
  }

  const orderGroups = splitCartIntoOrderGroups(available);

  // Admin-bypass orders are immediately paid and processing; generate a shared
  // transaction reference for all orders in this checkout batch.
  const adminBatchId = adminBypass
    ? `ADMIN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    : undefined;

  const orderIds: string[] = [];
  let total = 0;
  const emailsToSend: Parameters<typeof sendOrderConfirmationEmail>[0][] = [];

  const cartSubtotal = orderGroups.reduce(
    (s, { items: g }) =>
      s + g.reduce((gs, { item, product }) => gs + lineTotalFor(item, product), 0),
    0,
  );

  const couponUsageAccumulator = new Map<string, CouponAccumEntry>();

  /*
   * The buyer-facing platform fee: a TAPERED per-unit rate, summed per cart
   * line, then GST. See `DEFAULT_PLATFORM_FEE_UNIT_BANDS` for the owner's three
   * rulings and for the delta against `mocks/18-shipping-fees.qm`, which still
   * draws a flat ₹10 per LINE.
   */
  /*
   * 🛑 `item.quantity` PER LINE, as an array — never a flattened total and
   * never `expandCartLineToOrderRows`'s output.
   *
   * Per line because the taper bands per line: 8 units as two lines of 4 bills
   * at ₹10 each (₹80); as one line of 8 it bills at ₹8 (₹64). Never the
   * expansion because a BX-53 deck set is ONE listing purchased — ₹10, not ₹60
   * — however many components the box holds (owner, 2026-11-08).
   */
  const lineUnitsOf = (g: { item: CartItemDocument }[]) =>
    g.map(({ item }) => item.quantity ?? 0);
  const lineUnitsByStore = new Map(
    orderGroups.map(({ items: g }) => [g[0].item.storeId, lineUnitsOf(g)] as const),
  );
  const cartLineUnits = orderGroups.flatMap(({ items: g }) => lineUnitsOf(g));
  const platformFeeByStore = allocateCheckoutFees(
    orderGroups.map(({ items: g }) => [
      g[0].item.storeId,
      g.reduce((sum, { item, product }) => sum + lineTotalFor(item, product), 0),
    ] as const),
    computeCheckoutFees(cartSubtotal, commissions, cartLineUnits),
    lineUnitsByStore,
    commissions,
  );

  /*
   * ── The checkout's points budget, read ONCE (D46/D47) ─────────────────────
   *
   * 🛑 One read for the whole checkout, not one per order group. Rule #6
   * budgets ~3 sequential Firestore round-trips per request, and a cart
   * spanning four sellers would otherwise pay four reads to learn one number.
   *
   * 🛑 And ZERO when the buyer did not opt in, so an ordinary checkout performs
   * no points read at all — the common case must not pay for a feature it is
   * not using.
   *
   * 🛑 `adminBypass` is deliberately excluded: that path takes no payment, so
   * there is nothing for points to reduce, and debiting a buyer's balance for
   * an order the admin placed free would be a theft with an audit-log entry
   * saying otherwise.
   */
  const useAllPoints = cart.useAllPoints === true && !adminBypass;
  const pointsBudget = { remaining: useAllPoints ? await safePointsBalance(uid) : 0 };

  const groupCtx: OrderGroupContext = {
    paymentMethod,
    commissions,
    appliedCoupons,
    cartSubtotal,
    couponUsageAccumulator,
    uid,
    userName,
    userEmail,
    shippingAddress,
    deliverySnapshot,
    notes,
    adminBypass,
    adminBypassBy,
    adminBatchId,
    orderIds,
    emailsToSend,
    outOfStockPolicy,
    droppedItems: unavailable,
    buyerState: resolvedAddress?.state,
    gstSettings: siteSettings?.gst,
    paymentSettings: siteSettings?.payment,
    storeAddons: cart.storeAddons,
    policyConsent,
    platformFeeByStore,
    selectedShippingQuote: input.selectedShippingQuote,
    selectedShippingOptions: input.selectedShippingOptions,
    productById: checkoutProductById,
    useAllPoints,
    pointsBudget,
  };
  for (const { items: group, orderType } of orderGroups) {
    total += await createOrderForGroup(group, orderType, groupCtx);
  }

  /*
   * Item 1.39 — backlink the consent to the orders it covered. Never awaited
   * for correctness: the authoritative copy is already on each order document,
   * so this is the convenience index and a failure must not undo a successful
   * placement. See `attachOrdersToPolicyConsent`, which swallows and logs.
   */
  await attachOrdersToPolicyConsent(policyConsent.consentId, orderIds);

  await flushCouponUsageAccumulator(couponUsageAccumulator, uid);

  /*
   * ── 🛑 THE POINTS REDEMPTION BLOCK WAS DELETED HERE, 2026-10-21 (D46) ─────
   *
   * It debited the buyer's points and reduced NOTHING, and its own comment
   * asserted the opposite. Preserved verbatim because the reasoning error is
   * the instructive part:
   *
   *     "This ordering is the whole safety argument. … This way the worst case
   *      is an order placed at full price with the balance intact."
   *
   * The balance was not intact. It was debited. That sentence reasons only
   * about the branch where `redeem` THROWS — in which case, yes, the buyer
   * keeps their points. The SUCCESS branch is the broken one: by the time this
   * ran, `createOrderForGroup` had already created every order and the gateway
   * had already captured `total`, so a successful redeem took points from a
   * buyer who had just paid full price. No order field, no cart field and no
   * gateway amount was ever reduced by `spend`.
   *
   * 🛑 It was unreachable, and that is the only reason it cost nothing: no
   * route schema, no caller and no UI ever passed `pointsToRedeem` — verified
   * across `src/` and `appkit/src/`. So the hazard was not the behaviour, it
   * was that ADDING ONE FIELD to one route schema would have made it live,
   * while `UserPointsView` already promises buyers "up to half of an order's
   * total can be paid with points". Somebody would have wired it.
   *
   * Deleting it leaves a promise with no mechanism, which is a disappointment.
   * Keeping it left a mechanism that silently takes points, which is a theft.
   *
   * ## ✅ The real tender was BUILT 2026-10-22 — and it is not here
   *
   * 🛑 Do not look for it at this line. Points are a TENDER, so they are a
   * STAGE inside each order-creation path, immediately after that path's single
   * `roundRupees` and BEFORE anything is written or captured:
   *
   *   - `resolvePointsTender` (`_internal/shared/checkout/order-math.ts`) —
   *     the arithmetic, beside every other money rule.
   *   - the stage in `createOrderForGroup` and `createPhonePeGroupOrder`,
   *     which write `pointsApplied` + `amountDue` onto the order.
   *   - `settlePointsTender` — ONE debit implementation shared by both paths,
   *     running after the order exists so the discount and the debit are two
   *     halves of one recorded fact, and reverting the discount if `redeem`
   *     refuses.
   *
   * This note stays because the mistake is worth keeping, but a comment saying
   * a feature is "missing" while it sits 800 lines above is its own trap — it
   * is how `assertReturnWindowOpen` got reported as absent when my own comment
   * was shadowing the real answer. The accurate statement is: the tender is
   * built, and this is the wrong place for it.
   */

  dispatchOrderConfirmationEmails(emailsToSend);

  serverLogger.info(
    `createCheckoutOrderAction: ${orderIds.length} order(s) placed for uid=${uid}` +
      (unavailable.length > 0 ? ` (${unavailable.length} item(s) unavailable)` : ""),
  );

  return {
    orderIds,
    total,
    itemCount: orderIds.length,
    ...(unavailable.length > 0 ? { unavailableItems: unavailable } : {}),
    ...(droppedCoupons.length > 0 ? { droppedCoupons } : {}),
    ...(groupRecheck.repriced.length > 0
      ? {
          repricedGroupLines: groupRecheck.repriced.map((r) => ({
            groupTitle: r.groupTitle,
            previousPercent: r.previousPercent,
            currentPercent: r.currentPercent,
          })),
        }
      : {}),
  };
}

export interface CheckoutPricingPreviewInput {
  userId: string;
  /** Omitted for digital-only carts — GST can't be computed without a buyer state. */
  addressId?: string;
  paymentMethod: CheckoutPaymentMethod;
  excludedProductIds?: string[];
  /**
   * Which cart lane to price. Only one lane is payable in a single checkout, so
   * a preview spanning lanes would be a number the buyer can never be charged.
   *
   * Passed in rather than derived from `activeLane` server-side because the cart
   * page previews whichever tab the buyer is looking at — including a lane that
   * is currently gated off.
   */
  lane?: CartLane;
  /**
   * LEGACY ONLY — see `CreateCheckoutOrderInput.emiTenureMonths`.
   *
   * 🛑 The plan is read off `CartDocument.emiPlan`, so the preview and the
   * order resolve it from the same durable value. This docstring used to argue
   * the opposite — *"the tenure is NOT on the cart document: it is picked on
   * the payment step and belongs to the order, so it has to travel with the
   * request"* — and that reasoning is what left the ONLINE path unable to
   * agree with itself, because `/api/payment/create-order` decides the capture
   * amount in one request and `/api/payment/verify` writes the order in
   * another. A request body cannot be read by both.
   *
   * The surcharge is `principalRemaining × surchargePercentPerMonth ×
   * tenureMonths`, so it genuinely cannot be derived from the cart ITEMS
   * alone — which is why the tenure had to become part of the cart DOCUMENT
   * rather than part of the request.
   */
  emiTenureMonths?: number;
  /**
   * Add-on selections are NOT accepted here. They live on the cart document,
   * keyed per store (`CartDocument.storeAddons`), because that is the
   * granularity they are billed at. Accepting them here as well would be a
   * second source of truth for the same charge.
   */
}

/** One store's slice of the preview — what that seller's order will cost. */
export interface CheckoutPricingPreviewStore {
  storeId: string;
  storeName: string;
  subtotal: number;
  shippingFee: number;
  /**
   * THE SHIPPING OPTIONS THIS SELLER OFFERS, priced server-side.
   *
   * 🛑 The picker must render THIS and nothing else. The checkout UI currently
   * calls `POST /api/shipping/quote` and shows raw carrier options, which is a
   * second source of truth for what is purchasable: a seller who has not
   * accepted carrier quotes would be shown couriers the order path then refuses
   * with `option-not-offered` — i.e. the buyer would meet the refusal AFTER
   * pressing pay. Offering exactly what `resolveShippingSelection` will accept
   * is what makes the picker and the charge agree by construction rather than
   * by both happening to call the same carrier.
   *
   * 🛑 `amount` on each option is the SERVER's price. The browser renders it
   * and posts back only `optionId`; it never sends an amount, and an amount it
   * did send would be ignored (see `CreateCheckoutOrderInput`).
   *
   * Empty when no line in this seller's group supports shipping — a
   * digital-code group offers no options and acquires no fee, resolved through
   * `cartRequiresShipping` off the capability registry rather than by asking
   * what type anything is.
   */
  shippingOptions: ShippingOptionOffer[];
  codHandlingFee: number;
  whatsappNotifyFee: number;
  giftWrapFee: number;
  shipmentProtectionFee: number;
  saleProtectionFee: number;
  /* `emiSurcharge` / `emiDeferred` removed with EMI stage 5a. */
  gstAmount: number;
  couponDiscount: number;
  total: number;
  /**
   * ── C5e tiers 2 and 3, resolved SERVER-SIDE for this store ───────────────
   *
   * 🛑 Carried on the preview rather than fetched by the client, for two
   * reasons that both matter. The cart has neither the store document nor the
   * products — `CartItemDocument` snapshots only `storeId`/`storeName` — so a
   * client-side gate would need a store fetch per seller, which is both a
   * read per render and an invitation to pass a raw `StoreDocument` into a
   * `"use client"` component (Root Cause #70, the leak this plan's projection
   * work exists to close).
   *
   * And the tiers are already computed here to price the fee. Returning the
   * same three booleans the fee was computed from is what makes the checkbox
   * the buyer sees and the amount they are charged provably the same decision
   * — rather than two gates that agree by discipline.
   */
  supportsShippingProtection: boolean;
  supportsSaleProtection: boolean;
  /** True when any of this store's priced lines is `finalSale`. */
  hasFinalSaleItem: boolean;
  /**
   * D46/D47 + decision 22 — does this seller accept points?
   *
   * Carried for the same reason as the two protection booleans directly above:
   * the gate and the amount must be provably one decision rather than two that
   * agree by discipline. A seller card can then say "points not accepted here"
   * instead of the buyer wondering why their discount is smaller than their
   * balance.
   */
  acceptsPoints: boolean;
  /** Points applied to THIS store's order. Zero when it does not accept them. */
  pointsApplied: number;
  /**
   * S5a — the shared-purchase fee for this store's order (handling + extra
   * shipping legs). Zero on an ordinary single-destination order.
   *
   * 🛑 Surfaced because a coordinator commits against the preview, and the
   * plan is explicit that these fees must be shown BEFORE they commit.
   */
  sharedPurchaseFee: number;
}

export interface CheckoutPricingPreview {
  subtotal: number;
  shippingFee: number;
  codHandlingFee: number;
  whatsappNotifyFee: number;
  giftWrapFee: number;
  shipmentProtectionFee: number;
  saleProtectionFee: number;
  /* `emiSurcharge` / `emiDeferred` removed with EMI stage 5a. */
  gstAmount: number;
  couponDiscount: number;
  /** Buyer-facing platform fee — `Σ over lines ( taperedRate(units) × units )`. */
  platformFee: number;
  /** GST on the platform fee. */
  gstOnFee: number;
  /**
   * Total units the fee was computed from — `Σ item.quantity`, where a
   * composite listing counts ONCE however many components it contains.
   */
  platformFeeUnitCount: number;
  /**
   * The per-line derivation of the fee, so the Order Summary can explain a
   * TAPERED charge the buyer can actually check.
   *
   * 🛑 Returned rather than left to the client to re-derive. With a volume
   * taper the fee is no longer "count × one rate", so a browser recomputing it
   * would have to re-implement the band lookup — a second implementation of a
   * money rule (Root Cause #75) in the least trustworthy place, and free to
   * disagree in exactly the per-line-vs-per-order direction the bands turn on.
   */
  platformFeeLines: { units: number; ratePerUnit: number; amount: number }[];
  /**
   * S5a — handling plus extra shipping legs, across every store in the cart.
   *
   * 🛑 A real additive charge, unlike the tax-inclusive `gstAmount`, so it is
   * a term in `total` and belongs in the fee column.
   */
  sharedPurchaseFee: number;
  total: number;
  /**
   * D46/D47 — points applied across every accepting store in this checkout.
   *
   * 🛑 `total` stays the ORDER VALUE and is not reduced by this. `amountDue`
   * below is what the buyer actually pays, and the two are deliberately both
   * returned: the summary shows the full total, the discount line, and then the
   * amount due, which is how a buyer can see what their points did. Collapsing
   * them into one figure would hide the discount from the person who earned it.
   */
  pointsApplied: number;
  /**
   * What the gateway will be asked to capture: `total − pointsApplied`.
   *
   * 🛑 THIS is the parity figure. The capture route and the post-capture guard
   * must both use it, or points become a sixth way the captured amount diverges
   * from the recorded order (D37/D38/D40). Equal to `total` whenever neither
   * points nor instalments apply, so every existing reader of `total` stays
   * correct.
   *
   * 🛑 Instalments reduce it too, via `amountDueNow` — the same expression the
   * two order writers use. An EMI buyer pays the TOKEN today; quoting the full
   * total here is what made the manual-payment page ask for the whole amount
   * while scheduling instalments for the same money.
   */
  amountDue: number;
  /**
   * The buyer's remaining points balance, for the cart's own copy ("you have
   * N points"). Zero when they have not opted in — the preview does not read a
   * balance it is not going to use.
   */
  pointsBalance: number;
  /**
   * Per-store breakdown, in group order. Every figure here was already being
   * computed inside the per-group loop and then discarded into an aggregate —
   * surfacing it is what lets each seller card show its own fees.
   *
   * A store with no selected items forms no group and therefore never appears.
   */
  stores: CheckoutPricingPreviewStore[];
}

const EMPTY_PRICING_PREVIEW: CheckoutPricingPreview = {
  subtotal: 0,
  shippingFee: 0,
  codHandlingFee: 0,
  whatsappNotifyFee: 0,
  giftWrapFee: 0,
  shipmentProtectionFee: 0,
  saleProtectionFee: 0,
  gstAmount: 0,
  couponDiscount: 0,
  platformFee: 0,
  gstOnFee: 0,
  platformFeeUnitCount: 0,
  platformFeeLines: [],
  sharedPurchaseFee: 0,
  total: 0,
  pointsApplied: 0,
  amountDue: 0,
  pointsBalance: 0,
  stores: [],
};

/**
 * Read-only "what will I actually be charged" preview for the checkout
 * Order Summary. Reuses the exact same building blocks
 * createCheckoutOrderAction / verifyAndPlaceGatewayOrderAction use when an
 * order is actually placed — resolveShippingCost, the compute*Fee helpers,
 * computeGroupCouponDiscount, and the GST calc — so the number shown to the
 * buyer can never diverge from what gets charged/recorded. Never decrements
 * stock, creates an order, or writes coupon usage.
 */
export async function previewCheckoutPricing(
  input: CheckoutPricingPreviewInput,
): Promise<CheckoutPricingPreview> {
  const {
    userId: uid,
    addressId,
    excludedProductIds = [],
    lane,
  } = input;

  /*
   * 🛑 Same normaliser as `createCheckoutOrderAction`, and on an INCOMPATIBLE
   * combination this prices the tender WITHOUT instalments rather than
   * throwing.
   *
   * The preview exists so a buyer can see consequences while they fiddle with
   * controls; a 500 in the middle of that blanks the Order Summary and reads
   * as a broken page. The order action still refuses, which is where refusing
   * belongs — the same split this function already makes for EMI eligibility
   * two hundred lines below.
   */
  /* `emiTenderFor` removed with EMI stage 5a: there is no `emi` tender to map. */
  const paymentMethod = input.paymentMethod;

  const siteSettings = await siteSettingsRepository.getSingleton();
  const commissions = siteSettings?.commissions ?? CHECKOUT_DEFAULT_COMMISSIONS;

  const cart = await unitOfWork.carts.getOrCreate(uid);
  /* The EMI arrangement resolver went with EMI stage 5a — `CartDocument.emiPlan`
     is deleted, so a preview can never price an instalment plan. */
  const excludedSet = new Set(excludedProductIds);
  const selectedSet = cart.selectedItemIds?.length ? new Set(cart.selectedItemIds) : null;
  // An explicit lane wins: the cart page prices whichever tab is open, which may
  // not be the one that is currently payable. Falling back to activeLane keeps
  // the checkout page's existing behaviour unchanged.
  const previewLane = lane ?? activeLane(cart.items ?? []);
  const cartItems = (cart.items ?? []).filter(
    (item) =>
      !excludedSet.has(item.productId) &&
      (!selectedSet || selectedSet.has(item.itemId)) &&
      // A preview never throws — it just shows the lane the buyer can actually
      // check out, matching what the checkout page's active tab displays.
      (!previewLane || laneOf(item) === previewLane),
  );
  // A fresh object, not the module singleton — an in-process caller mutating
  // the returned preview would otherwise poison every later empty result.
  if (cartItems.length === 0) return { ...EMPTY_PRICING_PREVIEW, stores: [] };

  // Best-effort product lookup — a preview never throws on a since-unpublished
  // product, it just falls back to the item's cart-snapshot price for that
  // line (same fallback cartRepository.getSubtotal() implicitly relies on).
  //
  // Fetch by the EXPANDED member set, not by `item.productId`. On a bundle line
  // `productId` is a CATEGORY id, so it resolved to null and the GST loop below
  // read `product?.gstRate ?? 0` — which is precisely why a bundle has paid no
  // GST since bundles reached the cart. The expansion is the same fan-out the
  // stock decrement uses, so preview and placement agree by construction.
  const expandedIds = getExpandedDecrements(cartItems).productIds;
  const uniqueProductIds = [...new Set([...expandedIds, ...cartItems.map((i) => i.productId)])];
  const productDocs = await Promise.all(uniqueProductIds.map((pid) => productRepository.findById(pid)));
  const productById = new Map(uniqueProductIds.map((pid, i) => [pid, productDocs[i]]));
  /** Non-null view, for helpers that need a definite product map. */
  const resolvedProductById = new Map(
    [...productById.entries()].filter(([, p]) => p != null) as Array<[string, ProductDocument]>,
  );

  let resolvedAddress: import("../../../../features/addresses/schemas/firestore").AddressDocument | null = null;
  if (addressId) {
    const addressDoc = await unitOfWork.addresses.findById(addressId);
    resolvedAddress =
      addressDoc && addressDoc.ownerType === "user" && addressDoc.ownerId === uid ? addressDoc : null;
  }

  const checks = cartItems.map((item) => ({ item, product: productById.get(item.productId) ?? null }));
  const orderGroups = splitCartIntoOrderGroups(checks);

  const cartSubtotal = orderGroups.reduce(
    (s, { items: g }) => s + g.reduce((gs, { item, product }) => gs + lineTotalFor(item, product), 0),
    0,
  );

  // Same re-validation the real order placement runs, so the preview never
  // shows a discount the order won't actually honour.
  const { coupons: appliedCoupons } = await revalidateAppliedCoupons(
    cart.appliedCoupons ?? [],
    checks,
    uid,
  );

  // Each group's figures are kept, not just summed away — the aggregates below
  // are derived FROM this array, so a store card and the summary panel can never
  // disagree about the same fee.
  const stores: CheckoutPricingPreviewStore[] = [];

  for (const { items: group } of orderGroups) {
    const firstItem = group[0].item;
    const groupTotal = group.reduce((sum, { item, product }) => sum + lineTotalFor(item, product), 0);

    /*
     * D44: `groupTotal` is already computed one line above with `lineTotalFor`
     * and was simply not being passed — so the PREVIEW told the buyer they owed
     * shipping on an order that qualified for the store's free-above threshold,
     * and then the order path (equally unpassed) charged it. Preview and charge
     * agreed, and both were wrong in the same direction.
     */
    const { shippingFee: groupShippingFee, shippingOffer: groupShippingOffer, storeState, storeProtections, acceptsPoints, sharedPurchaseRates: previewSharedRates } =
      await resolveShippingCost(firstItem.storeId, { goodsValue: groupTotal });

    /*
     * ── WHAT THE BUYER MAY CHOOSE, priced by the server ──────────────────
     *
     * Built from the seller's STORED offer plus a carrier quote this server
     * obtained, so the picker offers exactly what `resolveShippingSelection`
     * will accept at order time. See the field's note on
     * `CheckoutPricingPreviewStore` for why offering anything else means the
     * buyer meets a refusal after pressing pay.
     *
     * 🛑 `cartRequiresShipping` is a CAPABILITY read (`supportsShipping` off
     * the registry). A digital-code group offers nothing and is charged
     * nothing — no listing-type comparison anywhere in the decision.
     *
     * 🛑 The carrier call is skipped unless the seller accepts carrier quotes.
     * The preview runs on every control the buyer touches, so an unconditional
     * outbound call here would be a rate-limited third-party request per
     * keystroke. A self-shipping seller's options are pure arithmetic.
     */
    const groupRequiresShipping = cartRequiresShipping(
      group.map(({ product }) => ({ listingType: product?.listingType })),
    );
    const previewCarrierOptions =
      groupRequiresShipping && groupShippingOffer.platformQuotesAccepted
        ? await carrierOptionsForDestination(
            resolvedAddress?.postalCode,
            CHECKOUT_DEFAULT_PARCEL_WEIGHT_KG,
          )
        : [];
    const groupShippingOptions = groupRequiresShipping
      ? buildShippingOptions({
          offer: groupShippingOffer,
          goodsValue: groupTotal,
          carrierOptions: previewCarrierOptions,
        })
      : [];

    // Add-ons are per store, read off the cart document — the same entry
    // createOrderForGroup will read when the order is actually placed.
    const addons = cart.storeAddons?.[firstItem.storeId] ?? {};

    // Mirrors createOrderForGroup exactly — the COD handling fee is only
    // ever charged for literal "cod" (pay the courier), never upi_manual or
    // cash (both pre-paid via UPI/bank transfer before dispatch).
    const groupCodHandlingFee =
      paymentMethod === "cod" ? computeCodHandlingFee(groupTotal, commissions) : 0;

    /*
     * 🛑 The EMI surcharge is a TERM OF THE TOTAL, and it was missing here
     * while `createOrderForGroup` added it — a shown-vs-charged drift of
     * exactly the kind this function exists to prevent.
     *
     * Measured on the live settings (tokenPercent 10, surchargePercentPerMonth
     * 1) against the ₹20,000 listing: token ₹2,000, financed ₹18,000, so the
     * surcharge is ₹360 at the default 2-month tenure and ₹1,080 at 6. The
     * Order Summary showed ₹20,011.80 either way, and the order recorded up to
     * ₹1,080 more. Worse, the EMI panel beside it already displayed
     * instalments computed WITH the surcharge, so the page disagreed with
     * itself.
     *
     * `computeBuyerEmiQuote`, never `computeEmiSchedule`: the latter also
     * returns the platform/seller split of the surcharge, which is our
     * commercial arrangement with the seller and has no business reaching a
     * browser (see § "Buyer-facing fees").
     *
     * Eligibility is deliberately NOT enforced here. A preview that threw
     * would blank the Order Summary; `createOrderForGroup` still refuses an
     * ineligible EMI order, which is where refusing belongs. An ineligible
     * cart simply previews no surcharge, because the tenure never applies.
     */
    /* The EMI preview quote, surcharge and deferred balance went with EMI
       stage 5a (`groupEmiQuote` lived in the deleted `features/emi/group`). */
    const groupWhatsappFee = computeWhatsAppNotifyFee(addons.whatsappNotifyAddon ?? false, commissions);
    const groupGiftWrapFee = computeGiftWrapFee(addons.giftWrapAddon ?? false, commissions);
    /*
     * C5e — the same three tiers `createOrderForGroup` enforces, so the figure
     * SHOWN and the figure CHARGED cannot differ over an add-on the seller
     * declined.
     *
     * 🛑 `finalSale` is read off the LIVE product here, not a snapshot, and
     * that is correct rather than an oversight: at preview time no order exists
     * to have snapshotted it. The snapshot matters at the other two moments —
     * order creation (so the written row is authoritative) and claim time (so a
     * seller cannot flip the switch after the sale).
     *
     * 🛑 THROUGH `isFinalSale`, never `product?.finalSale === true`. The field
     * is optional and the platform default is TRUE, so the bare comparison
     * reads "not final sale" for every listing that has never set it — which
     * is 53 of 53 products in the live catalogue (measured 2026-11-08). That
     * made this preview offer SALE protection on lines that the order row
     * written seconds later marks `finalSale: true`, and which
     * `requestReturnAction`/`processRefundAction` then refuse: a fee quoted and
     * charged for cover whose claim is guaranteed to be declined.
     * `final-sale.ts` names this exact spelling as wrong in its header.
     */
    const groupHasFinalSale = group.some(({ product }) => isFinalSale(product));
    /*
     * ── S5a in the PREVIEW ───────────────────────────────────────────────────
     *
     * 🛑 Here because a coordinator commits against this figure. The plan is
     * explicit that the fees "must be shown before the coordinator commits" —
     * a handling fee plus N−1 shipping legs discovered afterwards is exactly
     * the surprise the arrangement makes expensive.
     *
     * The same function and the same `countDestinations` as both order paths,
     * so the shown figure and the charged one cannot diverge. D37 is the record
     * of what ONE money term reaching three of four paths costs: the buyer was
     * shown one number, charged another, and the order recorded the first.
     *
     * 🛑 A preview NEVER throws, so an unpriced arrangement contributes 0 here
     * rather than raising — `quoteSharedPurchase` reports it on `unpriced` and
     * the ORDER path is what refuses. A preview that threw would render the
     * whole cart as an error page for a seller's missing config.
     */
    const groupSharedPurchaseFee = quoteSharedPurchase({
      destinationCount: countDestinations(group.map(({ item }) => item)),
      rates: previewSharedRates,
    }).total;
    const {
      shippingProtectionFee: groupShipmentProtectionFee,
      saleProtectionFee: groupSaleProtectionFee,
    } = computeProtectionFees({
      subtotal: groupTotal,
      selected: {
        shipping: addons.shipmentProtectionAddon ?? false,
        sale: addons.saleProtectionAddon ?? false,
      },
      tiers: {
        platformShipping: commissions.shipmentProtectionFeeEnabled === true,
        platformSale: commissions.saleProtectionFeeEnabled === true,
        sellerShipping: storeProtections.shipping,
        sellerSale: storeProtections.sale,
        finalSale: groupHasFinalSale,
      },
      shippingFee: (s, sel) => computeShipmentProtectionFee(s, sel, commissions),
      saleFee: (s, sel) => computeSaleProtectionFee(s, sel, commissions),
    });

    /*
     * G1 — the discount is computed BEFORE the GST block below, the same hoist
     * `createOrderForGroup` now has. It sat AFTER it until 2026-10-21, so the
     * tax figure SHOWN to the buyer was backed out of the undiscounted gross.
     *
     * The preview and the charge must agree on the taxable BASE, not only on
     * the total (Root Cause #59) — so the ordering has to match in both, which
     * makes the position of this block load-bearing rather than incidental.
     */
    const groupLines = group.map(({ item, product }) => ({ itemId: item.itemId, lineTotal: lineTotalFor(item, product) }));
    const { couponDiscount: groupCouponDiscount } = computeGroupCouponDiscount(
      appliedCoupons,
      groupLines,
      groupTotal,
      cartSubtotal,
      firstItem.storeId,
    );

    let groupGstAmount = 0;
    if (siteSettings?.gst?.enabled && resolvedAddress?.state) {
      /*
       * `isIntraStateSupply`, matching `createOrderForGroup` exactly — this
       * was the same raw `===` and had to change with it, or the figure SHOWN
       * and the figure CHARGED would split on different state comparisons.
       * The total is unaffected by the answer (IGST total == CGST+SGST total),
       * but using one rule in both places is what keeps that true.
       */
      const intra = isIntraStateSupply(storeState, resolvedAddress.state);
      // Same helper createOrderForGroup uses — the two disagreeing is the
      // recurring defect here (Root Cause #59), and it is the buyer seeing one
      // tax figure and being charged another.
      groupGstAmount = sumGroupGst(
        group.map(({ item }) => item),
        resolvedProductById,
        intra ?? false,
        groupCouponDiscount,
        /*
         * G5 — the same five ancillary charges the order path taxes, in the
         * same order, so the figure SHOWN and the figure CHARGED cannot
         * diverge on the tax base (Root Cause #59). All five are already in
         * scope here, so unlike `createOrderForGroup` no block had to move.
         *
         * `groupEmiSurcharge` is deliberately absent — a financing charge with
         * its own treatment, outside the decided scope — and the platform fee
         * is absent because it already carries `platformFeeGst`.
         */
        roundRupees(
          groupShippingFee +
            groupCodHandlingFee +
            groupGiftWrapFee +
            groupShipmentProtectionFee +
            groupSaleProtectionFee,
        ),
      ).gstAmount;
    }

    stores.push({
      storeId: firstItem.storeId,
      storeName: firstItem.storeName || firstItem.storeId,
      subtotal: groupTotal,
      shippingFee: groupShippingFee,
      codHandlingFee: groupCodHandlingFee,
      whatsappNotifyFee: groupWhatsappFee,
      giftWrapFee: groupGiftWrapFee,
      shipmentProtectionFee: groupShipmentProtectionFee,
      saleProtectionFee: groupSaleProtectionFee,
      /*
       * INFORMATIONAL — the tax already INSIDE these prices, so checkout can
       * render "incl. GST ₹47.57". 🛑 Deliberately NOT added to `total` below:
       * it was, under the old add-on-top math, and removing it from all five
       * money sites together is what the tax-inclusive model consists of. A
       * preview that still added it would show a total ₹47.57 higher than the
       * order it previews — the shown-vs-charged drift this field exists to
       * prevent, reintroduced from the other direction.
       */
      gstAmount: groupGstAmount,
      couponDiscount: groupCouponDiscount,
      total:
        Math.max(0, groupTotal - groupCouponDiscount) +
        groupShippingFee +
        groupCodHandlingFee +
        groupWhatsappFee +
        groupGiftWrapFee +
        groupShipmentProtectionFee +
        groupSaleProtectionFee +
        // S5a — a term in the per-store total, so the seller card and the
        // order it previews agree.
        groupSharedPurchaseFee,
      supportsShippingProtection: storeProtections.shipping,
      supportsSaleProtection: storeProtections.sale,
      hasFinalSaleItem: groupHasFinalSale,
      acceptsPoints,
      sharedPurchaseFee: groupSharedPurchaseFee,
      /*
       * What the buyer may pick, priced server-side. Carried per STORE because
       * shipping is charged per store and the cart splits on `storeId` — a
       * cart-wide option list would offer one seller's custom rate for another
       * seller's parcel.
       */
      shippingOptions: groupShippingOptions,
      // Filled by the tender pass below — it needs each store's share of the
      // one capped commission, which is only allocatable once every group is
      // known.
      pointsApplied: 0,
    });
  }

  const sum = (pick: (s: CheckoutPricingPreviewStore) => number) =>
    stores.reduce((acc, s) => acc + pick(s), 0);

  const shippingFee = sum((s) => s.shippingFee);
  const codHandlingFee = sum((s) => s.codHandlingFee);
  const whatsappNotifyFeeTotal = sum((s) => s.whatsappNotifyFee);
  const giftWrapFeeTotal = sum((s) => s.giftWrapFee);
  const shipmentProtectionFeeTotal = sum((s) => s.shipmentProtectionFee);
  const saleProtectionFeeTotal = sum((s) => s.saleProtectionFee);
  // S5a — summed from the same per-store figures, so the aggregate cannot
  // disagree with the seller cards it is built from.
  const sharedPurchaseFeeTotal = sum((s) => s.sharedPurchaseFee);
  const gstAmount = sum((s) => s.gstAmount);
  const couponDiscount = sum((s) => s.couponDiscount);

  // One fee for the whole checkout, on every payment method — deliberately not
  // per store, so it is not added to the per-store rows above. The whole object
  // is kept (not just the two fields) because the points tender below
  // re-allocates it per store through `allocateCheckoutFees`, which takes a
  // `CheckoutFees` — and `totalFee` carries the `minimumTransactionFee` floor,
  // which is exactly the field D41 found had no consumer anywhere.
  // Destructuring it away here would be how it loses its second one.
  //
  // 🛑 `cartLineUnits` is built from the SAME `orderGroups` the per-store
  // rows above were built from, so the fee the buyer is SHOWN and the fee the
  // order path CHARGES are derived from one line set rather than two that
  // happen to agree — and under a per-line taper the SHAPE of that set changes
  // the answer, not just its sum.
  const previewLineUnitsOf = (g: { item: CartItemDocument }[]) =>
    g.map(({ item }) => item.quantity ?? 0);
  const previewLineUnitsByStore = new Map(
    orderGroups.map(({ items: g }) => [g[0].item.storeId, previewLineUnitsOf(g)] as const),
  );
  const cartLineUnits = orderGroups.flatMap(({ items: g }) => previewLineUnitsOf(g));
  const checkoutFees = computeCheckoutFees(cartSubtotal, commissions, cartLineUnits);
  const { platformFee, gstOnFee } = checkoutFees;

  /*
   * 🛑 `gstAmount` is NOT a term, and leaving it in was a shown-vs-charged
   * drift waiting on a settings flag.
   *
   * The per-store `total` above already excludes it, and its own field comment
   * says so in capitals ("Deliberately NOT added to `total` below"). The
   * CART-level total here added it anyway, so the two disagreed with each
   * other and the cart-level one disagreed with `createOrderForGroup`, whose
   * `orderTotal` excludes product GST for the reason set out there: prices are
   * tax-INCLUSIVE, so the tax is already inside `cartSubtotal` and adding it
   * charges it twice.
   *
   * It has never fired, which is the only reason it survived: `gstAmount` is
   * computed solely when `siteSettings.gst.enabled` is true, and that is
   * deliberately false until a real GSTIN is registered (see the seed's note —
   * `/api/admin/site` refuses to enable it without a valid check digit). So on
   * the day someone enters a registration, every cart would have quietly
   * quoted ~5% more than the order it previews. Measured on the live ₹20,000
   * listing (gstRate 5, HSN 95030020): the preview would have read ₹952.38
   * over the amount charged.
   *
   * `gstOnFee` IS a term, and the asymmetry is the same one `createOrderForGroup`
   * documents: that is GST on OUR commission, billed on top of the fee, not
   * tax on the goods.
   */
  const total =
    Math.max(0, cartSubtotal - couponDiscount) +
    shippingFee +
    codHandlingFee +
    whatsappNotifyFeeTotal +
    giftWrapFeeTotal +
    shipmentProtectionFeeTotal +
    saleProtectionFeeTotal +
    // S5a — a real additive charge, so it belongs in the column with the other
    // fees rather than below the total like the tax-inclusive `gstAmount`.
    sharedPurchaseFeeTotal +
    platformFee +
    gstOnFee;

  /*
   * ── THE POINTS TENDER, PREVIEWED (D46/D47) ────────────────────────────────
   *
   * 🛑 Applied PER STORE against the SAME base the order path uses, which is
   * why this runs here and not inside the loop above: the base includes each
   * store's share of the one capped commission, and that share is only
   * allocatable once every group is known.
   *
   * 🛑 Per store is not a detail — it is the only shape that can agree with
   * what gets charged. A cart-level application gives the same answer as the
   * per-group one whenever every store accepts (the sum of per-group 50% caps
   * equals 50% of the sum), and a DIFFERENT answer the moment one store does
   * not: with ₹500 at an accepting store, ₹500 at a declining one and a 600
   * balance, per-store applies ₹250 and cart-level would promise ₹500. The
   * buyer would be shown a discount half of which could never be honoured.
   *
   * The iteration order matches `orderGroups`, and so does the order-creation
   * loop, so the budget is drawn down in the same sequence in both — which is
   * what makes the two sums identical rather than merely close.
   */
  const previewUseAllPoints = cart.useAllPoints === true;
  const previewBalance = previewUseAllPoints ? await safePointsBalance(uid) : 0;
  if (previewUseAllPoints && previewBalance > 0) {
    const feeByStore = allocateCheckoutFees(
      stores.map((s) => [s.storeId, s.subtotal] as const),
      checkoutFees,
      previewLineUnitsByStore,
      commissions,
    );
    const { perGroup } = allocatePointsAcrossGroups(
      stores.map((s) => {
        const share = feeByStore.get(s.storeId);
        return {
          // The SAME base `createOrderForGroup` applies the tender to: the
          // store's charged total plus its share of the one capped commission.
          // `store.total` deliberately excludes that share (it is a checkout
          // charge, not a per-store one), so it is added back here rather than
          // by widening a published field.
          total: roundRupees(s.total + (share?.platformFee ?? 0) + (share?.gstOnFee ?? 0)),
          accepted: s.acceptsPoints,
        };
      }),
      previewBalance,
      true,
    );
    perGroup.forEach((applied, i) => {
      stores[i].pointsApplied = applied;
    });
  }
  const pointsApplied = sum((s) => s.pointsApplied);

  return {
    subtotal: cartSubtotal,
    shippingFee,
    codHandlingFee,
    whatsappNotifyFee: whatsappNotifyFeeTotal,
    giftWrapFee: giftWrapFeeTotal,
    shipmentProtectionFee: shipmentProtectionFeeTotal,
    saleProtectionFee: saleProtectionFeeTotal,
    sharedPurchaseFee: sharedPurchaseFeeTotal,
    gstAmount,
    couponDiscount,
    platformFee,
    gstOnFee,
    platformFeeUnitCount: checkoutFees.unitCount,
    platformFeeLines: checkoutFees.lines,
    total,
    pointsApplied,
    // Equal to `total` when no points apply, so every existing reader of
    // either figure keeps getting the right number.
    /*
     * 🛑 Both tenders, through the SAME helper the two order writers use —
     * so the figure the buyer is shown and the figure they are charged are
     * one expression, not two that agree today.
     */
    amountDue: amountDueNow({ orderTotal: total, pointsApplied }),
    pointsBalance: previewBalance,
    stores,
  };
}

/**
 * Mark an order as paid after a payment provider verifies the transaction.
 * Consumers call this from /api/payment/verify or a payment webhook.
 */
export async function attachPaymentAction(input: {
  orderId: string;
  paymentId: string;
  paidAmount: number;
}): Promise<void> {
  const { orderId, paymentId, paidAmount } = input;
  await unitOfWork.orders.update(orderId, {
    paymentStatus: PaymentStatusValues.PAID as never,
    paymentId,
    paidAmount,
    status: OrderStatusValues.PROCESSING as never,
    updatedAt: new Date(),
  } as never);
}

// ---------------------------------------------------------------------------
// Gateway-confirmed checkout: order-status confirm + amount re-check +
// atomic stock decrement + cart clear + multi-order create + notifications.
//
// Serves BOTH online gateways. The authoritative check is identical for each
// and deliberately server-side: re-fetch the order from the gateway and
// require `status === "paid"`. PhonePe hands the browser nothing verifiable,
// so for it that fetch is the only possible proof; Razorpay DOES return a
// signed client callback, which is verified as well when supplied
// (`razorpaySignature`) — but it is the cheap guard, never the authority. A
// signature is computable from an order id and a payment id, so trusting it
// alone would accept a client-reported outcome; fetching alone would accept a
// replayed order id from another session. Both, or the weaker story wins.
//
// Both the buyer-present `/api/payment/verify` call AND the async webhook
// (buyer may have closed the tab) call this SAME action, keyed only by the
// gateway order id. A small Firestore claim doc
// (`gatewayOrderClaims/{gatewayOrderId}`, created via `.create()`, which
// throws on conflict) makes whichever caller arrives first the sole placer of
// orders for that payment.
//
// 🛑 The claim collection was `phonepeOrderClaims` until Razorpay was
// restored. Renaming it was safe precisely because it is Admin-SDK-only
// (absent from firestore.rules, so default-deny) and PhonePe has never been
// enabled in any environment — flag false, credentials all placeholders — so
// no claim doc has ever been written. Do not rename it again without
// establishing the same two facts.
// ---------------------------------------------------------------------------

export interface VerifyAndPlaceGatewayOrderInput {
  /**
   * The gateway order id every lookup for this payment is keyed on, and what
   * gets stored as `order.paymentId`: PhonePe's own `merchantOrderId`
   * (generated in `PhonePeProvider.createOrder()`), or Razorpay's `order_…`.
   */
  merchantOrderId: string;
  /**
   * Razorpay's client callback, when the buyer-present path has it. Omit on
   * the webhook path and for PhonePe, which has no such callback.
   *
   * Verified IN ADDITION to the server-side order fetch, never instead of it
   * — see the block comment above. A present-but-invalid signature is a hard
   * failure: it means the browser's callback was forged or tampered with,
   * even if the order did turn out to be paid.
   */
  razorpaySignature?: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  };
  /**
   * Buyer identity. Omit on the webhook path — no session exists there, so
   * it's resolved from `uid` packed into PhonePe's `metaInfo` at
   * create-order time and re-fetched from `userRepository`.
   */
  userId?: string;
  userName?: string;
  userEmail?: string;
  /** Present on the buyer-present path; falls back to metaInfo (webhook path) when omitted. Required for physical carts. */
  addressId?: string;
  notes?: string;
  /**
   * Buyer's choice for what to do when a cart item is unavailable at
   * checkout time. Defaults to "cancel_order" when neither the caller nor
   * metaInfo supplies one — matches this path's historical (only) behavior.
   */
  outOfStockPolicy?: OutOfStockPolicy;
  // Same as CreateCheckoutOrderInput: add-ons come from `CartDocument.storeAddons`,
  // not the request. Neither side takes a client-supplied add-on value.
}

/**
 * Place order(s) from the user's cart after a PhonePe payment is confirmed.
 * Called from both /api/payment/verify (buyer present) and the webhook
 * (buyer may be gone) — see the module-level comment above.
 *
 * Performs:
 *   1. Order Status confirmation via `getProviders().payment.getOrder()` —
 *      the sole source of truth; PhonePe never hands the browser a
 *      verifiable proof of payment.
 *   2. An idempotency claim so only one of the two callers proceeds.
 *   3. Cart re-validation against current product prices/stock.
 *   4. Amount cross-check against the confirmed PhonePe order.
 *   5. Atomic stock decrement + cart clear via unitOfWork batch.
 *   6. Multi-coupon pro-rating per order group.
 *   7. order_placed notifications (buyer + seller).
 *   8. Confirmation email + RTDB success signal (both fire-and-forget).
 */
/**
 * Auto-refund the value of items dropped from a PhonePe checkout under the
 * "skip_items" out-of-stock policy. PhonePe captures payment for the FULL
 * cart before the stock check runs, so anything not placed as an order must
 * be given back. Extracted from `verifyAndPlaceGatewayOrderAction` — same
 * behavior, kept as a named step so the parent function stays readable.
 *
 * Awaited by the caller (this moves money, never fire-and-forget). On
 * failure the orders themselves are NOT rolled back (already validly
 * created and paid); the failure is surfaced via `order.refundPending` + an
 * admin notification fan-out, never silently dropped (Rule #8).
 */
async function refundDroppedItemsForPhonePeCheckout(input: {
  unavailablePaid: StockBucketResult["unavailable"];
  orderIds: string[];
  productByIdPaid: Map<string, ProductDocument>;
  /** PhonePe refunds are order-keyed — the original merchantOrderId, not a payment id. */
  phonepeOrderId: string;
}): Promise<void> {
  const { unavailablePaid, orderIds, productByIdPaid, phonepeOrderId } = input;
  if (unavailablePaid.length === 0 || orderIds.length === 0) return;

  const droppedValue = unavailablePaid.reduce(
    (sum, u) => sum + (productByIdPaid.get(u.productId)?.price ?? 0) * u.requestedQty,
    0,
  );
  if (droppedValue <= 0) return;

  const primaryOrderId = orderIds[0];
  try {
    const primaryOrder = await unitOfWork.orders.findById(primaryOrderId);
    // Cap defensively at the primary order's total — processRefundAction
    // rejects any amount exceeding order.totalPrice, and a multi-order
    // batch's dropped-items value isn't cleanly attributable to a single
    // order (PhonePe refunds are keyed by the original order id, not a
    // payment id; the FIRST order created in this batch is used as the
    // refund's book-keeping anchor).
    const refundAmount = primaryOrder
      ? Math.min(droppedValue, primaryOrder.totalPrice)
      : droppedValue;
    const refundResult = await processRefundAction({
      orderId: primaryOrderId,
      amount: refundAmount,
      /*
       * A SYSTEM refund, not a buyer claim: items the buyer paid for turned
       * out to be unavailable, so the seller could not deliver what was
       * described. `not_received` is the honest code and — not incidentally —
       * one final sale may never block, which is correct here: the buyer is
       * owed this money whatever the listing's return terms said.
       */
      reasonCode: "not_received",
      reasonNote: `Automatic refund — ${unavailablePaid.length} item(s) unavailable at checkout: ${unavailablePaid.map((u) => u.productTitle).join(", ")}`,
      /*
       * A NATURAL key, not a uuid — and this is a money fix in its own right,
       * not just satisfying a new required field.
       *
       * This path runs inside the gateway-settlement flow, which is itself
       * retried: by the browser's `/verify`, by the webhook, and now (Phase 0)
       * by the gateway's own 5xx retry. Every one of those retries used to
       * mint a fresh `randomUUID()` and issue ANOTHER real refund for the same
       * dropped items. Keying on the gateway order id makes the whole
       * auto-refund idempotent across every retry of the checkout.
       */
      idempotencyKey: `oos_${phonepeOrderId}`,
      method: "phonepe",
      phonepeOrderId,
      confirmIrrevocable: true,
      refundedBy: "system:checkout-auto-refund",
    });
    if (!refundResult.ok) {
      throw new Error(refundResult.error ?? "Automatic refund failed");
    }
  } catch (refundErr) {
    void normalizeError(refundErr);
    serverLogger.warn(
      "verifyAndPlaceGatewayOrderAction: automatic partial refund for dropped items failed — flagging for manual follow-up",
      {
        orderId: primaryOrderId,
        droppedValue,
        err: refundErr instanceof Error ? refundErr.message : String(refundErr),
      },
    );
    await unitOfWork.orders
      .update(primaryOrderId, { refundPending: true } as never)
      .catch((updErr: unknown) => {
        void normalizeError(updErr);
        serverLogger.error(
          "verifyAndPlaceGatewayOrderAction: failed to flag refundPending after auto-refund failure",
          { orderId: primaryOrderId, err: updErr instanceof Error ? updErr.message : String(updErr) },
        );
      });
    /*
     * One admin-inbox row, not one notification per admin.
     *
     * 🛑 The comment that used to sit here said this "mirrors
     * onScamReportCreate's employee notification pattern" — and it did, which
     * is exactly the problem: that pattern was a 100-way concurrent fan-out of
     * an email-eligible type, and it has been removed. A failed auto-refund is
     * ONE event needing ONE person to act, not N personal messages.
     *
     * It also no longer queries the admin list at all, so the failure mode
     * where "we couldn't look up the admins" silently swallowed the alert is
     * gone with it.
     */
    await adminNotificationsRepository
      .create({
        category: "payouts",
        title: "Automatic refund failed",
        body: `Automatic refund failed for order ${primaryOrderId} (${unavailablePaid.length} unavailable item(s)) — manual refund required.`,
        severity: "error",
        isRead: false,
        entityType: "order",
        entityId: primaryOrderId,
        audienceUserIds: [],
      })
      .catch((notifyErr: unknown) => {
        void normalizeError(notifyErr);
        serverLogger.error(
          "verifyAndPlaceGatewayOrderAction: failed to write admin notification for failed auto-refund",
          { orderId: primaryOrderId },
        );
      });
  }
}

/**
 * Places one order for one seller-group within `verifyAndPlaceGatewayOrderAction`
 * — mirrors `createOrderForGroup`'s role on the COD/cash/EMI path (same
 * per-group fee/coupon/order-doc/notification shape), extracted into its own
 * function purely to keep the parent function under the LARGE_COMPONENT
 * audit threshold (`scripts/audit-code-quality.mjs`). No behavior change
 * from the inline version this replaced.
 */
async function createPhonePeGroupOrder(
  group: Array<{ item: CartItemDocument; product: ProductDocument | null }>,
  orderType: OrderType,
  ctx: {
    appliedCoupons: CartAppliedCoupon[];
    cartSubtotal: number;
    /** Per-store add-on selections off the cart doc — see OrderGroupContext. */
    storeAddons?: Record<string, CartStoreAddons>;
    /** Pro-rata share of the checkout's single capped commission, by storeId. */
    platformFeeByStore: Map<string, { platformFee: number; gstOnFee: number }>;
    siteSettings: Awaited<ReturnType<typeof siteSettingsRepository.getSingleton>> | null;
    uid: string;
    userName: string;
    userEmail: string;
    /** Our own generated order id — stored as `order.paymentId`, the durable reference for refunds/lookups. */
    merchantOrderId: string;
    /**
     * The active gateway's own order id (distinct from `merchantOrderId`) —
     * named `phonepeOrderId` until this function's own `method`/`gatewayRef`
     * routing was found to silently mislabel every Cashfree order as
     * "phonepe"; the value itself was always gateway-agnostic
     * (`gatewayOrder.gatewayOrderId` at the call site), only the name lied.
     */
    gatewayOrderId?: string;
    /** The active gateway's transaction id for the completed payment attempt, if available. */
    transactionId?: string;
  /** LEGACY free text. Still written so old readers keep working; never read for booking. */
  shippingAddress?: string;
  /**
   * The structured, immutable copy of what the buyer chose (Part 14).
   * Absent for a digital-only cart, which has nowhere to ship to.
   */
  deliverySnapshot?: DeliverySnapshot;
    notes?: string;
    outOfStockPolicy: OutOfStockPolicy;
    unavailablePaid: StockBucketResult["unavailable"];
    orderIds: string[];
    emailsToSend: Parameters<typeof sendOrderConfirmationEmail>[0][];
    couponUsageAccumulator: Map<string, CouponAccumEntry>;
    /** Every product touched, members included — see OrderGroupContext.productById. */
    productById: Map<string, ProductDocument>;
    /**
     * The buyer's delivery state, for the CGST/SGST vs IGST split.
     *
     * Threaded in 2026-10-10 to close C0c defect 1 — this path previously had
     * no access to it, which is why product GST was omitted here entirely.
     */
    buyerState?: string;
    /**
     * D46/D47 — the points tender, threaded exactly as `storeAddons` is: a
     * per-cart selection this path cannot re-derive. See `OrderGroupContext`
     * for why the budget is one shared remainder rather than a per-group
     * balance read.
     */
    useAllPoints: boolean;
    pointsBudget: { remaining: number };
    /* `emiOptIn` / `emiTenureMonths` removed with EMI stage 5a. */
    /**
     * What the gateway was INSTRUCTED to settle to each vendor out of this one
     * capture, keyed by `storeId`. Absent/empty on an ordinary capture.
     *
     * 🛑 READ, not recomputed — `payoutRepository.findBySettlementReference`,
     * resolved once by the caller for the whole capture. The instruction was
     * built in an EARLIER request (`/api/payment/create-order`), which is the
     * only place that held the vendor records and the exact amounts; the cart
     * can gain a line between that request and this one, which is why this
     * function already has a settlement-compliance detector upstream. A read of
     * what we wrote is a fact, a recomputation is a guess that agrees most of
     * the time, and the difference decides whether a seller gets paid twice.
     */
    splitByStore?: ReadonlyMap<string, SplitSettlementRecord>;
    /**
     * Item 1.39 — the consent taken at create-order time, before the capture.
     *
     * 🛑 REQUIRED, same as on `OrderGroupContext`: `loadBuyerPolicyConsent`
     * either returns a record or throws, so an order with no consent is not
     * representable on this path either.
     */
    policyConsent: OrderPolicyConsent;
  },
): Promise<number> {
  const {
    appliedCoupons,
    cartSubtotal,
    storeAddons,
    platformFeeByStore,
    policyConsent,
    siteSettings,
    uid,
    userName,
    userEmail,
    merchantOrderId,
    gatewayOrderId,
    transactionId,
    shippingAddress,
    notes,
    outOfStockPolicy,
    unavailablePaid,
    orderIds,
    emailsToSend,
    couponUsageAccumulator,
    productById: phonepeProductById,
    buyerState,
    useAllPoints,
    pointsBudget,
    deliverySnapshot,
    splitByStore,
  } = ctx;

  /*
   * Which online gateway actually took the money, read off the registered
   * provider rather than passed in — exactly one is registered per process
   * (`providers.config.ts`), so there is no caller-supplied value that could
   * disagree with reality. Recorded on the order so a refund months later
   * knows which API the stored `paymentId` belongs to.
   */
  const gatewayName = getProviders().payment?.name ?? "phonepe";

  const firstItem = group[0].item;
  /*
   * What this seller was instructed to be settled out of this capture, if
   * anything. Resolved once here rather than three times in the order literal
   * below — a repeated `Map.get(...)!` is three chances for one of them to read
   * a different key.
   */
  const splitForThisStore = splitByStore?.get(firstItem.storeId);
  const groupTotal = group.reduce(
    (sum, { item, product }) => sum + lineTotalFor(item, product),
    0,
  );

  // Reuses the same store/seller lookup as the COD/UPI path above instead
  // of re-implementing it inline — was two sequential findById calls per
  // seller group here, duplicated from resolveShippingCost.
  // D44: `groupTotal` is computed just above — pass it so a free-above
  // threshold can fire and an unpriceable store is recorded.
  const { shippingFee, shippingOffer, storeOwnerId, storeState, storeTaxIdentity, storeProtections, acceptsPoints, sharedPurchaseRates } = await resolveShippingCost(firstItem.storeId, { goodsValue: groupTotal });


  /*
   * ── PART C ON THE ONLINE PATH, as far as it can honestly go ──────────────
   *
   * ⚠ GAP, STATED RATHER THAN PAPERED OVER: this path does NOT yet honour
   * the buyer's per-store shipping option. It prices shipping from the seller's
   * stored policy, and so does the capture route
   * (`POST /api/payment/create-order`) and the post-capture guard — all three
   * agree, so there is no client-trust hole here and never was; what is missing
   * is the buyer CHOICE half of the owner's spec. Wiring it means changing the
   * capture, the guard and this writer in one commit, because a guard expecting
   * a differently-priced shipping term throws on an order already paid for.
   *
   * What CAN be recorded honestly is the obligation a seller's offer implies
   * when it leaves no choice: a seller who offers only their own shipping is
   * self-fulfilling whatever the buyer did or did not pick.
   * `impliedObligation` answers `null` the moment there is a real choice, so
   * nothing here invents a contract. Without it every online order would carry
   * no obligation at all, and `mayBookPlatformLabel` fails OPEN on absence —
   * i.e. the one gate part C depends on would be inert for the entire online
   * path.
   */
  const gatewayGroupRequiresShipping = cartRequiresShipping(
    group.map(({ product }) => ({ listingType: product?.listingType })),
  );
  const gatewayShippingObligation =
    impliedObligation(shippingOffer, shippingFee, gatewayGroupRequiresShipping) ?? undefined;

  /*
   * The instalment schedule for THIS seller group, through the same helper the
   * COD/manual writer uses — not a copy of its block. Two hand-written
   * copies is the create-vs-create axis of Root Cause #39, and these two
   * functions have already drifted once over add-on fees (#65).
   *
   * 🛑 Gate FAILURES are silent here, unlike the manual path, and that is
   * deliberate rather than sloppy: the money is already captured by the time
   * this runs, so throwing would produce a charged-with-no-order (the D64
   * class). `/api/payment/create-order` applies the same gate BEFORE capture,
   * which is where a refusal belongs; if it declined EMI, it captured the full
   * total and no schedule is wanted here either.
   */
  /* The gateway path's EMI schedule went with EMI stage 5a — `groupEmiSchedule`
     lived in the deleted `features/emi/group`. */

  /*
   * Same supplier-of-record rule as `createOrderForGroup`, through the same
   * function. This path (PhonePe verify / webhook) is the SECOND place an
   * order is created, and the two have drifted before — add-on fees, and the
   * whole tax breakdown, were both missing here until C0c defect 1.
   */
  const supplier = resolveSupplierIdentity(
    storeTaxIdentity,
    siteSettings ? { gst: siteSettings.gst } : undefined,
  );

  const groupLines = group.map(({ item, product }) => ({ itemId: item.itemId, lineTotal: lineTotalFor(item, product) }));
  const { couponDiscount, appliedDiscounts } = computeGroupCouponDiscount(
    appliedCoupons,
    groupLines,
    groupTotal,
    cartSubtotal,
    firstItem.storeId,
  );

  // Mirrors createOrderForGroup — without this the online-payment path wrote
  // the discount onto the order but never incremented usage.currentUsage or
  // the per-user counter, so limits were unenforceable for PhonePe orders.
  const groupCouponCodes = new Set<string>();
  for (const discount of appliedDiscounts) {
    if (discount.couponId) {
      accumulateCouponUsage(couponUsageAccumulator, discount.code, discount.couponId, discount.discountAmount);
      groupCouponCodes.add(discount.code);
    }
  }

  // Was a per-group, uncapped `groupTotal × platformFeePercent` computed inline
  // here — the only path that charged the commission at all, and it charged a
  // different (larger, multiplied-per-store) number than the cap now allows.
  // Both the amount and its allocation are now decided once for the checkout.
  // Kept as two separate values, exactly as the COD/manual path does. Folding the
  // GST into `platformFee` made `OrderDocument.platformFee` mean "fee" on one path
  // and "fee + GST" on the other, so no revenue rollup could read it without
  // knowing which path created the row. The buyer pays the same either way —
  // both components are still added to orderTotal below.
  const { platformFee = 0, gstOnFee: platformFeeGst = 0 } =
    platformFeeByStore.get(firstItem.storeId) ?? {};

  // Add-ons are this store's choice, read off the cart doc — previously one
  // cart-wide fee was passed in and billed against every group.
  const commissionRates = siteSettings?.commissions ?? CHECKOUT_DEFAULT_COMMISSIONS;
  const addons = storeAddons?.[firstItem.storeId] ?? {};
  const whatsappNotifyFee = computeWhatsAppNotifyFee(addons.whatsappNotifyAddon ?? false, commissionRates);
  const giftWrapFee = computeGiftWrapFee(addons.giftWrapAddon ?? false, commissionRates);
  const giftWrapMessage = addons.giftWrapMessage;
  /*
   * 🛑 `computeProtectionFees`, not a bare `computeShipmentProtectionFee`.
   *
   * This path hand-rolled the shipment fee and computed NO sale-protection fee
   * at all, which was wrong twice over:
   *
   *  1. **Sale protection was never charged here.** Razorpay's create-order
   *     route DOES charge it (it calls `computeProtectionFees`), so the amount
   *     captured and the amount this function records on the order disagreed
   *     by the fee — and the platform absorbs the unconditional refund that
   *     fee exists to pay for. See `computeSaleProtectionFee`.
   *  2. **The C5e tiers were skipped.** The bare helper tests only "did the
   *     buyer tick it" and the site-wide master switch, so shipment protection
   *     could be billed on a seller who never agreed to back it, or on a
   *     final-sale item where it cannot apply.
   *
   * Latent rather than live when written — `payment.phonepeEnabled` is false
   * and the one live store has `supportsSaleProtection` unset — but both of
   * those are a settings toggle away, and an under-charge that appears the
   * moment a flag flips is worse than one that is visible now.
   *
   * 🛑 `isFinalSale(product)`, not `product?.finalSale === true` — see the
   * matching note in the preview above. `finalSale` is optional with a default
   * of TRUE, so the bare comparison opted every one of the 53 catalogue
   * listings OUT of final sale and let sale protection be billed on a line the
   * written order row marks `finalSale: true`. This is the CHARGED path, so
   * here it was money taken for a claim the refund gate will decline.
   */
  const groupHasFinalSale = group.some(({ product }) => isFinalSale(product));
  const { shippingProtectionFee: shipmentProtectionFee, saleProtectionFee } = computeProtectionFees({
    subtotal: groupTotal,
    selected: {
      shipping: addons.shipmentProtectionAddon ?? false,
      sale: addons.saleProtectionAddon ?? false,
    },
    tiers: {
      platformShipping: commissionRates.shipmentProtectionFeeEnabled === true,
      platformSale: commissionRates.saleProtectionFeeEnabled === true,
      sellerShipping: storeProtections.shipping,
      sellerSale: storeProtections.sale,
      finalSale: groupHasFinalSale,
    },
    shippingFee: (s, sel) => computeShipmentProtectionFee(s, sel, commissionRates),
    saleFee: (s, sel) => computeSaleProtectionFee(s, sel, commissionRates),
  });
  /*
   * P-8 GST — now wired through this path. C0c defect 1.
   *
   * The comment that used to sit here deferred it, correctly identifying the
   * blocker: `expectedPaymentAmountRs` compares against what PhonePe already
   * captured, so adding product GST here WITHOUT adding it to the upstream
   * pre-payment amount would either fail the mismatch check or silently
   * under-charge. Both halves move in this change, plus the create-order route
   * that decides the captured amount.
   *
   * 🛑 What unblocked it: the GST TOTAL does not depend on the place of
   * supply. IGST total equals CGST+SGST total, so `/api/payment/create-order`
   * can compute the amount before the delivery address is even known — which
   * is the thing it genuinely cannot see. Measured across ~285k rate/base
   * combinations, the two differ by at most ₹0.01 (from `round(half × 2)` in
   * the intra branch), and the guard's tolerance is ₹1.
   *
   * Only the SPLIT needs the address, and this function has it.
   */
  let phonepeGst: GroupGstSummary | undefined;
  if (siteSettings?.gst?.enabled && buyerState) {
    const intra = isIntraStateSupply(storeState, buyerState);
    if (intra === null) {
      serverLogger.warn(
        "[gst] place of supply undetermined on the online path — defaulting to inter-state (IGST)",
        { storeId: firstItem.storeId, hasStoreState: !!storeState },
      );
    }
    // G1 — post-discount taxable base. `couponDiscount` is already computed
    // ~100 lines above in this function, so unlike the other two call sites no
    // hoist was needed here; only the argument was missing.
    const summary = sumGroupGst(
      group.map(({ item }) => item),
      phonepeProductById,
      intra ?? false,
      couponDiscount,
      /*
       * G5 — the ancillary charges. 🛑 FOUR, not five: this is the ONLINE
       * payment path, so there is no `codHandlingFee` in scope and none is
       * charged — COD is a different payment method handled by
       * `createOrderForGroup`. The absence is correct, not an omission, and
       * worth saying so because the other two call sites pass five and a
       * reader comparing them would otherwise look for the missing term.
       */
      roundRupees(
        shippingFee + giftWrapFee + shipmentProtectionFee + saleProtectionFee,
      ),
    );
    if (summary.taxableAmount > 0 || summary.exemptAmount > 0) phonepeGst = summary;
  }

  /* Product GST is not a term — prices are tax-inclusive, so it is already
   * inside `groupTotal`. Matches the COD/UPI path exactly; `platformFeeGst`
   * stays because that is GST on our fee, charged on top. */
  /*
   * ── S5a: the shared-purchase arrangement, matching the COD/manual path ────
   *
   * Same function, same inputs, same position — before `orderTotal`, because
   * it is a term in it. See the fuller 🛑 at the COD/manual site for why the
   * rates are snapshotted and why an unpriced arrangement is refused rather
   * than quoted at ₹0.
   *
   * 🛑 On THIS path the money is already captured by the time this runs, so a
   * refusal here means a charged-with-no-order — the D64 class. That is why
   * `/api/payment/create-order` must apply the same term: the pre-payment
   * amount and this total have to agree, which is the parity C0c defect 1 was
   * about and the reason every addition here has to be made in three places.
   */
  const phonepeSharedQuote = quoteSharedPurchase({
    destinationCount: countDestinations(group.map(({ item }) => item)),
    rates: sharedPurchaseRates,
  });

  // D42: rounded once on the sum — see the COD/UPI path's 🛑 for why a raw
  // float sum of seven 2dp terms reached Firestore as 1011.8000000000001.
  const orderTotal = roundRupees(
    Math.max(0, groupTotal - couponDiscount) + shippingFee + whatsappNotifyFee + giftWrapFee + shipmentProtectionFee + saleProtectionFee + platformFee + platformFeeGst + phonepeSharedQuote.total,
  );

  /*
   * ── POINTS TENDER (D46/D47) — the same STAGE as the COD/manual path ───────
   *
   * Same four inputs, same function, same point in the sequence: immediately
   * after `orderTotal`'s single `roundRupees` and before anything is written.
   * Computing it here rather than in a shared builder is unavoidable — the two
   * paths derive `orderTotal` separately — but the ARITHMETIC is
   * `resolvePointsTender` in both, so they cannot disagree about the amount
   * the way the add-on fees once did (Root Cause #65).
   *
   * 🛑 This is the path whose capture matters most: `amountDue` is what the
   * Razorpay order is created for, so a divergence here is money taken that
   * the order does not record.
   */
  const pointsOptedIn = useAllPoints === true;
  const pointsAccepted = pointsOptedIn && acceptsPoints;
  const { pointsApplied } = resolvePointsTender({
    orderTotal,
    balance: pointsAccepted ? pointsBudget.remaining : 0,
    accepted: pointsAccepted,
    optedIn: pointsOptedIn,
  });
  if (pointsApplied > 0) pointsBudget.remaining -= pointsApplied;

  /*
   * 🛑 `resolvePointsTender`'s own `amountDue` is DISCARDED here — it knows
   * only about points, and on an instalment order the deferred balance reduces
   * the collection too. `amountDueNow` composes both, and is the same
   * expression the manual writer and the pricing preview use, so the figure
   * recorded in `paymentRecord.amount` below cannot drift from the figure
   * `/api/payment/create-order` actually captured.
   */
  const amountDue = amountDueNow({ orderTotal, pointsApplied });

  // S-SBUNI-RULES 2026-05-13 — order-item decoration via rule registry.
  // Same expansion as the COD/UPI path. This was a THIRD hand-rolled copy of
  // the price rule (`isBundle ? item.price : product.price`) that — like the
  // two in the consumer's checkout route — silently omitted `lockedPrice`, so
  // an accepted offer paid through PhonePe was RECORDED at the seller's list
  // price. `lineTotalFor` inside the expansion is the single definition.
  const basePhonepeItems = group.flatMap(({ item, product }) => {
    const lt = (product?.listingType ?? "standard") as ListingType;
    const itemRule = getListingRule(lt);
    return expandCartLineToOrderRows(item, product!, phonepeProductById).map((baseLine) =>
      itemRule.decorateOrderItem(baseLine, product!),
    );
  });
  /*
   * Part 14 — the parts freeze, on THIS path too. The comment four lines
   * above records the cost of the last thing added to one path and not the
   * other: an accepted offer paid through PhonePe was recorded at the
   * seller's list price.
   */
    // Part 14 removed — see the note at the other call site.
  /*
   * 🛑 The SAME stamper as the other creation path. The comment a few lines
   * above records what it cost last time something was added to one path and
   * not the other.
   */
  const orderItems = assignOrderLineIds(basePhonepeItems);
  const totalQuantity = group.reduce((sum, { item }) => sum + item.quantity, 0);

  const imageUrls = [
    ...new Set(
      group
        .map(({ product }) => product?.mainImage)
        .filter((url): url is string => typeof url === "string" && url.length > 0),
    ),
  ];

  // S-SBUNI-RULES 2026-05-13 — order-doc decoration via rule registry.
  const lt0Pp = (group[0].product?.listingType ?? "standard") as ListingType;
  const groupRulePp = getListingRule(lt0Pp);
  const extraOrderFields = {
    ...groupRulePp.decorateOrderDoc(group[0].item, group[0].product!),
  };

  // Both creation paths call the SAME builder — two hand-written copies is the
  // create-vs-create axis of Root Cause #39, and these two functions have
  // already drifted once before (add-on fees, Root Cause #65).
  const sourceContext = await buildOrderSourceContext(firstItem, group[0].product!, orderType);

  const order = await unitOfWork.orders.createOrder({
    productId: firstItem.productId,
    productTitle: firstItem.productTitle,
    userId: uid,
    userName,
    userEmail,
    quantity: totalQuantity,
    unitPrice: group[0].product!.price,
    totalPrice: orderTotal,
    // D46/D47 — see the identical pair in `createOrderForGroup`. `totalPrice`
    // stays the full value of the supply; points reduce what is COLLECTED.
    pointsApplied: pointsApplied > 0 ? pointsApplied : undefined,
    /*
     * Written whenever it differs from the total — points OR instalments. It
     * was `pointsApplied > 0 ? … : undefined`, so an EMI order carried no
     * `amountDue` and every reader fell back to the full total.
     */
    amountDue: amountDue !== orderTotal ? amountDue : undefined,
    /* The eleven `emi*` order fields went with EMI stage 5a. */
    currency: firstItem.currency ?? getDefaultCurrency(),
    storeId: firstItem.storeId || undefined,
    storeName: firstItem.storeName || undefined,
    items: orderItems,
    orderType,
    // How the buyer earned the right to buy at this price. `orderType` cannot
    // answer that — it has five values, and both a settled win and a buyout
    // are "collector-drop". Written ONCE here and never recomputed: the collector drop and
    // offer documents it summarises are mutable and eventually archived.
    sourceContext,
    offerId: firstItem.offerId ?? undefined,
    // Distinguishes a Buy Now purchase from a settled collector drop win. Both are
    // orderType "collector-drop"; only this one gets the 24h admin-review window.
    isBuyout: firstItem.isBuyout ? true : undefined,
    status: OrderStatusValues.CONFIRMED,
    paymentStatus: PaymentStatusValues.PAID,
    paymentMethod: PaymentMethodValues.ONLINE,
    /*
     * The id every refund and lookup keys on, whichever gateway is live:
     * PhonePe's own `merchantOrderId` (its refund API is
     * `originalMerchantOrderId`-keyed), or Razorpay's `order_…`.
     *
     * 🛑 Razorpay's refund API is PAYMENT-keyed, not order-keyed — storing an
     * order id here works only because `RazorpayProvider.refund()` resolves
     * the order's captured payment itself. Keep that behaviour if this field
     * ever changes; the alternative is tracking a second id at ~6 call sites.
     */
    paymentId: merchantOrderId,
    paymentRecord: {
      /*
       * 🛑 Was a 2-way ternary (`razorpay` / else `phonepe`) with no `cashfree`
       * branch — exactly the bug a 2-value check always risks once a third
       * provider registers. Every Cashfree-settled order recorded
       * `method: "phonepe"` and no `cashfreeOrderId`, which is wrong audit
       * trail for a real, live gateway (Cashfree is the one this project
       * uses specifically for collector-drop/clearance compliance — see
       * CLAUDE.md § payment-cashfree). `gatewayName` is read off the
       * REGISTERED provider three lines above this function's own top, so
       * this is never a value the caller could get wrong.
       */
      method:
        gatewayName === "razorpay"
          ? "razorpay"
          : gatewayName === "cashfree"
            ? "cashfree"
            : "phonepe",
      transactionId: transactionId ?? merchantOrderId,
      /*
       * 🛑 What the gateway actually CAPTURED, which is `amountDue` once points
       * are applied — not the order's value. This record is the evidence a
       * reconciler compares against the gateway's own figure (Phase 4 R2), so
       * writing `orderTotal` here would open an `amount_mismatch` case on every
       * points-funded order: the discount would read as money we failed to
       * collect.
       */
      amount: amountDue,
      paidAt: new Date(),
      verifiedBy: `${gatewayName}-order-status`,
      verificationMethod: "order-status",
      gatewayRef: {
        merchantOrderId,
        ...(gatewayName === "razorpay"
          ? { razorpayOrderId: merchantOrderId, razorpayPaymentId: transactionId }
          : gatewayName === "cashfree"
            ? { cashfreeOrderId: gatewayOrderId }
            : { phonepeOrderId: gatewayOrderId }),
        transactionId,
      },
    },
    /*
     * ── Split settlement: this seller's share never entered our account ─────
     *
     * 🛑 **THE DOUBLE-PAYMENT GUARD'S ONLY WRITER.** `orderNeedsManualPayout`
     * reads it, and both mark-shipped writers consult that before setting
     * `payoutStatus: "eligible"`. Without this field the weekly and automatic
     * sweeps would create a `payouts` row for the FULL share of an order the
     * aggregator has already settled — the seller paid twice, once out of
     * escrow and once out of the platform's own balance.
     *
     * 🛑 Only written when the capture CARRIED an instruction for this store.
     * It is never inferred from the gateway's name or from the store being
     * third-party: if the split field had been silently ignored by the gateway
     * (the one assumption in `payment-cashfree` whose failure mode is silent),
     * an inferred flag would mark the order settled and the seller would never
     * be paid at all. A missing entry here means the ordinary payout path,
     * which is the safe direction — a seller chasing a late payout is
     * recoverable; one who was never paid and whose order says otherwise is
     * not.
     */
    splitSettlement: splitForThisStore
      ? {
          gateway: splitForThisStore.gateway || gatewayName,
          vendorId: splitForThisStore.vendorId,
          vendorAmount: splitForThisStore.amount,
          // 🛑 The payout row's own `requestedAt`, never `new Date()` here —
          // the settle request can be minutes after the capture.
          instructedAt: splitForThisStore.instructedAt,
          merchantOrderId,
        }
      : undefined,
    shippingAddress,
    notes,
    platformFee,
    // Persisted alongside the fee — see the COD/UPI path's note. Both paths
    // charged this to the buyer and recorded only the combined `gstAmount`,
    // leaving the refund path to re-derive it from live percentages (D32).
    platformFeeGst: platformFeeGst > 0 ? platformFeeGst : undefined,
    shippingFee: shippingFee > 0 ? shippingFee : undefined,
    /*
     * The obligation this seller's offer IMPLIES, when it implies one. See the
     * block above `gatewayShippingObligation` for the gap this partially covers
     * and why it is partial rather than invented.
     */
    shippingObligation: gatewayShippingObligation,
    whatsappNotifyAddon: whatsappNotifyFee > 0 ? true : undefined,
    whatsappNotifyFee: whatsappNotifyFee > 0 ? whatsappNotifyFee : undefined,
    giftWrapAddon: giftWrapFee > 0 ? true : undefined,
    giftWrapFee: giftWrapFee > 0 ? giftWrapFee : undefined,
    giftWrapMessage: giftWrapFee > 0 ? giftWrapMessage?.slice(0, 500) : undefined,
    shipmentProtectionAddon: shipmentProtectionFee > 0 ? true : undefined,
    shipmentProtectionFee: shipmentProtectionFee > 0 ? shipmentProtectionFee : undefined,
    // Recorded as well as charged — an order that collects a protection fee
    // without a record of it cannot be reconciled against a later claim.
    saleProtectionFee: saleProtectionFee > 0 ? saleProtectionFee : undefined,
    // S5a — snapshotted, matching the COD/manual path field for field.
    sharedPurchase: phonepeSharedQuote.isShared
      ? {
          destinationCount: countDestinations(group.map(({ item }) => item)),
          handlingFee: phonepeSharedQuote.handlingFee,
          extraShippingFee: phonepeSharedQuote.extraShippingFee,
        }
      : undefined,
    /*
     * The tax breakdown, matching `createOrderForGroup` field for field.
     * This path recorded NONE of it before C0c defect 1 — so an online order
     * carried no `taxableAmount`, no `gstAmount` and no split, and the order
     * page's Tax row could not render even once GST was enabled. Both the
     * product GST and the platform-fee GST are summed into `gstAmount`, which
     * is what makes the order's own lines reconcile to its total.
     */
    taxableAmount: phonepeGst?.taxableAmount,
    exemptAmount: phonepeGst?.exemptAmount || undefined,
    // Phase 7 — the place of supply, matching `createOrderForGroup` field for
    // field. This path recorded NONE of the tax breakdown until C0c defect 1,
    // which is precisely why every addition here has to be made twice.
    /*
     * Part 14 — the snapshot's state is authoritative, because it is the
     * field the invoice and GSTR-1 actually read. `buyerState` stays as
     * the fallback for a digital cart, which has no delivery address.
     */
    placeOfSupply: deliverySnapshot?.deliveryState || buyerState || undefined,
    // Our registration at the moment of supply — see the schema. Mirrors the
    // COD/UPI path so both produce an invoiceable order.
    supplierGstin: supplier.gstin,
    supplierLegalName: supplier.legalName,
    supplierAddress: supplier.address,
    gstByRate: phonepeGst?.byRate.length ? phonepeGst.byRate : undefined,
    gstAmount: (phonepeGst?.gstAmount ?? 0) + platformFeeGst || undefined,
    cgst: phonepeGst?.cgst || undefined,
    sgst: phonepeGst?.sgst || undefined,
    igst: phonepeGst?.igst || undefined,
    couponCode: appliedDiscounts[0]?.code,
    couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
    appliedDiscounts: appliedDiscounts.length > 0 ? appliedDiscounts : undefined,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    outOfStockPolicy,
    droppedItems: unavailablePaid.length > 0 ? unavailablePaid : undefined,
    /*
     * Item 1.39 — the consent taken at CREATE-ORDER time, before the capture.
     * Loaded back by id from the gateway's own passthrough channel rather than
     * re-taken here: there is no buyer in the room on the webhook path, and
     * asking for consent after the money moved would be meaningless anyway.
     */
    policyConsent,
    ...extraOrderFields,
  } as never);

  orderIds.push(order.id);

  await finalizeOrderPlacement({
    orderId: order.id,
    uid,
    group,
    pointsApplied,
    pointsBudget,
    firstItem,
    userEmail,
    userName,
    groupCouponCodes,
    couponUsageAccumulator,
    emailsToSend,
    orderItems,
    totalQuantity,
    orderTotal,
    shippingAddress,
    paymentMethod: PaymentMethodValues.ONLINE,
    storeOwnerId,
    paid: true,
    storeId: order.storeId,
  });

  return orderTotal;
}

export async function verifyAndPlaceGatewayOrderAction(
  input: VerifyAndPlaceGatewayOrderInput,
): Promise<CheckoutOrderResult> {
  const { merchantOrderId } = input;

  /*
   * Razorpay's signed client callback, checked BEFORE the claim doc is
   * created. Order matters: a forged callback that claimed first would make
   * the real confirmation (webhook or retry) return "in progress" forever,
   * turning a rejected request into a stuck order. Verify, then claim.
   *
   * The key secret is resolved here rather than passed in because the route
   * has no business holding it. A missing secret cannot verify anything, so
   * it fails closed — the same direction as `verifyWebhook()`.
   */
  if (input.razorpaySignature) {
    const { razorpayKeySecret } = await resolveKeys();
    /*
     * 🛑 A4b — through the CONTRACT, not a direct Razorpay import.
     *
     * This file used to `import { verifyPaymentSignature } from
     * "providers/payment-razorpay/signature"`, which named one gateway in the
     * one place that has to work for every gateway. `verifyCheckoutSignature`
     * is on `IPaymentProvider` now; Razorpay's implementation calls the SAME
     * function with the SAME HMAC, so no arithmetic moved.
     *
     * Everything that made this fail closed is unchanged: the branch still only
     * runs when a signature is present, the secret is still resolved here, and
     * `!!razorpayKeySecret` still short-circuits. A provider with no such
     * handshake (manual, PhonePe) returns `false` — never `true`.
     *
     * Proven rather than argued: `.build-memory/checkout-sig-parity.mjs` ran
     * both paths over 12 cases — valid, tampered order id, tampered payment id,
     * wrong secret, empty secret, non-hex, short, and every missing-field
     * permutation. The provider never accepts what the direct call rejected.
     *
     * One case differs, in the safe direction, and it fixes a latent crash:
     * on a callback MISSING `razorpay_signature` the old call THREW
     * (`hexEqual` reads `.length` of `undefined`), so a malformed callback
     * escaped as an unhandled TypeError instead of taking the rejection path
     * below. The provider checks its three fields first and returns false, so
     * that request now gets logged as `signature_mismatch` like any other
     * forgery.
     */
    /*
     * 🛑 No `payment!`. `payment` is OPTIONAL on the registry, and a missing
     * provider must reject rather than throw — the same fail-closed direction
     * as the absent secret beside it. An assertion here would turn an
     * unconfigured install into a 500 on the payment path.
     */
    const paymentProvider = getProviders().payment;
    const signatureValid =
      !!razorpayKeySecret &&
      !!paymentProvider &&
      paymentProvider.verifyCheckoutSignature(input.razorpaySignature, razorpayKeySecret);
    if (!signatureValid) {
      serverLogger.warn(
        `Razorpay signature rejected: order=${input.razorpaySignature.razorpay_order_id} payment=${input.razorpaySignature.razorpay_payment_id}`,
      );
      failedCheckoutRepository
        .logPayment(input.userId ?? "unknown", "signature_mismatch", "Razorpay client signature invalid", {
          gatewayOrderId: input.razorpaySignature.razorpay_order_id,
          gatewayPaymentId: input.razorpaySignature.razorpay_payment_id,
          addressId: input.addressId,
        })
        .catch((logErr: unknown) => { void normalizeError(logErr); serverLogger.warn(AUDIT_LOG_FAIL_MSG, { error: logErr instanceof Error ? logErr.message : String(logErr) }); });
      throw new ValidationError(ERROR_MESSAGES.CHECKOUT.PAYMENT_FAILED);
    }
  }

  /*
   * Idempotency: the buyer's /verify call and the async webhook can both race
   * to confirm+place for the same payment (see the module comment above).
   * `.create()` throws on conflict, so whichever caller creates this claim doc
   * first is the sole placer; the loser returns whatever the winner already
   * placed.
   *
   * 🛑 THE CLAIM CARRIES A LEASE, AND THAT IS NOT A REFINEMENT — IT IS THE
   * WHOLE POINT. Measured in production 2026-10-21: `order_TqJvzY4gVjR2cc` /
   * `pay_TqJx88j8OB7dSJ`, ₹2,511.80 captured by UPI, no order, and a manual
   * refund from the Razorpay dashboard.
   *
   * The old version wrote `{ claimedAt }` and nothing else. Everything below
   * this block — ~400 lines, a dozen throw sites, `ADDRESS_REQUIRED` and the
   * amount guard among them — runs AFTER the claim is taken, and **nothing
   * released it on failure**. So one failed placement made the claim a
   * tombstone: every later attempt hit ALREADY_EXISTS, found zero orders, and
   * returned "still being confirmed — please refresh". Refreshing could never
   * work. The error told the buyer to do the one thing guaranteed to fail.
   *
   * A lease fixes it without a 400-line try/catch, and fixes strictly more: a
   * `catch` cannot run if the process is killed mid-placement, and an expired
   * lease is reclaimable either way. The loser now distinguishes three states
   * rather than two — placed, genuinely in flight, or abandoned.
   */
  const claimRef = getAdminDb().collection("gatewayOrderClaims").doc(merchantOrderId);
  const claimNow = new Date();
  const claimLease = {
    claimedAt: claimNow,
    leaseExpiresAt: new Date(claimNow.getTime() + GATEWAY_CLAIM_LEASE_MS),
  };
  try {
    await claimRef.create(claimLease);
  } catch (claimErr) {
    void normalizeError(claimErr);
    const existingOrders = await unitOfWork.orders.findByPaymentId(merchantOrderId);
    if (existingOrders.length > 0) {
      return {
        orderIds: existingOrders.map((o) => o.id),
        total: existingOrders.reduce((sum, o) => sum + o.totalPrice, 0),
        itemCount: existingOrders.length,
      };
    }

    /*
     * No order, and the holder's lease has run out: the previous attempt died
     * or threw. Take the claim over rather than refusing forever.
     *
     * The takeover is a TRANSACTION, not a bare update, because two retries
     * can arrive together — and two placers for one payment is the duplicate
     * order this claim exists to prevent. Re-reading inside the transaction
     * means exactly one of them wins the takeover; the other sees a fresh
     * lease and backs off.
     */
    const tookOver = await getAdminDb()
      .runTransaction(async (tx) => {
        const snap = await tx.get(claimRef);
        const held = snap.data() as
          | { leaseExpiresAt?: { toDate?: () => Date }; takeoverCount?: number }
          | undefined;
        const expiresAt = held?.leaseExpiresAt?.toDate?.();
        // A claim written before this field existed has no lease — treat it as
        // expired rather than immortal, which is the bug being fixed. Every
        // tombstone already in the collection is reclaimed by this line.
        if (expiresAt && expiresAt.getTime() > Date.now()) return false;
        tx.update(claimRef, {
          claimedAt: new Date(),
          leaseExpiresAt: new Date(Date.now() + GATEWAY_CLAIM_LEASE_MS),
          // Incremented in JS rather than with `FieldValue.increment`: the
          // read is already inside this transaction, so it serialises
          // correctly — and `firebase-admin/firestore` is loaded lazily here
          // to keep it out of client graphs (Root Cause #24).
          takeoverCount: (held?.takeoverCount ?? 0) + 1,
        });
        return true;
      })
      .catch((txErr: unknown) => {
        void normalizeError(txErr);
        return false;
      });

    if (!tookOver) {
      throw new ValidationError(ERROR_MESSAGES.CHECKOUT.ORDER_PLACEMENT_IN_PROGRESS);
    }
    serverLogger.warn("gateway claim taken over from an expired lease", { merchantOrderId });
  }

  /*
   * THE authoritative check, for either gateway: re-fetch the order from the
   * gateway and require it to be paid. For PhonePe this is the only possible
   * proof (the browser never receives a verifiable one); for Razorpay it is
   * what the client signature above cannot establish on its own.
   *
   * 🛑 `RazorpayProvider.getOrder()` must map the gateway's real status for
   * this to mean anything — the pre-2026 implementation hardcoded "created",
   * which here would reject every successful Razorpay payment AFTER the buyer
   * was debited. See that provider's class comment, point 1.
   */
  const gatewayOrder = await getProviders().payment!.getOrder(merchantOrderId);
  if (gatewayOrder.status !== "paid") {
    serverLogger.warn(`Gateway order not paid: merchantOrderId=${merchantOrderId} state=${gatewayOrder.status}`);
    failedCheckoutRepository
      .logPayment(input.userId ?? "unknown", "signature_mismatch", "Gateway order not paid", {
        gatewayOrderId: gatewayOrder.gatewayOrderId,
        gatewayPaymentId: merchantOrderId,
        addressId: input.addressId,
      })
      .catch((logErr: unknown) => { void normalizeError(logErr); serverLogger.warn(AUDIT_LOG_FAIL_MSG, { error: logErr instanceof Error ? logErr.message : String(logErr) }); });
    throw new ValidationError(ERROR_MESSAGES.CHECKOUT.PAYMENT_FAILED);
  }

  // The buyer-present /verify call always supplies these; the webhook path
  // (no session) reconstructs them from the gateway's own passthrough channel
  // — PhonePe's `metaInfo`, Razorpay's `notes` — both packed at create-order
  // time and both surfaced as `PaymentOrder.metadata`. See
  // `CheckoutIntentMetadata`, which is the shape either one carries.
  const intent = gatewayOrder.metadata as unknown as CheckoutIntentMetadata | undefined;
  const uid = input.userId ?? intent?.uid;
  if (!uid) {
    throw new ValidationError(ERROR_MESSAGES.CHECKOUT.PAYMENT_FAILED);
  }
  let userName = input.userName;
  let userEmail = input.userEmail;
  if (userName === undefined || userEmail === undefined) {
    const userDoc = await userRepository.findById(uid);
    /*
     * 🛑 Revealed: `createOrder` encrypts `userEmail`, so handing it the
     * ciphertext this read returns would double-encrypt it and make the
     * buyer's address on the order undecryptable. `displayName` is not PII and
     * needs no reveal.
     */
    const userPlain = userDoc ? userRepository.revealUser(userDoc) : null;
    userName = userName ?? userDoc?.displayName ?? "Customer";
    userEmail = userEmail ?? userPlain?.email ?? "";
  }
  const addressId = input.addressId ?? intent?.addressId;
  const notes = input.notes ?? intent?.notes;
  const outOfStockPolicy =
    input.outOfStockPolicy ??
    (intent?.outOfStockPolicy as OutOfStockPolicy | undefined) ??
    OutOfStockPolicyValues.CANCEL_ORDER;

  /*
   * ── ITEM 1.39 — THE CONSENT, RESOLVED NOT RE-TAKEN ────────────────────────
   *
   * On this path the money is ALREADY CAPTURED, so there is nothing left to
   * gate: asking for consent here would be asking a buyer whose card has been
   * charged whether they agree. The enforcement therefore happens one request
   * earlier, in `POST /api/payment/create-order`, which writes a
   * `buyerPolicyConsents` record BEFORE calling the gateway and packs its id
   * into the gateway's own passthrough channel.
   *
   * What this line does is read that record back and prove it belongs to this
   * buyer. Its failure mode is deliberately 5xx rather than 4xx (see
   * `POLICY_CONSENT_UNRESOLVED_CODE`): a missing record means our own
   * pre-capture write is unreadable, not that the buyer did anything wrong, so
   * the honest answer is "ask us again" — which makes the gateway's retry
   * schedule the recovery path. The one outcome that is not permitted is
   * placing an order with no consent record on it.
   */
  const policyConsent = await loadBuyerPolicyConsent({
    consentId: intent?.policyConsentId,
    uid,
  });

  // Add-on fees are no longer resolved here. They are per store, and this
  // function has no single store — each group reads its own selection off
  // `cart.storeAddons` inside createPhonePeGroupOrder.
  const siteSettings = await siteSettingsRepository.getSingleton();

  const cart = await unitOfWork.carts.getOrCreate(uid);
  if (!cart.items || cart.items.length === 0) {
    throw new ValidationError(ERROR_MESSAGES.CHECKOUT.CART_EMPTY);
  }

  /*
   * Same lane priority + locked-line revalidation the manual/COD path runs.
   *
   * 🛑 D40 — THIS LINE USED TO IGNORE THE BUYER'S SELECTION, and the capture
   * route did not. `defaultCheckoutItems(cart.items)` is the active lane and
   * nothing else, while `/api/payment/create-order` filtered by
   * `cart.selectedItemIds` and fell back to the WHOLE CART across every lane.
   * Two divergences fell out of that:
   *
   *   with a selection → charged for the selected items, orders for the whole
   *                      lane: goods and stock leaving without payment.
   *   no selection     → charged for EVERY lane, orders for one: the buyer
   *                      OVERPAYS, and multi-lane carts are the normal product
   *                      of the lane model (see `defaultCheckoutItems`).
   *
   * `resolveCheckoutItems` is now the one definition both paths call: active
   * lane first, then the selection as a filter within it. Everything
   * downstream still reads `settleItems`, because stock decrements,
   * jurisdiction checks and the order rows must cover exactly what was charged.
   */
  const settleItems = resolveCheckoutItems(cart.items, cart.selectedItemIds);
  if (settleItems.length === 0) {
    /*
     * An empty intersection is a refusal, not a fallback. It means the
     * selection names only off-lane items — so the buyer is looking at
     * something the server will not sell them, and widening to the whole lane
     * would charge them for lines they deliberately unticked.
     */
    throw new ValidationError(ERROR_MESSAGES.CHECKOUT.CART_EMPTY);
  }
  assertCheckoutLane(cart.items, settleItems);
  await assertLockedLinesStillValid(settleItems, uid);

  const isDigitalCartPp = cartIsDigitalOnly(settleItems);

  let shippingAddress: string | undefined;
  let deliverySnapshot: DeliverySnapshot | undefined;
  let resolvedAddressPp: import("../../../../features/addresses/schemas/firestore").AddressDocument | null = null;
  if (!isDigitalCartPp) {
    if (!addressId) {
      throw new NotFoundError(ERROR_MESSAGES.CHECKOUT.ADDRESS_REQUIRED);
    }
    const addressDoc = await unitOfWork.addresses.findById(addressId);
    resolvedAddressPp =
      addressDoc && addressDoc.ownerType === "user" && addressDoc.ownerId === uid
        ? addressDoc
        : null;
    if (!resolvedAddressPp) {
      throw new NotFoundError(ERROR_MESSAGES.CHECKOUT.ADDRESS_REQUIRED);
    }
    shippingAddress = formatShippingAddress(resolvedAddressPp);
    /*
     * 🛑 REVEALED first. `findById` returns this PII encrypted, and
     * `snapshotDeliveryAddress` demands `AddressPlain` precisely so that
     * freezing `enc:v1:…` onto an invoice is a compile error rather than
     * something discovered on a printed label.
     */
    deliverySnapshot = snapshotDeliveryAddress(
      unitOfWork.addresses.revealAddress(resolvedAddressPp),
    );
  }

  // SB-UNI-5 2026-05-13 — bundle-aware product fetch + validation. Each
  // cart line gets paired with a "representative" product (first member id
  // for bundles, productId for regular items). The full bundle-member
  // decrement runs against `expansionPaid.decrements` lower down.
  const expansionPaid = getExpandedDecrements(settleItems);
  const productByIdPaid = new Map<string, ProductDocument>();
  // Independent reads across distinct product docs — batch them instead of
  // awaiting one findById per product (mirrors the COD/UPI path above, which
  // already batches its product lookups via Promise.all).
  const fetchedProductsPaid = await Promise.all(
    expansionPaid.productIds.map((pid) => unitOfWork.products.findById(pid)),
  );
  expansionPaid.productIds.forEach((pid, i) => {
    const product = fetchedProductsPaid[i];
    if (product) productByIdPaid.set(pid, product);
  });
  const productChecks = settleItems.map((item) => {
    const [firstMember] = getCartItemMemberIds(item);
    const product = productByIdPaid.get(firstMember) ?? null;
    return { item, product };
  });

  /*
   * ── Phase 1c at SETTLE: resolve and RECORD. Deliberately does NOT throw. ──
   *
   * 🛑 THIS IS THE ONE PLACE THE FAIL-CLOSED RULE MUST NOT REFUSE, and the
   * reason is arithmetic rather than taste. By the time this runs the gateway
   * has already captured — the `status !== "paid"` check above is what let us
   * get here. The funds have therefore already settled wherever the collecting
   * gateway settles them, so throwing does not un-commingle anything: it only
   * denies the buyer the order their money has already paid for. That is the
   * money-taken/no-order failure class this function carries two separate 🛑
   * blocks about (the `ADDRESS_REQUIRED` tombstone, `order_TqJvzY4gVjR2cc`,
   * ₹2,511.80 and a manual refund).
   *
   * The enforcement point is CAPTURE — `/api/payment/create-order` and the
   * `"online"` branch of `createCheckoutOrderAction`, both of which refuse
   * before a payment session exists. This is the detector for the case those
   * two did not cover: the cart can gain another seller's line between the
   * capture request and this one (`assertCanAddNewItems` only blocks adding
   * while a HIGHER lane is pending, so a standard line can still arrive), and
   * the webhook path reaches here with no session at all.
   *
   * So the obligation here is VISIBILITY. A multi-vendor order collected by a
   * gateway that cannot split means the platform now owes those vendors a
   * payout from its own balance — a compliance incident an operator has to
   * know about and resolve out of band. Silently placing the order and saying
   * nothing is what makes that invisible, and invisible is the whole failure
   * mode: a commingled capture looks exactly like a successful checkout.
   *
   * Best-effort on purpose — neither the log nor the notification may fail a
   * placement whose payment has already been taken.
   */
  const settlementCheck = resolveCollectingGatewayForCart({
    items: settleItems,
    productById: productByIdPaid,
    platformStoreId: siteSettings?.payment?.platformStoreId,
  });
  if (!settlementCheck.resolution.ok) {
    const collectingGateway = getProviders().payment?.name ?? "unknown";
    serverLogger.error(
      "SETTLEMENT COMPLIANCE: a captured payment was settled by a gateway that cannot satisfy this cart",
      {
        merchantOrderId,
        gateway: collectingGateway,
        constraint: settlementCheck.resolution.failedConstraint ?? "none",
        detail: settlementCheck.resolution.detail,
      },
    );
    await adminNotificationsRepository
      .create({
        category: "payouts",
        title: "Payment collected by a gateway that cannot split this cart",
        body:
          `Payment ${merchantOrderId} was captured by "${collectingGateway}" for a cart ` +
          `that needed more (${settlementCheck.resolution.failedConstraint ?? "no gateway enabled"}). ` +
          `${settlementCheck.resolution.detail ?? ""} The order is being placed — the buyer has ` +
          `already paid — but any third-party seller's share is now in the platform's own ` +
          `account and must be settled manually.`,
        severity: "error",
        isRead: false,
        entityType: "order",
        entityId: merchantOrderId,
        audienceUserIds: [],
      })
      .catch((notifyErr: unknown) => {
        void normalizeError(notifyErr);
        serverLogger.error(
          "verifyAndPlaceGatewayOrderAction: failed to write admin notification for a settlement-compliance incident",
          { merchantOrderId },
        );
      });
  }

  // SB6-C — maxPerUser cap check before we touch any state.
  await enforceMaxPerUserForCart({
    userId: uid,
    items: productChecks
      .filter(
        (p): p is { item: CartItemDocument; product: ProductDocument } =>
          p.product !== null && p.product !== undefined,
      )
      .map(({ item, product }) => ({ item, product })),
  });

  // S-SBUNI-RULES 2026-05-13 — sync preflight via rule registry.
  // Multi-member lines skip the prize-pool cap, same reasoning as the COD path.
  const preflightPairs = productChecks.filter(
    (p): p is { item: CartItemDocument; product: ProductDocument } =>
      p.product !== null && p.product !== undefined && !isMultiMemberLine(p.item),
  );
  // This whole action is the online-payment path — paymentMethod is always "online".
  runSyncPreflight(preflightPairs, "online");

  // SB-UNI-O 2026-05-15 — Live-item jurisdiction guard.
  if (!isDigitalCartPp && resolvedAddressPp) {
    assertLiveJurisdiction(settleItems, productByIdPaid, resolvedAddressPp.state);
  }

  // SB-UNI-5 — validate every required member product across the cart with
  // cumulative decrement awareness (two bundles sharing a member must NOT
  // both succeed unless the product has enough stock for the sum).
  //
  // Out-of-stock policy: unlike the COD/UPI path, PhonePe payment has
  // ALREADY been captured for the full cart by the time this runs — so
  // "skip_items" here means placing orders for the available items only and
  // auto-refunding the dropped items' value (below), not skipping payment.
  const bucketedPaid = bucketCartItemsByStock(
    settleItems,
    productByIdPaid,
    expansionPaid.decrements,
    (item) => productByIdPaid.get(getCartItemMemberIds(item)[0]) ?? null,
  );
  const unavailablePaid = bucketedPaid.unavailable;

  if (unavailablePaid.length > 0) {
    for (const u of unavailablePaid) {
      const exists = productByIdPaid.has(u.productId);
      const reason = exists ? "stock_insufficient" : "product_unavailable";
      failedCheckoutRepository
        .logPayment(
          uid,
          reason,
          exists
            ? `Product ${u.productId} has ${u.availableQty} left, requested ${u.requestedQty}`
            : `Product ${u.productId} not published`,
          {
            gatewayOrderId: gatewayOrder.gatewayOrderId,
            gatewayPaymentId: merchantOrderId,
            addressId,
          },
        )
        .catch((err: unknown) => { void normalizeError(err); serverLogger.warn(AUDIT_LOG_FAIL_MSG, { error: err instanceof Error ? err.message : String(err) }); });
    }
  }

  // outOfStockPolicy: "cancel_order" (also the default for old clients that
  // omit the field) — reject the whole checkout batch, exactly like every
  // online-payment checkout behaved before this policy existed.
  if (outOfStockPolicy === OutOfStockPolicyValues.CANCEL_ORDER && unavailablePaid.length > 0) {
    throw new ValidationError(ERROR_MESSAGES.CHECKOUT.INSUFFICIENT_STOCK);
  }
  // Mirrors the COD/UPI path's all-unavailable guard — regardless of policy,
  // there is nothing to place an order for.
  if (bucketedPaid.available.length === 0) {
    throw new ValidationError(ERROR_MESSAGES.CHECKOUT.INSUFFICIENT_STOCK);
  }

  {
    /*
     * 🛑 D38 — this guard used to HAND-ROLL the price rule it is guarding:
     *
     *     const isBundle = Boolean(item.bundleCategorySlug && item.bundleProductIds?.length);
     *     const unit = isBundle ? item.price : product!.price;
     *
     * It reproduced the BUNDLE branch of `unitPriceFor` and omitted the
     * `lockedPrice` and `groupMembers` ones — which is precisely what that
     * function's docstring forbids, and the fifth copy of the rule found
     * across three sessions (Root Cause #75).
     *
     * The failure was the worst available shape. On an accepted ₹800 offer for
     * a ₹1,000 listing: the capture route takes ₹800 (it uses `lineTotalFor`),
     * this guard expects ₹1,000, `paid < expected − 1` fires, and the function
     * THROWS — after the money has already been taken, on a branch with no
     * refund. The buyer is charged and gets no order. That is the D64 incident
     * class, reached by a different door.
     */
    const cartSubtotalRs = productChecks.reduce(
      (sum, { item, product }) => sum + lineTotalFor(item, product),
      0,
    );
    // Must use the SAME helper /api/payment/create-order used to compute what
    // it charged. This block used to re-derive the fee inline from the raw
    // percentages, so the moment the cap landed it would have expected more
    // than was actually collected and rejected every legitimate payment.
    const commissionRates = siteSettings?.commissions ?? CHECKOUT_DEFAULT_COMMISSIONS;
    // The whole object is kept so the points tender below can re-allocate it
    // per group — see the same note in `previewCheckoutPricing`. `totalFee`
    // carries the `minimumTransactionFee` floor, and destructuring it away is
    // how it lost every consumer once already (D41).
    /*
     * 🛑 `sum(item.quantity)` over the same available set the capture route
     * priced (`POST /api/payment/create-order` sums its own `activeItems`).
     * This guard runs AFTER the money has moved, so a count that disagreed with
     * the capture's would make it expect a different fee and throw on a paid
     * order — the exact post-capture-throw shape the comment above is about,
     * which is why the multiplier has to be derived from the same collection
     * rather than recounted from a different one.
     */
    const expectedLineUnits = productChecks.map(({ item }) => item.quantity ?? 0);
    const expectedFees = computeCheckoutFees(
      cartSubtotalRs,
      commissionRates,
      expectedLineUnits,
    );
    const { platformFee: expectedPlatformFee, gstOnFee: expectedGstOnFee } = expectedFees;
    // Same per-seller-group shipping sum /api/payment/create-order charged
    // upfront (and the same resolveShippingCost createPhonePeGroupOrder
    // below will use to build each order's recorded totalPrice) — keeps this
    // floor check from passing an amount that's short by the shipping fee.
    const expectedShippingGroups = splitCartIntoOrderGroups(bucketedPaid.available);
    /*
     * The coupon, which this guard also omitted — the mirror of D37, and the
     * two MUST move together. With the capture route now correctly deducting
     * the discount, a guard that does not would expect MORE than was collected
     * and would reject every legitimate coupon payment — turning an overcharge
     * into a post-capture throw, which is strictly worse.
     *
     * Grouped identically to the capture route (`splitCartIntoOrderGroups` over
     * the same available items), so the two compute the same number from the
     * same shape rather than agreeing by coincidence.
     */
    const { couponDiscount: expectedCouponDiscount } = computeCartCouponDiscount(
      cart.appliedCoupons ?? [],
      expectedShippingGroups.map((g) => ({
        storeId: g.items[0].item.storeId,
        lines: g.items.map(({ item, product }) => ({
          itemId: item.itemId,
          lineTotal: lineTotalFor(item, product),
        })),
      })),
    );
    const expectedDiscountedSubtotal = Math.max(0, cartSubtotalRs - expectedCouponDiscount);
    const expectedShippingFees = await Promise.all(
      /*
       * 🛑 D44 — THE GUARD MUST PASS `goodsValue` TOO, AND IN THIS SAME
       * COMMIT. This is the D37/D38 sequencing trap, one defect over.
       *
       * The capture route and both order paths now quote with the group's real
       * goods value, so a store's free-above threshold can fire and shipping
       * can legitimately be ₹0. A guard still quoting with `goodsValue: 0`
       * would compute the UN-thresholded fee, expect more than was collected,
       * trip `paid < expected − 1`, and **throw after the money was taken** —
       * converting a fixed overcharge into a charged-with-no-order, which is
       * the D64 incident class and strictly worse than the bug being fixed.
       *
       * Verified by construction rather than by hope: the goods value here is
       * computed with `lineTotalFor` over the same `expectedShippingGroups`
       * the capture route groups, so the two cannot disagree about the base.
       */
      expectedShippingGroups.map((g) =>
        resolveShippingCost(g.items[0].item.storeId, {
          goodsValue: g.items.reduce(
            (sum, { item, product }) => sum + lineTotalFor(item, product),
            0,
          ),
        }),
      ),
    );
    const expectedShippingFee = expectedShippingFees.reduce((sum, r) => sum + r.shippingFee, 0);
    /*
     * ── The instalment terms, which this guard must expect BOTH of ──────────
     *
     * 🛑 Two terms, pulling in opposite directions, and omitting either one
     * breaks the guard in the direction that costs the buyer an order:
     *
     *   + surcharge — the cost of credit, a real addition to the total
     *   − deferred  — the financed principal plus that surcharge, which is NOT
     *                 collected today
     *
     * With neither term the guard would expect the un-surcharged FULL total
     * while the gateway captured only the token, trip `paid < expected − 1`,
     * and throw **after the money was taken** — a charged-with-no-order, the
     * D64 class, on every single EMI order. That is strictly worse than the
     * overcharge this guard exists to catch, which is the same trap D44's note
     * above records one defect over.
     *
     * Built from the same per-group goods values and the same `groupEmiQuote`
     * the capture route and the order writer call, so the only way the three
     * can disagree is a change made to one and not the others.
     */
    /* The guard's expected EMI surcharge/deferred terms went with EMI stage
       5a: `cart.emiPlan` and `groupEmiQuote` are both deleted, so an order
       can carry neither. */
    // Add-ons are per store, so the expected total sums each group's own
    // selection — a single cart-wide figure would over- or under-count as soon
    // as the buyer picked add-ons for only some sellers.
    const expectedAddonFees = expectedShippingGroups.reduce((sum, g) => {
      const storeId = g.items[0].item.storeId;
      const addons = cart.storeAddons?.[storeId] ?? {};
      const groupSubtotal = g.items.reduce(
        (gs, { item, product }) => gs + lineTotalFor(item, product),
        0,
      );
      return (
        sum +
        computeWhatsAppNotifyFee(addons.whatsappNotifyAddon ?? false, commissionRates) +
        computeGiftWrapFee(addons.giftWrapAddon ?? false, commissionRates) +
        computeShipmentProtectionFee(groupSubtotal, addons.shipmentProtectionAddon ?? false, commissionRates)
      );
    }, 0);
    /*
     * Product GST, matching what `/api/payment/create-order` charged.
     *
     * 🛑 This term's ABSENCE was half of C0c defect 1. The guard agreed with
     * the create path only because both omitted it, so an undercharge could
     * never trip the check — the two were consistently wrong together, which
     * is the worst available state for a guard.
     *
     * `intraState: false` is deliberate and is not a guess about the buyer's
     * address: the TOTAL does not depend on the place of supply (IGST total ==
     * CGST+SGST total), measured to within ₹0.01 across ~285k rate/base
     * combinations, and this comparison already carries a ₹1 tolerance.
     * Only the split needs the address, and the split is not checked here.
     */
    /*
     * 🛑 No product-GST term, and the reason is the tax-inclusive model rather
     * than the omission this guard was fixed for an hour earlier.
     *
     * Defect 1's fix added `expectedProductGst` here, because the three money
     * sites had to AGREE with the preview and the preview added the tax. The
     * model then changed: every price carries its tax inside, so the correct
     * shared value became zero-added — at the capture route, at both order
     * paths, at the preview, and here. The agreement defect 1 established is
     * preserved; what changed is the figure all five agree on.
     *
     * `cartSubtotalRs` therefore already contains the GST, and adding it again
     * would make this guard demand ~₹580 more than the buyer owes on a
     * ₹5,547 cart — rejecting every correctly-charged order.
     */
    /*
     * ── D46/D47 — the guard must expect the amount NET OF POINTS ─────────────
     *
     * 🛑 Omitting this term would make the guard reject every correctly-charged
     * points order, which is worse than the overcharge it exists to catch: the
     * money is already captured by the time this runs, so a false rejection is
     * a charged-with-no-order — the D64 class.
     *
     * The bases are rebuilt here from the same terms in the same order, and the
     * draw-down is the same shared allocator, so the only way this can diverge
     * from the capture route is a change made to one and not the other. That is
     * precisely the drift the four-way export comment on
     * `allocatePointsAcrossGroups` exists to make visible.
     */
    const guardUseAllPoints = cart.useAllPoints === true;
    let expectedPointsApplied = 0;
    if (guardUseAllPoints) {
      const guardBalance = await safePointsBalance(uid);
      if (guardBalance > 0) {
        const guardSubtotals = expectedShippingGroups.map(
          (g) =>
            [
              g.items[0].item.storeId,
              g.items.reduce((gs, { item, product }) => gs + lineTotalFor(item, product), 0),
            ] as const,
        );
        // By UNIT COUNT, matching the capture route and both order paths — the
        // apportionment weight had to change with the fee model, and a guard
        // weighting it differently would expect a different per-group share.
        const guardLineUnits = new Map(
          expectedShippingGroups.map(
            (g) => [g.items[0].item.storeId, g.items.map(({ item }) => item.quantity ?? 0)] as const,
          ),
        );
        const guardFeeByGroup = allocateCheckoutFees(
          guardSubtotals,
          expectedFees,
          guardLineUnits,
          commissionRates,
        );
        const guardCouponByGroup = computeCartCouponDiscount(
          cart.appliedCoupons ?? [],
          expectedShippingGroups.map((g) => ({
            storeId: g.items[0].item.storeId,
            lines: g.items.map(({ item, product }) => ({
              itemId: item.itemId,
              lineTotal: lineTotalFor(item, product),
            })),
          })),
        ).perGroup;
        /*
         * The per-group add-on fee, lifted out of the `map` below so that
         * callback has no block body. Its statements sat at brace-depth 6
         * inside `if → if → callback`, which DEEP_NESTING blocks — and the
         * add-on sum is the one part of this base the sibling money path
         * (`POST /api/payment/create-order`) computes earlier rather than
         * inline, so it is also the natural seam.
         */
        const guardAddonFee = (storeId: string, goods: number): number => {
          const addons = cart.storeAddons?.[storeId] ?? {};
          return (
            computeGiftWrapFee(addons.giftWrapAddon ?? false, commissionRates) +
            computeShipmentProtectionFee(
              goods,
              addons.shipmentProtectionAddon ?? false,
              commissionRates,
            )
          );
        };
        const guardBases = expectedShippingGroups.map((g, i) =>
          pointsBaseForGroup({
            goods: guardSubtotals[i][1],
            couponDiscount: guardCouponByGroup[i]?.couponDiscount ?? 0,
            shippingFee: expectedShippingFees[i]?.shippingFee ?? 0,
            addonFee: guardAddonFee(g.items[0].item.storeId, guardSubtotals[i][1]),
            platformFee: guardFeeByGroup.get(g.items[0].item.storeId)?.platformFee ?? 0,
            gstOnFee: guardFeeByGroup.get(g.items[0].item.storeId)?.gstOnFee ?? 0,
            acceptsPoints: expectedShippingFees[i]?.acceptsPoints === true,
          }),
        );
        expectedPointsApplied = allocatePointsAcrossGroups(
          guardBases,
          guardBalance,
          true,
        ).pointsApplied;
      }
    }

    const expectedPaymentAmountRs = roundRupees(
      Math.max(
        0,
        expectedDiscountedSubtotal +
          expectedPlatformFee +
          expectedGstOnFee +
          expectedAddonFees +
          expectedShippingFee +
          expectedPointsApplied,
      ),
    );
    // Reuses the order already fetched above to confirm COMPLETED — PhonePe's
    // own amount is in its wire-format smallest unit. // audit-money-units-ok: describes the PhonePe boundary conversion this line performs, not our storage convention
    const paidAmountRs = paiseToRupees(gatewayOrder.amount);

    /*
     * ── TWO-SIDED, and the second side is how D37 survived ─────────────────
     *
     * 🛑 This read `paidAmountRs < expectedPaymentAmountRs - 1` — a FLOOR
     * check only. An over-capture of any size passed silently, which is
     * exactly what let the missing coupon term go unnoticed: the gateway took
     * the undiscounted amount, this guard saw "paid ≥ expected" and waved it
     * through, and the order recorded the discounted figure. Nothing in our
     * data disagreed.
     *
     * A ceiling is now checked too. The tolerance stays asymmetric and that is
     * deliberate rather than sloppy:
     *
     *   UNDER by > ₹1   → we were short-changed. Refuse.
     *   OVER  by > ₹1   → the BUYER was over-charged. Record loudly, and
     *                     PROCEED to place the order.
     *
     * Proceeding on an over-capture is the important choice. The alternative —
     * throwing — is what D38 did, and it leaves the buyer charged with no
     * order and no refund on that branch, which is the D64 incident class.
     * Placing the order means the buyer has what they paid for and the surplus
     * is a recorded, refundable discrepancy rather than a vanished payment.
     * Phase 4's reconciler reads `amount_mismatch` rows and opens a case; the
     * refund itself waits for Phase 1's idempotency key, because an automatic
     * refund on top of a non-idempotent refund path is a double-refund
     * generator.
     */
    const amountDelta = paidAmountRs - expectedPaymentAmountRs;
    const AMOUNT_TOLERANCE_RS = 1;

    if (amountDelta < -AMOUNT_TOLERANCE_RS) {
      serverLogger.warn(
        `Payment amount mismatch for user ${uid}: paid ${formatMoney(paidAmountRs)}, expected ≥ ${formatMoney(expectedPaymentAmountRs)}`,
      );
      failedCheckoutRepository
        .logPayment(
          uid,
          "amount_mismatch",
          `Paid ${formatMoney(paidAmountRs)}, expected ≥ ${formatMoney(expectedPaymentAmountRs)}`,
          {
            gatewayOrderId: gatewayOrder.gatewayOrderId,
            gatewayPaymentId: merchantOrderId,
            amountRs: paidAmountRs,
            addressId,
          },
        )
        .catch((err: unknown) => { void normalizeError(err); serverLogger.warn(AUDIT_LOG_FAIL_MSG, { error: err instanceof Error ? err.message : String(err) }); });
      throw new ValidationError(ERROR_MESSAGES.CHECKOUT.PAYMENT_FAILED);
    }

    if (amountDelta > AMOUNT_TOLERANCE_RS) {
      serverLogger.error(
        `OVER-CAPTURE for user ${uid}: paid ${formatMoney(paidAmountRs)}, expected ${formatMoney(expectedPaymentAmountRs)} (surplus ${formatMoney(amountDelta)}) — order will still be placed`,
        { merchantOrderId, expectedCouponDiscount },
      );
      failedCheckoutRepository
        .logPayment(
          uid,
          "amount_mismatch",
          `OVER-CAPTURE: paid ${formatMoney(paidAmountRs)}, expected ${formatMoney(expectedPaymentAmountRs)}, surplus ${formatMoney(amountDelta)} — refund owed`,
          {
            gatewayOrderId: gatewayOrder.gatewayOrderId,
            gatewayPaymentId: merchantOrderId,
            amountRs: paidAmountRs,
            addressId,
          },
        )
        .catch((err: unknown) => { void normalizeError(err); serverLogger.warn(AUDIT_LOG_FAIL_MSG, { error: err instanceof Error ? err.message : String(err) }); });
      // Deliberately NO throw — see above.
    }
  }

  const { coupons: appliedCoupons, dropped: droppedCoupons } =
    await revalidateAppliedCoupons(
      cart.appliedCoupons ?? [],
      bucketedPaid.available,
      uid,
    );
  // "skip_items" (or an all-available cart under any policy) — build order
  // groups from the available bucket only. Dropped items are never ordered;
  // their value is refunded below since PhonePe already captured payment
  // for the full cart before this stock check ran.
  const orderGroups = splitCartIntoOrderGroups(bucketedPaid.available);

  const orderIds: string[] = [];
  let total = 0;
  const emailsToSend: Parameters<typeof sendOrderConfirmationEmail>[0][] = [];

  const cartSubtotal = orderGroups.reduce(
    (s, { items: g }) =>
      s +
      g.reduce(
        (gs, { item, product }) => gs + lineTotalFor(item, product),
        0,
      ),
    0,
  );

  const couponUsageAccumulator = new Map<string, CouponAccumEntry>();

  // Same tapered per-unit fee + exact per-store split as the COD/UPI path.
  const gatewayCommissions = siteSettings?.commissions ?? CHECKOUT_DEFAULT_COMMISSIONS;
  const gatewayLineUnitsOf = (g: { item: CartItemDocument }[]) =>
    g.map(({ item }) => item.quantity ?? 0);
  const gatewayLineUnitsByStore = new Map(
    orderGroups.map(({ items: g }) => [g[0].item.storeId, gatewayLineUnitsOf(g)] as const),
  );
  const gatewayCartLineUnits = orderGroups.flatMap(({ items: g }) => gatewayLineUnitsOf(g));
  const platformFeeByStore = allocateCheckoutFees(
    orderGroups.map(({ items: g }) => [
      g[0].item.storeId,
      g.reduce((sum, { item, product }) => sum + lineTotalFor(item, product), 0),
    ] as const),
    computeCheckoutFees(cartSubtotal, gatewayCommissions, gatewayCartLineUnits),
    gatewayLineUnitsByStore,
    gatewayCommissions,
  );

  /*
   * The points budget for this checkout — one read, zero when not opted in.
   * See the identical pair in the COD/manual path for why it is a shared
   * remainder rather than a per-group balance read.
   *
   * 🛑 On THIS path the money has already been captured by the time these
   * orders are created, so the budget must match whatever the pre-payment
   * amount was computed against. That is why `useAllPoints` is read off the
   * cart here too and not re-decided: the figure quoted to the gateway and the
   * figure recorded on the orders come from the same cart flag.
   */
  const useAllPoints = cart.useAllPoints === true;
  const pointsBudget = { remaining: useAllPoints ? await safePointsBalance(uid) : 0 };

  /*
   * ── What the gateway was INSTRUCTED to settle to each vendor ──────────────
   *
   * One bounded single-field query for the whole capture, so each order can
   * record whether ITS seller's share went straight to them out of escrow.
   * That record is the double-payment guard: without it the payout sweeps would
   * later create a full payout for a share the aggregator has already settled.
   *
   * 🛑 READ, never recomputed. The instruction was built in the capture request
   * (`/api/payment/create-order`), which is the only place that held the vendor
   * registrations and the exact amounts. The cart can gain a line between that
   * request and this one — which is exactly why the settlement-compliance
   * detector above exists — so a recomputation here would quietly disagree with
   * what was actually sent.
   *
   * 🛑 Best-effort: an unreadable payout row must not fail a placement whose
   * payment has already been taken (the money-taken/no-order class this
   * function carries two 🛑 blocks about). An empty map means "no split
   * recorded", which routes the order down the ORDINARY payout path — a seller
   * chasing a late payout is recoverable; one whose order wrongly claims it was
   * already settled would never be paid at all.
   */
  let splitByStore: Map<string, SplitSettlementRecord> = new Map();
  try {
    splitByStore = await payoutRepository.findBySettlementReference(merchantOrderId);
  } catch (err) {
    const normalized = normalizeError(err);
    serverLogger.error(
      "verifyAndPlaceGatewayOrderAction: could not read the split-settlement records for this capture — orders will be placed on the ORDINARY payout path",
      { merchantOrderId, error: normalized.message },
    );
  }

  for (const { items: group, orderType } of orderGroups) {
    total += await createPhonePeGroupOrder(group, orderType, {
      appliedCoupons,
      cartSubtotal,
      storeAddons: cart.storeAddons,
      platformFeeByStore,
      policyConsent,
      siteSettings,
      uid,
      userName,
      userEmail,
      merchantOrderId,
      gatewayOrderId: gatewayOrder.gatewayOrderId,
      transactionId: gatewayOrder.transactionId,
      shippingAddress,
      /*
       * 🛑 Was MISSING until 2026-10-24, and nothing reported it. The snapshot was
       * computed ~490 lines above with a comment explaining why it must be revealed
       * first — and then never passed, so every order settled through the gateway
       * path lost its immutable delivery copy while the COD/UPI path (which calls
       * `createOrderForGroup` and does pass it) kept one.
       *
       * Two consequences, both silent: the invoice address was not frozen at
       * purchase time (Part 14's whole point), and `placeOfSupply` fell through to
       * `buyerState` — so the CGST/SGST-vs-IGST split was decided by the buyer's
       * profile state rather than the address they actually shipped to.
       *
       * Root Cause #39's shape exactly: two create paths, one applies a transform
       * the other does not. Found as an unused-variable warning, which is the only
       * signal a dropped value ever gives.
       */
      deliverySnapshot,
      // For the CGST/SGST vs IGST split. The TOTAL does not depend on it
      // (see createPhonePeGroupOrder), which is what let the pre-payment
      // amount be computed before this address was known.
      buyerState: resolvedAddressPp?.state,
      notes,
      outOfStockPolicy,
      unavailablePaid,
      orderIds,
      emailsToSend,
      couponUsageAccumulator,
      productById: productByIdPaid,
      useAllPoints,
      pointsBudget,
      splitByStore,
    });
  }

  /*
   * Item 1.39 — backlink, same as the COD/manual path. On THIS path it carries
   * extra diagnostic weight: a consent record with a captured payment behind it
   * and no order ids is the 2026-10-21 shape (money taken, no order), so the
   * absence of this link is itself a signal worth being able to query for.
   */
  await attachOrdersToPolicyConsent(policyConsent.consentId, orderIds);

  await flushCouponUsageAccumulator(couponUsageAccumulator, uid);

  // SB-UNI-5 2026-05-13 — bundle-aware batch decrement. We iterate the
  // cumulative `decrements` map (one entry per unique member product) so a
  // bundle's members + any sibling cart line touching the same product
  // collapse into ONE update per product.
  await unitOfWork.runBatch((batch) => {
    for (const [pid, qtyDelta] of expansionPaid.decrements) {
      const product = productByIdPaid.get(pid);
      if (!product) continue;
      const lt = (product.listingType ?? "standard") as ListingType;
      const batchRule = getListingRule(lt);
      unitOfWork.products.updateInBatch(batch, pid, {
        availableQuantity: product.availableQuantity - qtyDelta,
        ...batchRule.stockDecrementExtras(product, qtyDelta),
      } as never);
    }
    unitOfWork.carts.updateInBatch(batch, uid, {
      items: [],
      appliedCoupons: [],
      selectedItemIds: null,
    } as never);
  });

  // outOfStockPolicy: "skip_items" — auto-refund the dropped items' value.
  // PhonePe already captured payment for the FULL cart before this stock
  // check ran, so anything not placed as an order must be given back.
  // AWAITED (not fire-and-forget) — this moves money. On failure the orders
  // themselves are NOT rolled back (they're already validly created and
  // paid); instead the failure is surfaced via order.refundPending + an
  // admin notification, never silently dropped (Rule #8).
  await refundDroppedItemsForPhonePeCheckout({
    unavailablePaid,
    orderIds,
    productByIdPaid,
    phonepeOrderId: merchantOrderId,
  });

  if (emailsToSend.length > 0) {
    Promise.all(emailsToSend.map((e) => sendOrderConfirmationEmail(e))).catch(
      (err: unknown) => serverLogger.error("Order confirmation email error:", err),
    );
  }

  serverLogger.info(
    `verifyAndPlaceGatewayOrderAction: ${orderIds.length} order(s) placed for uid=${uid} — payment ${merchantOrderId}`,
  );

  getAdminRealtimeDb()
    .ref(`${RTDB_PATHS.PAYMENT_EVENTS}/${merchantOrderId}`)
    .update({ status: "success", orderIds, updatedAt: Date.now() })
    .catch((err: unknown) =>
      serverLogger.warn("Payment event RTDB signal failed (non-critical)", { err }),
    );

  return {
    orderIds,
    total,
    itemCount: orderIds.length,
    ...(unavailablePaid.length > 0 ? { unavailableItems: unavailablePaid } : {}),
    ...(droppedCoupons.length > 0 ? { droppedCoupons } : {}),
  };
}
