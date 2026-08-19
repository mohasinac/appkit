import { normalizeError } from "../../../../errors/normalize";
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
import {
  unitOfWork,
  siteSettingsRepository,
  userRepository,
  storeRepository,
  couponsRepository,
  claimedCouponsRepository,
  addressesRepository,
} from "../../../../repositories";
import { calculateGst } from "../../../shared/fees/calculator";
import { computePreOrderDepositAmount } from "../../../shared/checkout/order-math";
import type { SiteSettingsDocument } from "../../../../features/admin/schemas/firestore";
import { failedCheckoutRepository } from "../../../../features/checkout/repository/failed-checkout.repository";
import { sendOrderConfirmationEmail } from "../../../../features/contact/server";
import { splitCartIntoOrderGroups, type OrderType } from "../../../../features/orders/index";
import {
  computeCodHandlingFee,
  type CodHandlingFeeRates,
  computeWhatsAppNotifyFee,
  type WhatsAppNotifyFeeRates,
  computeGiftWrapFee,
  type GiftWrapFeeRates,
  computeShipmentProtectionFee,
  type ShipmentProtectionFeeRates,
} from "../../../shared/fees/calculator";
import {
  getAdminDb,
  getAdminRealtimeDb,
  RTDB_PATHS,
} from "../../../../providers/db-firebase";
import { PRODUCT_COLLECTION, PRODUCT_CODES_SUBCOLLECTION } from "../../../../features/products/schemas/firestore";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import { CART_COLLECTION } from "../../../../features/cart/schemas/index";
import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";
// S-SBUNI-RULES 2026-05-13 — bundle cart-line stock fan-out helpers.
import {
  getCartItemMemberIds,
  getExpandedDecrements,
  bucketCartItemsByStock,
  type StockBucketResult,
} from "./bundle-expansion";
import {
  OrderStatusValues,
  PaymentStatusValues,
  PaymentMethodValues,
  OutOfStockPolicyValues,
} from "../../../../features/orders/schemas/index";
import type { OutOfStockPolicy } from "../../../../features/orders/schemas/index";
import { getDefaultCurrency } from "../../../../core/index";
import {
  verifyPaymentSignatureWithKeys,
  fetchRazorpayOrder,
  paiseToRupees,
} from "../../../../providers/payment-razorpay/index";
import { CHECKOUT_DEFAULT_COMMISSIONS, CHECKOUT_DEFAULT_EMI_SETTINGS, type CheckoutPaymentMethod } from "../../../shared/features/checkout/config";
import { checkEmiEligibility, computeEmiSchedule, type EmiSettings } from "../../../shared/features/emi/schedule";
import type { CartAppliedCoupon } from "../../../../features/cart/schemas/firestore";
import { formatShippingAddress, type CheckoutOrderResult } from "./data";
import { enforceMaxPerUserForCart } from "./prize-bundle-gates";
import type { ListingType } from "../../../../features/products/types/index";
import {
  getListingRule,
  runSyncPreflight,
} from "../../../shared/checkout/rules";
import { cartIsDigitalOnly } from "../../../shared/listing-types/cart-shipping";
import type { FirestoreDocument } from "@mohasinac/appkit";
import { processRefundAction } from "../refunds/actions";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { resolveDisplayedUpiId } from "./upi-resolution";
import { PAYMENT_WINDOW_MS } from "../../../../features/orders/constants/payment-window";
import { isCheckoutValueOtpVerified } from "../../../../features/checkout/actions/checkout-value-otp-actions";

const AUDIT_LOG_FAIL_MSG = "checkout: audit log failed (non-critical)";

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
  if (claimed && opts?.userEmail) {
    const { sendDigitalCodeClaimedEmail } = await import("../../../../features/contact/server");
    sendDigitalCodeClaimedEmail({
      to: opts.userEmail,
      userName: opts.userName ?? "there",
      productTitle: opts.productTitle ?? "your product",
      orderId,
    }).catch((e) => serverLogger.error("claimDigitalCode: email failed", e));
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
  storeOwnerId: string | undefined;
  productLabel: string;
  paid: boolean;
  /** Buyer paid the ₹10 WhatsApp order-updates addon on this order — only this order's buyer-facing sends get the WhatsApp channel. */
  whatsappNotifyAddon: boolean;
}): void {
  const { orderId, buyerUid, buyerName, storeOwnerId, productLabel, paid, whatsappNotifyAddon } = args;
  const buyerNotif = sendNotification({
    userId: buyerUid,
    type: "order_placed",
    priority: "normal",
    title: "Order placed",
    message: `Your order for ${productLabel} has been placed.`,
    relatedId: orderId,
    relatedType: "order",
    actionUrl: `/user/orders/view/${orderId}`,
    orderWhatsappAddonPaid: whatsappNotifyAddon,
  }).catch((err: unknown) =>
    serverLogger.warn("Failed to send buyer order_placed notification", {
      err: err instanceof Error ? err.message : String(err),
      orderId,
    }),
  );
  const sellerNotif = storeOwnerId
    ? sendNotification({
        userId: storeOwnerId,
        type: "order_placed",
        priority: "high",
        title: "New order received",
        message: `${paid ? "New paid order" : "New order"} from ${
 buyerName || "a buyer"
 } for ${productLabel}.`,
        relatedId: orderId,
        relatedType: "order",
        actionUrl: `/store/orders/${orderId}/view`,
      }).catch((err: unknown) =>
        serverLogger.warn("Failed to send seller order_placed notification", {
          err: err instanceof Error ? err.message : String(err),
          orderId,
        }),
      )
    : Promise.resolve();
  void Promise.all([buyerNotif, sellerNotif]);
}

export interface CreateCheckoutOrderInput {
  userId: string;
  userName: string;
  userEmail: string;
  /** Required for physical carts; omitted for digital-code-only carts (no shipping). */
  addressId?: string;
  paymentMethod: CheckoutPaymentMethod;
  /** Required when paymentMethod === "emi" — the buyer's chosen tenure (2–6 months). */
  emiTenureMonths?: number;
  notes?: string;
  excludedProductIds?: string[];
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
  /** Buyer opted into the ₹10 WhatsApp order-updates addon at checkout. Defaults false (unchecked). Only actually charged/honored when siteSettings.commissions.whatsappNotifyFeeEnabled is also true. */
  whatsappNotifyAddon?: boolean;
  /** Buyer opted into gift wrap at checkout. Defaults false (unchecked). Only actually charged/honored when siteSettings.commissions.giftWrapFeeEnabled is also true. */
  giftWrapAddon?: boolean;
  /** Optional gift message, only meaningful when giftWrapAddon is true. */
  giftWrapMessage?: string;
  /** Buyer opted into shipment protection at checkout. Defaults false (unchecked). Only actually charged/honored when siteSettings.commissions.shipmentProtectionFeeEnabled is also true. */
  shipmentProtectionAddon?: boolean;
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

async function resolveShippingCost(
  storeId: string | undefined,
): Promise<{ shippingFee: number; storeOwnerId: string | undefined; storeEmiEnabled: boolean; storeState: string | undefined }> {
  if (!storeId) return { shippingFee: 0, storeOwnerId: undefined, storeEmiEnabled: false, storeState: undefined };
  const store = await storeRepository.findById(storeId);
  const storeOwnerId = store?.ownerId;
  const storeEmiEnabled = store?.emiEnabled === true;
  const storeState = await resolveStoreState(storeId);
  if (!storeOwnerId) return { shippingFee: 0, storeOwnerId: undefined, storeEmiEnabled, storeState };
  const sellerUser = await userRepository.findById(storeOwnerId);
  const shippingConfig = sellerUser?.shippingConfig;
  if (!shippingConfig?.isConfigured) return { shippingFee: 0, storeOwnerId, storeEmiEnabled, storeState };
  return { shippingFee: shippingConfig.customShippingPrice ?? 0, storeOwnerId, storeEmiEnabled, storeState };
}

/** P-8 GST — the seller's registered/pickup state, used to determine intra- vs inter-state tax. */
async function resolveStoreState(storeId: string): Promise<string | undefined> {
  const addresses = await addressesRepository.listByOwner("store", storeId);
  const pickup = addresses.find((a) => a.isDefault) ?? addresses[0];
  return pickup?.state;
}

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
}

type CouponAccumEntry = { couponId: string; code: string; orderIds: string[]; totalDiscount: number };

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

// SB-UNI-5 2026-05-13 — bundle cart-lines use item.price (locked bundle price
// at add-time); regular lines use product.price (current Firestore). Prevents
// stale cart-cached prices from being charged on COD/UPI orders.
function unitPriceFor(item: CartItemDocument, product: ProductDocument | null): number {
  return item.bundleCategorySlug && item.bundleProductIds?.length
    ? item.price
    : (product as ProductDocument).price;
}

interface OrderGroupContext {
  paymentMethod: CheckoutPaymentMethod;
  emiTenureMonths?: number;
  emiSettings: EmiSettings;
  commissions: CodHandlingFeeRates & WhatsAppNotifyFeeRates & GiftWrapFeeRates & ShipmentProtectionFeeRates & { codDepositPercent: number };
  appliedCoupons: CartAppliedCoupon[];
  cartSubtotal: number;
  couponUsageAccumulator: Map<string, CouponAccumEntry>;
  uid: string;
  userName: string;
  userEmail: string;
  /** Buyer opted into the ₹10 WhatsApp order-updates addon at checkout. */
  whatsappNotifyAddon: boolean;
  /** Buyer opted into gift wrap at checkout. */
  giftWrapAddon: boolean;
  giftWrapMessage?: string;
  /** Buyer opted into shipment protection at checkout. */
  shipmentProtectionAddon: boolean;
  shippingAddress?: string;
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
  /** Site-wide UPI VPA fallback (`siteSettings.contact.upiVpa`) — used by `resolveDisplayedUpiId` when a seller has no UPI configured, or the store is admin-owned. */
  siteContactUpiVpa?: string;
}

/**
 * Places one order for one seller-group of the checkout cart — fee math
 * (COD deposit/handling, EMI schedule), coupon apportionment, order-doc
 * creation, digital-code claim, and notification fan-out. Pushes into
 * `ctx.orderIds` / `ctx.emailsToSend` and returns the group's pre-fee total
 * so the caller can accumulate the checkout-wide `total`.
 */
async function createOrderForGroup(
  group: Array<{ item: CartItemDocument; product: ProductDocument }>,
  orderType: OrderType,
  ctx: OrderGroupContext,
): Promise<number> {
  const {
    paymentMethod,
    emiTenureMonths,
    emiSettings,
    commissions,
    appliedCoupons,
    cartSubtotal,
    couponUsageAccumulator,
    uid,
    userName,
    userEmail,
    shippingAddress,
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
    siteContactUpiVpa,
    whatsappNotifyAddon,
    giftWrapAddon,
    giftWrapMessage,
    shipmentProtectionAddon,
  } = ctx;

  const firstItem = group[0].item;
  const firstProduct = group[0].product;
  const groupTotal = group.reduce(
    (sum, { item, product }) => sum + unitPriceFor(item, product) * item.quantity,
    0,
  );

  // S-SBUNI-RULES 2026-05-13 — order-item decoration via rule registry.
  const orderItems = group.map(({ item, product }) => {
    const lt = (product.listingType ?? "standard") as ListingType;
    const itemRule = getListingRule(lt);
    // SB-UNI-5 2026-05-13 — forward bundle identifiers so the order-detail
    // UI can collapse expanded lines back under a "Bundle: <name>" header.
    const bundleFields =
      item.bundleCategorySlug && item.bundleProductIds
        ? {
            bundleCategorySlug: item.bundleCategorySlug,
            bundleProductIds: item.bundleProductIds,
          }
        : {};
    const unitPrice = unitPriceFor(item, product);
    const gstFields =
      product.gstRate != null
        ? { gstRate: product.gstRate, ...(product.hsnCode ? { hsnCode: product.hsnCode } : {}) }
        : {};
    const baseLine = {
      productId: item.productId,
      productTitle: item.productTitle,
      quantity: item.quantity,
      unitPrice,
      totalPrice: unitPrice * item.quantity,
      ...bundleFields,
      ...gstFields,
    };
    return itemRule.decorateOrderItem(baseLine, product);
  });
  const totalQuantity = group.reduce((sum, { item }) => sum + item.quantity, 0);

  const { shippingFee, storeOwnerId, storeEmiEnabled, storeState } = await resolveShippingCost(
    firstItem.storeId,
  );

  // P-8 GST — sum per-line-item tax (each product may carry its own gstRate),
  // then split the group total into a single cgst/sgst/igst breakdown for the
  // order document. Skipped entirely when GST is off or the buyer's state is
  // unknown (digital-only carts have no shipping address).
  let gstBreakdown: { taxableAmount: number; cgst: number; sgst: number; igst: number; gstAmount: number } | undefined;
  if (gstSettings?.enabled && buyerState) {
    const intraState = !!storeState && storeState === buyerState;
    let taxableAmount = 0;
    let gstAmount = 0;
    for (const { item, product } of group) {
      const lineTotal = unitPriceFor(item, product) * item.quantity;
      const rate = product.gstRate ?? 0;
      if (rate > 0) {
        taxableAmount += lineTotal;
        gstAmount += calculateGst(rate, intraState, lineTotal).gstAmount;
      }
    }
    if (taxableAmount > 0) {
      gstBreakdown = intraState
        ? { taxableAmount, cgst: Math.round(gstAmount / 2), sgst: gstAmount - Math.round(gstAmount / 2), igst: 0, gstAmount }
        : { taxableAmount, cgst: 0, sgst: 0, igst: gstAmount, gstAmount };
    }
  }

  const isCodLike = paymentMethod === "cod" || paymentMethod === "upi_manual" || paymentMethod === "cash";
  const depositAmount = !isCodLike
    ? undefined
    : orderType === "preorder"
      ? computePreOrderDepositAmount(group, commissions.codDepositPercent)
      : roundRupees(groupTotal * (commissions.codDepositPercent / 100));
  const codRemainingAmount = isCodLike
    ? roundRupees(groupTotal - (depositAmount ?? 0))
    : undefined;

  let emiSchedule: ReturnType<typeof computeEmiSchedule> | undefined;
  if (paymentMethod === "emi" && emiTenureMonths) {
    const eligibility = checkEmiEligibility(groupTotal, storeEmiEnabled, emiSettings);
    if (!eligibility.eligible) {
      throw new ValidationError(
        `EMI is not available for this order (${eligibility.reason}). Minimum order value per seller is ₹${emiSettings.minOrderValue}.`,
      );
    }
    emiSchedule = computeEmiSchedule(groupTotal, emiTenureMonths, emiSettings);
  }
  // Handling fee charged to the buyer for choosing COD, on top of the order
  // total — not deducted from the deposit/remaining split above.
  const codHandlingFee =
    paymentMethod === "cod" ? computeCodHandlingFee(groupTotal, commissions) : 0;
  const whatsappNotifyFee = computeWhatsAppNotifyFee(whatsappNotifyAddon, commissions);
  const giftWrapFee = computeGiftWrapFee(giftWrapAddon, commissions);
  const shipmentProtectionFee = computeShipmentProtectionFee(groupTotal, shipmentProtectionAddon, commissions);

  let couponDiscount = 0;
  const appliedDiscounts: {
    code: string;
    couponId?: string;
    type: "coupon" | "deal" | "auto";
    discountAmount: number;
    scope?: "admin" | "seller";
    storeId?: string;
  }[] = [];
  const groupCouponCodes = new Set<string>();

  for (const coupon of appliedCoupons) {
    let couponGroupDiscount = 0;
    const isSellerScoped = coupon.scope === "seller" && coupon.storeId;
    if (isSellerScoped) {
      if (coupon.storeId !== firstItem.storeId) continue;
      if (coupon.applicableItemIds?.length) {
        const eligibleTotal = group
          .filter(({ item }) => coupon.applicableItemIds!.includes(item.itemId))
          .reduce((s, { item }) => s + item.price * item.quantity, 0);
        couponGroupDiscount =
          eligibleTotal > 0
            ? Math.min(
                roundRupees((eligibleTotal / groupTotal) * coupon.discountAmount),
                eligibleTotal,
              )
            : 0;
      } else {
        couponGroupDiscount = Math.min(coupon.discountAmount, groupTotal);
      }
    } else {
      if (cartSubtotal > 0) {
        couponGroupDiscount = Math.min(
          roundRupees((groupTotal / cartSubtotal) * coupon.discountAmount),
          groupTotal,
        );
      }
    }

    if (couponGroupDiscount > 0) {
      couponDiscount += couponGroupDiscount;
      appliedDiscounts.push({
        code: coupon.code,
        couponId: coupon.couponId,
        type: "coupon",
        discountAmount: couponGroupDiscount,
        scope: coupon.scope,
        storeId: coupon.storeId,
      });
      if (coupon.couponId) {
        accumulateCouponUsage(couponUsageAccumulator, coupon.code, coupon.couponId, couponGroupDiscount);
        groupCouponCodes.add(coupon.code);
      }
    }
  }

  couponDiscount = Math.min(couponDiscount, groupTotal);
  const orderTotal =
    Math.max(0, groupTotal - couponDiscount) + shippingFee + codHandlingFee + whatsappNotifyFee + giftWrapFee + shipmentProtectionFee + (emiSchedule?.surchargeAmount ?? 0) + (gstBreakdown?.gstAmount ?? 0);

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
  // proof step — never cod (paid on delivery), razorpay (paid before order
  // creation), or admin_bypass (already marked paid above).
  const hasPaymentWindow =
    !adminBypass &&
    (paymentMethod === PaymentMethodValues.UPI_MANUAL ||
      paymentMethod === PaymentMethodValues.CASH ||
      paymentMethod === PaymentMethodValues.EMI);
  const paymentDeadline = hasPaymentWindow
    ? new Date(Date.now() + PAYMENT_WINDOW_MS)
    : undefined;
  const displayedUpiId = hasPaymentWindow
    ? await resolveDisplayedUpiId(firstItem.storeId, siteContactUpiVpa)
    : undefined;

  const order = await unitOfWork.orders.create({
    productId: firstItem.productId,
    productTitle: firstItem.productTitle,
    userId: uid,
    userName,
    userEmail,
    quantity: totalQuantity,
    unitPrice: unitPriceFor(firstItem, firstProduct),
    totalPrice: orderTotal,
    currency: firstItem.currency ?? getDefaultCurrency(),
    storeId: firstItem.storeId || undefined,
    storeName: firstItem.storeName || undefined,
    items: orderItems,
    orderType,
    offerId: firstItem.offerId ?? undefined,
    status: adminBypass ? OrderStatusValues.PROCESSING : OrderStatusValues.PENDING,
    paymentStatus: adminBypass ? PaymentStatusValues.PAID : PaymentStatusValues.PENDING,
    paymentMethod: adminBypass ? PaymentMethodValues.ADMIN_BYPASS : paymentMethod,
    paymentId: adminBatchId,
    paymentDeadline,
    displayedUpiId,
    adminBypassBy: adminBypassBy,
    shippingAddress,
    notes,
    shippingFee: shippingFee > 0 ? shippingFee : undefined,
    depositAmount: adminBypass ? undefined : depositAmount,
    codRemainingAmount: adminBypass ? undefined : codRemainingAmount,
    codHandlingFee: !adminBypass && codHandlingFee > 0 ? codHandlingFee : undefined,
    whatsappNotifyAddon: !adminBypass && whatsappNotifyFee > 0 ? true : undefined,
    whatsappNotifyFee: !adminBypass && whatsappNotifyFee > 0 ? whatsappNotifyFee : undefined,
    giftWrapAddon: !adminBypass && giftWrapFee > 0 ? true : undefined,
    giftWrapFee: !adminBypass && giftWrapFee > 0 ? giftWrapFee : undefined,
    giftWrapMessage: !adminBypass && giftWrapFee > 0 ? giftWrapMessage?.slice(0, 500) : undefined,
    shipmentProtectionAddon: !adminBypass && shipmentProtectionFee > 0 ? true : undefined,
    shipmentProtectionFee: !adminBypass && shipmentProtectionFee > 0 ? shipmentProtectionFee : undefined,
    taxableAmount: gstBreakdown?.taxableAmount,
    gstAmount: gstBreakdown?.gstAmount,
    cgst: gstBreakdown?.cgst || undefined,
    sgst: gstBreakdown?.sgst || undefined,
    igst: gstBreakdown?.igst || undefined,
    emiEnabled: !adminBypass && !!emiSchedule ? true : undefined,
    emiTenureMonths: !adminBypass && emiSchedule ? emiTenureMonths : undefined,
    emiTokenAmount: !adminBypass ? emiSchedule?.tokenAmount : undefined,
    emiSurchargeAmount: !adminBypass ? emiSchedule?.surchargeAmount : undefined,
    emiInstallments: !adminBypass && emiSchedule
      ? emiSchedule.installments.map((i) => ({ index: i.index, dueDate: i.dueDate, amount: i.amount, status: "pending" as const }))
      : undefined,
    emiRemainingBalance: !adminBypass ? emiSchedule?.remainingBalance : undefined,
    emiComplete: !adminBypass && emiSchedule ? false : undefined,
    couponCode: appliedDiscounts[0]?.code,
    couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
    appliedDiscounts: appliedDiscounts.length > 0 ? appliedDiscounts : undefined,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    outOfStockPolicy,
    droppedItems: droppedItems.length > 0 ? droppedItems : undefined,
    ...extraOrderFields,
  });

  orderIds.push(order.id);

  // SB-UNI-N — claim a digital code for digital-code orders (fire-and-forget,
  // order is already persisted so a claim failure is logged, not thrown).
  if ((group[0]?.product?.listingType ?? "standard") === "digital-code") {
    claimDigitalCodeForOrder(getAdminDb(), firstItem.productId, order.id, uid, {
      userEmail: userEmail || undefined,
      userName,
      productTitle: firstItem.productTitle,
    }).catch((e) => serverLogger.error("claimDigitalCode", e));
  }

  for (const code of groupCouponCodes) {
    const entry = couponUsageAccumulator.get(code);
    if (entry) entry.orderIds.push(order.id);
  }

  if (userEmail) {
    emailsToSend.push({
      to: userEmail,
      userName,
      orderId: order.id,
      productTitle: orderItems.length > 1 ? `${orderItems.length} items` : firstItem.productTitle,
      quantity: totalQuantity,
      totalPrice: orderTotal,
      currency: firstItem.currency ?? getDefaultCurrency(),
      shippingAddress,
      paymentMethod,
      items: orderItems,
    });
  }

  emitOrderPlacedNotifications({
    orderId: order.id,
    buyerUid: uid,
    buyerName: userName,
    storeOwnerId,
    productLabel:
      orderItems.length > 1 ? `${orderItems.length} items` : firstItem.productTitle,
    paid: adminBypass,
    whatsappNotifyAddon: !adminBypass && whatsappNotifyFee > 0,
  });

  return groupTotal;
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
    paymentMethod,
    emiTenureMonths,
    notes,
    excludedProductIds = [],
    adminBypass = false,
    adminBypassBy,
    outOfStockPolicy = OutOfStockPolicyValues.SKIP_ITEMS,
    whatsappNotifyAddon = false,
    giftWrapAddon = false,
    giftWrapMessage,
    shipmentProtectionAddon = false,
  } = input;

  const siteSettings = await siteSettingsRepository.getSingleton();
  const commissions = siteSettings?.commissions ?? CHECKOUT_DEFAULT_COMMISSIONS;
  const emiSettings = siteSettings?.emi ?? CHECKOUT_DEFAULT_EMI_SETTINGS;

  if (paymentMethod === "emi") {
    if (!emiTenureMonths || !emiSettings.tenureOptions.includes(emiTenureMonths)) {
      throw new ValidationError(
        `emiTenureMonths must be one of: ${emiSettings.tenureOptions.join(", ")}`,
      );
    }
  }

  // W1-43 — enforce COD toggle.
  if (
    !adminBypass &&
    paymentMethod === "cod" &&
    siteSettings?.payment?.codEnabled === false
  ) {
    throw new ValidationError(
      "Cash on Delivery is not currently accepted. Please choose another payment method.",
    );
  }

  // P-1 — enforce UPI/cash manual payment toggle.
  if (
    !adminBypass &&
    (paymentMethod === "upi_manual" || paymentMethod === "cash") &&
    siteSettings?.payment?.upiManualEnabled === false
  ) {
    throw new ValidationError(
      "Manual UPI / cash payment is not currently accepted. Please choose another payment method.",
    );
  }

  const cart = await unitOfWork.carts.getOrCreate(uid);
  if (!cart.items || cart.items.length === 0) {
    throw new ValidationError(ERROR_MESSAGES.CHECKOUT.CART_EMPTY);
  }

  const excludedSet = new Set(excludedProductIds);
  const selectedSet = cart.selectedItemIds?.length
    ? new Set(cart.selectedItemIds)
    : null;
  const cartItems = cart.items.filter(
    (item) =>
      !excludedSet.has(item.productId) &&
      (!selectedSet || selectedSet.has(item.itemId)),
  );
  if (cartItems.length === 0) {
    throw new ValidationError(ERROR_MESSAGES.CHECKOUT.CART_EMPTY);
  }

  // Tier PP — OTP gate for high-value checkouts. Evaluated against the
  // WHOLE checkout batch's total (not each resulting per-seller order),
  // otherwise a buyer could dodge it by splitting a big cart across
  // sellers. Skipped for COD (physical hand-off at the door is its own
  // verification) and admin-bypass checkouts.
  const otpThreshold = siteSettings?.payment?.otpCheckoutThreshold;
  if (!adminBypass && paymentMethod !== "cod" && typeof otpThreshold === "number" && otpThreshold > 0) {
    const cartTotalForOtpCheck = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    if (cartTotalForOtpCheck >= otpThreshold) {
      const verified = await isCheckoutValueOtpVerified(uid);
      if (!verified) {
        throw new ApiError(403, "CHECKOUT_VALUE_OTP_REQUIRED");
      }
    }
  }

  const isDigitalCart = cartIsDigitalOnly(cartItems);

  let shippingAddress: string | undefined;
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
        // quota) via rule registry. Bundles skip — they bypass the cart path.
        if (!item.bundleProductIds?.length) {
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
        const orderedProductIds = new Set(availableItems.map((a) => a.item.productId));
        const remainingCartItems = cart.items.filter((ci) => !orderedProductIds.has(ci.productId));
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

      return { available: availableItems, unavailable: unavailableItems };
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
  const { available, unavailable } = stockResult;

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

  const appliedCoupons = cart.appliedCoupons ?? [];
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
      s + g.reduce((gs, { item, product }) => gs + unitPriceFor(item, product) * item.quantity, 0),
    0,
  );

  const couponUsageAccumulator = new Map<string, CouponAccumEntry>();

  const groupCtx: OrderGroupContext = {
    paymentMethod,
    emiTenureMonths,
    emiSettings,
    commissions,
    appliedCoupons,
    cartSubtotal,
    couponUsageAccumulator,
    uid,
    userName,
    userEmail,
    shippingAddress,
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
    siteContactUpiVpa: siteSettings?.contact?.upiVpa,
    whatsappNotifyAddon,
    giftWrapAddon,
    giftWrapMessage,
    shipmentProtectionAddon,
  };
  for (const { items: group, orderType } of orderGroups) {
    total += await createOrderForGroup(group, orderType, groupCtx);
  }

  await flushCouponUsageAccumulator(couponUsageAccumulator, uid);
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
// Razorpay-confirmed checkout: signature verify + amount re-check + atomic
// stock decrement + cart clear + multi-order create + notifications.
// ---------------------------------------------------------------------------

export interface VerifyAndPlaceRazorpayOrderInput {
  userId: string;
  userName: string;
  userEmail: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  /** Required for physical carts; omitted for digital-code-only carts. */
  addressId?: string;
  notes?: string;
  /**
   * Buyer's choice for what to do when a cart item is unavailable at
   * checkout time. Defaults to "cancel_order" — matches this path's
   * historical (only) behavior for any caller/old-client that omits the
   * field, since "skip_items" partial fulfillment has no prior precedent
   * on the Razorpay path.
   */
  outOfStockPolicy?: OutOfStockPolicy;
  /** Buyer opted into the ₹10 WhatsApp order-updates addon at checkout — must match the value sent to /api/payment/create-order so the pre-charged amount and the placed order agree. */
  whatsappNotifyAddon?: boolean;
  /** Buyer opted into gift wrap at checkout — must match the value sent to /api/payment/create-order. */
  giftWrapAddon?: boolean;
  giftWrapMessage?: string;
  /** Buyer opted into shipment protection at checkout — must match the value sent to /api/payment/create-order. */
  shipmentProtectionAddon?: boolean;
}

/**
 * Place order(s) from the user's cart after a Razorpay payment is verified.
 * Mirrors the existing /api/payment/verify route handler.
 *
 * Consumers must authenticate the user before calling. The action performs:
 *   1. HMAC signature verification (rejects forged callbacks)
 *   2. Cart re-validation against current product prices/stock
 *   3. Amount cross-check against the Razorpay order record
 *   4. Atomic stock decrement + cart clear via unitOfWork batch
 *   5. Multi-coupon pro-rating per order group
 *   6. order_placed notifications (buyer + seller)
 *   7. Confirmation email + RTDB success signal (both fire-and-forget)
 */
/**
 * Auto-refund the value of items dropped from a Razorpay checkout under the
 * "skip_items" out-of-stock policy. Razorpay captures payment for the FULL
 * cart before the stock check runs, so anything not placed as an order must
 * be given back. Extracted from `verifyAndPlaceRazorpayOrderAction` — same
 * behavior, kept as a named step so the parent function stays readable.
 *
 * Awaited by the caller (this moves money, never fire-and-forget). On
 * failure the orders themselves are NOT rolled back (already validly
 * created and paid); the failure is surfaced via `order.refundPending` + an
 * admin notification fan-out, never silently dropped (Rule #8).
 */
async function refundDroppedItemsForRazorpayCheckout(input: {
  unavailablePaid: StockBucketResult["unavailable"];
  orderIds: string[];
  productByIdPaid: Map<string, ProductDocument>;
  razorpayPaymentId: string;
}): Promise<void> {
  const { unavailablePaid, orderIds, productByIdPaid, razorpayPaymentId } = input;
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
    // order (Razorpay refunds are keyed by paymentId, not orderId; the
    // FIRST order created in this batch is used as the refund's book-
    // keeping anchor).
    const refundAmount = primaryOrder
      ? Math.min(droppedValue, primaryOrder.totalPrice)
      : droppedValue;
    const refundResult = await processRefundAction({
      orderId: primaryOrderId,
      type: "partial",
      amount: refundAmount,
      reason: `Automatic refund — ${unavailablePaid.length} item(s) unavailable at checkout: ${unavailablePaid.map((u) => u.productTitle).join(", ")}`,
      method: "razorpay",
      razorpayPaymentId,
      confirmIrrevocable: true,
      refundedBy: "system:checkout-auto-refund",
    });
    if (!refundResult.ok) {
      throw new Error(refundResult.error ?? "Automatic refund failed");
    }
  } catch (refundErr) {
    void normalizeError(refundErr);
    serverLogger.warn(
      "verifyAndPlaceRazorpayOrderAction: automatic partial refund for dropped items failed — flagging for manual follow-up",
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
          "verifyAndPlaceRazorpayOrderAction: failed to flag refundPending after auto-refund failure",
          { orderId: primaryOrderId, err: updErr instanceof Error ? updErr.message : String(updErr) },
        );
      });
    // Best-effort admin fan-out — mirrors onScamReportCreate's employee
    // notification pattern. Never allowed to throw past this point.
    try {
      const admins = await userRepository.list({ filters: "role==admin", page: 1, pageSize: 100 });
      await Promise.all(
        admins.items
          .filter((a) => !!a.id)
          .map((admin) =>
            sendNotification({
              userId: admin.id!,
              type: "system",
              priority: "high",
              title: "Automatic refund failed",
              message: `Automatic refund failed for order ${primaryOrderId} (${unavailablePaid.length} unavailable item(s)) — manual refund required.`,
              relatedId: primaryOrderId,
              relatedType: "order",
              userEmail: admin.email ?? undefined,
              userPhone: admin.phoneNumber ?? undefined,
            }).catch((notifErr: unknown) =>
              serverLogger.error("Failed to notify admin of failed auto-refund (non-fatal)", notifErr),
            ),
          ),
      );
    } catch (notifyErr) {
      void normalizeError(notifyErr);
      serverLogger.error(
        "verifyAndPlaceRazorpayOrderAction: failed to query admins for failed auto-refund notification",
        { orderId: primaryOrderId },
      );
    }
  }
}

/**
 * Places one order for one seller-group within `verifyAndPlaceRazorpayOrderAction`
 * — mirrors `createOrderForGroup`'s role on the COD/cash/EMI path (same
 * per-group fee/coupon/order-doc/notification shape), extracted into its own
 * function purely to keep the parent function under the LARGE_COMPONENT
 * audit threshold (`scripts/audit-code-quality.mjs`). No behavior change
 * from the inline version this replaced.
 */
async function createRazorpayGroupOrder(
  group: Array<{ item: CartItemDocument; product: ProductDocument | null }>,
  orderType: OrderType,
  ctx: {
    appliedCoupons: CartAppliedCoupon[];
    cartSubtotal: number;
    platformFeePercent: number;
    gstPercent: number;
    whatsappNotifyFee: number;
    giftWrapFee: number;
    giftWrapMessage?: string;
    shipmentProtectionAddon: boolean;
    siteSettings: Awaited<ReturnType<typeof siteSettingsRepository.getSingleton>> | null;
    uid: string;
    userName: string;
    userEmail: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    shippingAddress?: string;
    notes?: string;
    outOfStockPolicy: OutOfStockPolicy;
    unavailablePaid: StockBucketResult["unavailable"];
    orderIds: string[];
    emailsToSend: Parameters<typeof sendOrderConfirmationEmail>[0][];
  },
): Promise<number> {
  const {
    appliedCoupons,
    cartSubtotal,
    platformFeePercent,
    gstPercent,
    whatsappNotifyFee,
    giftWrapFee,
    giftWrapMessage,
    shipmentProtectionAddon,
    siteSettings,
    uid,
    userName,
    userEmail,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    shippingAddress,
    notes,
    outOfStockPolicy,
    unavailablePaid,
    orderIds,
    emailsToSend,
  } = ctx;

  // SB-UNI-5 2026-05-13 — bundle cart-lines use item.price (locked bundle
  // price); regular lines use product.price. The helper keeps the math
  // local to this block.
  const unitPriceFor = (item: CartItemDocument, product: ProductDocument | null) =>
    item.bundleCategorySlug && item.bundleProductIds?.length
      ? item.price
      : (product as ProductDocument).price;

  const firstItem = group[0].item;
  const groupTotal = group.reduce(
    (sum, { item, product }) => sum + unitPriceFor(item, product) * item.quantity,
    0,
  );

  // Reuses the same store/seller lookup as the COD/UPI path above instead
  // of re-implementing it inline — was two sequential findById calls per
  // seller group here, duplicated from resolveShippingCost.
  const { shippingFee, storeOwnerId } = await resolveShippingCost(firstItem.storeId);

  let couponDiscount = 0;
  const appliedDiscounts: {
    code: string;
    couponId?: string;
    type: "coupon" | "deal" | "auto";
    discountAmount: number;
    scope?: "admin" | "seller";
    storeId?: string;
  }[] = [];

  for (const coupon of appliedCoupons) {
    let couponGroupDiscount = 0;
    const isSellerScoped = coupon.scope === "seller" && coupon.storeId;
    if (isSellerScoped) {
      if (coupon.storeId !== firstItem.storeId) continue;
      if (coupon.applicableItemIds?.length) {
        const eligibleTotal = group
          .filter(({ item }) => coupon.applicableItemIds!.includes(item.itemId))
          .reduce((s, { item, product }) => s + unitPriceFor(item, product) * item.quantity, 0);
        couponGroupDiscount =
          eligibleTotal > 0
            ? Math.min(
                roundRupees((eligibleTotal / groupTotal) * coupon.discountAmount),
                eligibleTotal,
              )
            : 0;
      } else {
        couponGroupDiscount = Math.min(coupon.discountAmount, groupTotal);
      }
    } else if (cartSubtotal > 0) {
      couponGroupDiscount = Math.min(
        roundRupees((groupTotal / cartSubtotal) * coupon.discountAmount),
        groupTotal,
      );
    }

    if (couponGroupDiscount > 0) {
      couponDiscount += couponGroupDiscount;
      appliedDiscounts.push({
        code: coupon.code,
        couponId: coupon.couponId,
        type: "coupon",
        discountAmount: couponGroupDiscount,
        scope: coupon.scope,
        storeId: coupon.storeId,
      });
    }
  }

  couponDiscount = Math.min(couponDiscount, groupTotal);
  const rawPlatformFee = roundRupees(groupTotal * (platformFeePercent / 100));
  const gstOnFee = roundRupees(rawPlatformFee * (gstPercent / 100));
  const platformFee = rawPlatformFee + gstOnFee;
  const shipmentProtectionFee = computeShipmentProtectionFee(
    groupTotal,
    shipmentProtectionAddon,
    siteSettings?.commissions ?? CHECKOUT_DEFAULT_COMMISSIONS,
  );
  const orderTotal = Math.max(0, groupTotal - couponDiscount) + shippingFee + whatsappNotifyFee + giftWrapFee + shipmentProtectionFee;
  // P-8 GST — deliberately NOT wired into this Razorpay-verify path. The
  // amount-mismatch check above (expectedPaymentAmountRs) compares against
  // what the buyer already paid via the Razorpay order created earlier in
  // the flow; adding product GST here without also adding it to that
  // upstream pre-payment amount calculation would either fail the mismatch
  // check or silently under/over-charge. Wiring GST through the full
  // Razorpay create→verify round-trip is separate follow-up work, tracked
  // alongside P-13 (Razorpay is disabled by default today, so this order
  // type doesn't currently carry a GST breakdown).

  // S-SBUNI-RULES 2026-05-13 — order-item decoration via rule registry.
  const orderItems = group.map(({ item, product }) => {
    const lt = (product?.listingType ?? "standard") as ListingType;
    const itemRule = getListingRule(lt);
    // SB-UNI-5 2026-05-13 — bundle cart-lines surface the locked
    // bundlePrice (item.price), not the representative member's
    // product.price. Stock decrement still runs per member elsewhere.
    const isBundle = Boolean(
      item.bundleCategorySlug && item.bundleProductIds?.length,
    );
    const unitPrice = isBundle ? item.price : product!.price;
    const bundleFields = isBundle
      ? {
          bundleCategorySlug: item.bundleCategorySlug as string,
          bundleProductIds: item.bundleProductIds as string[],
        }
      : {};
    const baseLine = {
      productId: item.productId,
      productTitle: item.productTitle,
      quantity: item.quantity,
      unitPrice,
      totalPrice: unitPrice * item.quantity,
      ...bundleFields,
    };
    return itemRule.decorateOrderItem(baseLine, product!);
  });
  const totalQuantity = group.reduce((sum, { item }) => sum + item.quantity, 0);

  const imageUrls = [
    ...new Set(
      group
        .map(({ product }) => product?.mainImage)
        .filter((url): url is string => typeof url === "string" && url.length > 0),
    ),
  ];

  // S-SBUNI-RULES 2026-05-13 — order-doc decoration via rule registry.
  const lt0Rzp = (group[0].product?.listingType ?? "standard") as ListingType;
  const groupRuleRzp = getListingRule(lt0Rzp);
  const extraOrderFields = {
    ...groupRuleRzp.decorateOrderDoc(group[0].item, group[0].product!),
  };

  const order = await unitOfWork.orders.create({
    productId: firstItem.productId,
    productTitle: firstItem.productTitle,
    userId: uid,
    userName,
    userEmail,
    quantity: totalQuantity,
    unitPrice: group[0].product!.price,
    totalPrice: orderTotal,
    currency: firstItem.currency ?? getDefaultCurrency(),
    storeId: firstItem.storeId || undefined,
    storeName: firstItem.storeName || undefined,
    items: orderItems,
    orderType,
    offerId: firstItem.offerId ?? undefined,
    status: OrderStatusValues.CONFIRMED,
    paymentStatus: PaymentStatusValues.PAID,
    paymentMethod: PaymentMethodValues.ONLINE,
    paymentId: razorpay_payment_id,
    paymentRecord: {
      method: "razorpay",
      transactionId: razorpay_payment_id,
      amount: orderTotal,
      paidAt: new Date(),
      verifiedBy: "razorpay-webhook",
      verificationMethod: "webhook",
      gatewayRef: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      },
    },
    shippingAddress,
    notes,
    platformFee,
    shippingFee: shippingFee > 0 ? shippingFee : undefined,
    whatsappNotifyAddon: whatsappNotifyFee > 0 ? true : undefined,
    whatsappNotifyFee: whatsappNotifyFee > 0 ? whatsappNotifyFee : undefined,
    giftWrapAddon: giftWrapFee > 0 ? true : undefined,
    giftWrapFee: giftWrapFee > 0 ? giftWrapFee : undefined,
    giftWrapMessage: giftWrapFee > 0 ? giftWrapMessage?.slice(0, 500) : undefined,
    shipmentProtectionAddon: shipmentProtectionFee > 0 ? true : undefined,
    shipmentProtectionFee: shipmentProtectionFee > 0 ? shipmentProtectionFee : undefined,
    couponCode: appliedDiscounts[0]?.code,
    couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
    appliedDiscounts: appliedDiscounts.length > 0 ? appliedDiscounts : undefined,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    outOfStockPolicy,
    droppedItems: unavailablePaid.length > 0 ? unavailablePaid : undefined,
    ...extraOrderFields,
  } as never);

  orderIds.push(order.id);

  // SB-UNI-N — claim a digital code for digital-code orders (fire-and-forget,
  // order is already persisted so a claim failure is logged, not thrown).
  if ((group[0]?.product?.listingType ?? "standard") === "digital-code") {
    claimDigitalCodeForOrder(getAdminDb(), firstItem.productId, order.id, uid, {
      userEmail: userEmail || undefined,
      userName,
      productTitle: firstItem.productTitle,
    }).catch((e) => serverLogger.error("claimDigitalCode", e));
  }

  if (userEmail) {
    emailsToSend.push({
      to: userEmail,
      userName,
      orderId: order.id,
      productTitle:
        orderItems.length > 1 ? `${orderItems.length} items` : firstItem.productTitle,
      quantity: totalQuantity,
      totalPrice: orderTotal,
      currency: firstItem.currency ?? getDefaultCurrency(),
      shippingAddress,
      paymentMethod: PaymentMethodValues.ONLINE,
      items: orderItems,
    });
  }

  emitOrderPlacedNotifications({
    orderId: order.id,
    buyerUid: uid,
    buyerName: userName,
    storeOwnerId,
    productLabel:
      orderItems.length > 1 ? `${orderItems.length} items` : firstItem.productTitle,
    paid: true,
    whatsappNotifyAddon: whatsappNotifyFee > 0,
  });

  return orderTotal;
}

export async function verifyAndPlaceRazorpayOrderAction(
  input: VerifyAndPlaceRazorpayOrderInput,
): Promise<CheckoutOrderResult> {
  const {
    userId: uid,
    userName,
    userEmail,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    addressId,
    notes,
    outOfStockPolicy = OutOfStockPolicyValues.CANCEL_ORDER,
    whatsappNotifyAddon = false,
    giftWrapAddon = false,
    giftWrapMessage,
    shipmentProtectionAddon = false,
  } = input;

  const siteSettings = await siteSettingsRepository.getSingleton();
  const platformFeePercent = siteSettings?.commissions?.platformFeePercent ?? 5;
  const gstPercent = siteSettings?.commissions?.gstPercent ?? 18;
  const whatsappNotifyFee = computeWhatsAppNotifyFee(
    whatsappNotifyAddon,
    siteSettings?.commissions ?? CHECKOUT_DEFAULT_COMMISSIONS,
  );
  const giftWrapFee = computeGiftWrapFee(
    giftWrapAddon,
    siteSettings?.commissions ?? CHECKOUT_DEFAULT_COMMISSIONS,
  );

  const isValid = await verifyPaymentSignatureWithKeys({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });
  if (!isValid) {
    serverLogger.warn(`Payment signature verification failed for user ${uid}`);
    failedCheckoutRepository
      .logPayment(uid, "signature_mismatch", "HMAC signature invalid", {
        gatewayOrderId: razorpay_order_id,
        gatewayPaymentId: razorpay_payment_id,
        addressId,
      })
      .catch((logErr: unknown) => { void normalizeError(logErr); serverLogger.warn(AUDIT_LOG_FAIL_MSG, { error: logErr instanceof Error ? logErr.message : String(logErr) }); });
    throw new ValidationError(ERROR_MESSAGES.CHECKOUT.PAYMENT_FAILED);
  }

  const cart = await unitOfWork.carts.getOrCreate(uid);
  if (!cart.items || cart.items.length === 0) {
    throw new ValidationError(ERROR_MESSAGES.CHECKOUT.CART_EMPTY);
  }

  const isDigitalCartRazorpay = cartIsDigitalOnly(cart.items);

  let shippingAddress: string | undefined;
  let resolvedAddressRzp: import("../../../../features/addresses/schemas/firestore").AddressDocument | null = null;
  if (!isDigitalCartRazorpay) {
    if (!addressId) {
      throw new NotFoundError(ERROR_MESSAGES.CHECKOUT.ADDRESS_REQUIRED);
    }
    const addressDoc = await unitOfWork.addresses.findById(addressId);
    resolvedAddressRzp =
      addressDoc && addressDoc.ownerType === "user" && addressDoc.ownerId === uid
        ? addressDoc
        : null;
    if (!resolvedAddressRzp) {
      throw new NotFoundError(ERROR_MESSAGES.CHECKOUT.ADDRESS_REQUIRED);
    }
    shippingAddress = formatShippingAddress(resolvedAddressRzp);
  }

  // SB-UNI-5 2026-05-13 — bundle-aware product fetch + validation. Each
  // cart line gets paired with a "representative" product (first member id
  // for bundles, productId for regular items). The full bundle-member
  // decrement runs against `expansionPaid.decrements` lower down.
  const expansionPaid = getExpandedDecrements(cart.items);
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
  const productChecks = cart.items.map((item) => {
    const [firstMember] = getCartItemMemberIds(item);
    const product = productByIdPaid.get(firstMember) ?? null;
    return { item, product };
  });

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
  // Bundle items bypass the cart flow so skip the prize-pool cap.
  const preflightPairs = productChecks.filter(
    (p): p is { item: CartItemDocument; product: ProductDocument } =>
      p.product !== null && p.product !== undefined && !p.item.bundleProductIds?.length,
  );
  // This whole action is the Razorpay path — paymentMethod is always "online".
  runSyncPreflight(preflightPairs, "online");

  // SB-UNI-O 2026-05-15 — Live-item jurisdiction guard.
  if (!isDigitalCartRazorpay && resolvedAddressRzp) {
    assertLiveJurisdiction(cart.items, productByIdPaid, resolvedAddressRzp.state);
  }

  // SB-UNI-5 — validate every required member product across the cart with
  // cumulative decrement awareness (two bundles sharing a member must NOT
  // both succeed unless the product has enough stock for the sum).
  //
  // Out-of-stock policy: unlike the COD/UPI path, Razorpay payment has
  // ALREADY been captured for the full cart by the time this runs — so
  // "skip_items" here means placing orders for the available items only and
  // auto-refunding the dropped items' value (below), not skipping payment.
  const bucketedPaid = bucketCartItemsByStock(
    cart.items,
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
            gatewayOrderId: razorpay_order_id,
            gatewayPaymentId: razorpay_payment_id,
            addressId,
          },
        )
        .catch((err: unknown) => { void normalizeError(err); serverLogger.warn(AUDIT_LOG_FAIL_MSG, { error: err instanceof Error ? err.message : String(err) }); });
    }
  }

  // outOfStockPolicy: "cancel_order" (also the default for old clients that
  // omit the field) — reject the whole checkout batch, exactly like every
  // Razorpay checkout behaved before this policy existed.
  if (outOfStockPolicy === OutOfStockPolicyValues.CANCEL_ORDER && unavailablePaid.length > 0) {
    throw new ValidationError(ERROR_MESSAGES.CHECKOUT.INSUFFICIENT_STOCK);
  }
  // Mirrors the COD/UPI path's all-unavailable guard — regardless of policy,
  // there is nothing to place an order for.
  if (bucketedPaid.available.length === 0) {
    throw new ValidationError(ERROR_MESSAGES.CHECKOUT.INSUFFICIENT_STOCK);
  }

  {
    // SB-UNI-5 2026-05-13 — bundle cart-lines use item.price (locked
    // bundlePrice) instead of the representative member's product.price.
    const cartSubtotalRs = productChecks.reduce((sum, { item, product }) => {
      const isBundle = Boolean(
        item.bundleCategorySlug && item.bundleProductIds?.length,
      );
      const unit = isBundle ? item.price : product!.price;
      return sum + unit * item.quantity;
    }, 0);
    const expectedPlatformFee =
      roundRupees(cartSubtotalRs * (platformFeePercent / 100));
    const expectedGstOnFee = roundRupees(expectedPlatformFee * (gstPercent / 100));
    const expectedPaymentAmountRs = cartSubtotalRs + expectedPlatformFee + expectedGstOnFee;
    const rzpOrderRecord = await fetchRazorpayOrder(razorpay_order_id);
    const paidAmountRs = paiseToRupees(rzpOrderRecord.amount);
    if (paidAmountRs < expectedPaymentAmountRs - 1) {
      serverLogger.warn(
        `Payment amount mismatch for user ${uid}: paid ₹${paidAmountRs}, expected ≥ ₹${expectedPaymentAmountRs}`,
      );
      failedCheckoutRepository
        .logPayment(
          uid,
          "amount_mismatch",
          `Paid ₹${paidAmountRs}, expected ≥ ₹${expectedPaymentAmountRs}`,
          {
            gatewayOrderId: razorpay_order_id,
            gatewayPaymentId: razorpay_payment_id,
            amountRs: paidAmountRs,
            addressId,
          },
        )
        .catch((err: unknown) => { void normalizeError(err); serverLogger.warn(AUDIT_LOG_FAIL_MSG, { error: err instanceof Error ? err.message : String(err) }); });
      throw new ValidationError(ERROR_MESSAGES.CHECKOUT.PAYMENT_FAILED);
    }
  }

  const appliedCoupons = cart.appliedCoupons ?? [];
  // "skip_items" (or an all-available cart under any policy) — build order
  // groups from the available bucket only. Dropped items are never ordered;
  // their value is refunded below since Razorpay already captured payment
  // for the full cart before this stock check ran.
  const orderGroups = splitCartIntoOrderGroups(bucketedPaid.available);

  const orderIds: string[] = [];
  let total = 0;
  const emailsToSend: Parameters<typeof sendOrderConfirmationEmail>[0][] = [];

  // SB-UNI-5 2026-05-13 — bundle cart-lines use item.price (locked bundle
  // price); regular lines use product.price. The helper keeps the math
  // local to this block.
  const unitPriceFor = (item: CartItemDocument, product: ProductDocument | null) =>
    item.bundleCategorySlug && item.bundleProductIds?.length
      ? item.price
      : (product as ProductDocument).price;
  const cartSubtotal = orderGroups.reduce(
    (s, { items: g }) =>
      s +
      g.reduce(
        (gs, { item, product }) => gs + unitPriceFor(item, product) * item.quantity,
        0,
      ),
    0,
  );

  for (const { items: group, orderType } of orderGroups) {
    total += await createRazorpayGroupOrder(group, orderType, {
      appliedCoupons,
      cartSubtotal,
      platformFeePercent,
      gstPercent,
      whatsappNotifyFee,
      giftWrapFee,
      giftWrapMessage,
      shipmentProtectionAddon,
      siteSettings,
      uid,
      userName,
      userEmail,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      shippingAddress,
      notes,
      outOfStockPolicy,
      unavailablePaid,
      orderIds,
      emailsToSend,
    });
  }

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
  // Razorpay already captured payment for the FULL cart before this stock
  // check ran, so anything not placed as an order must be given back.
  // AWAITED (not fire-and-forget) — this moves money. On failure the orders
  // themselves are NOT rolled back (they're already validly created and
  // paid); instead the failure is surfaced via order.refundPending + an
  // admin notification, never silently dropped (Rule #8).
  await refundDroppedItemsForRazorpayCheckout({
    unavailablePaid,
    orderIds,
    productByIdPaid,
    razorpayPaymentId: razorpay_payment_id,
  });

  if (emailsToSend.length > 0) {
    Promise.all(emailsToSend.map((e) => sendOrderConfirmationEmail(e))).catch(
      (err: unknown) => serverLogger.error("Order confirmation email error:", err),
    );
  }

  serverLogger.info(
    `verifyAndPlaceRazorpayOrderAction: ${orderIds.length} order(s) placed for uid=${uid} — payment ${razorpay_payment_id}`,
  );

  getAdminRealtimeDb()
    .ref(`${RTDB_PATHS.PAYMENT_EVENTS}/${razorpay_order_id}`)
    .update({ status: "success", orderIds, updatedAt: Date.now() })
    .catch((err: unknown) =>
      serverLogger.warn("Payment event RTDB signal failed (non-critical)", { err }),
    );

  return {
    orderIds,
    total,
    itemCount: orderIds.length,
    ...(unavailablePaid.length > 0 ? { unavailableItems: unavailablePaid } : {}),
  };
}
