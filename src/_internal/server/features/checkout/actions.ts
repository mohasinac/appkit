/**
 * Checkout server actions (appkit).
 *
 * Lifted from src/app/api/checkout/route.ts so any consumer (REST handler,
 * server component form, RSC action) can place orders by calling these
 * directly. The consumer is responsible for auth/rate-limit/Next-specific
 * concerns; the action only does transactional order placement.
 */

import { ApiError, ValidationError, NotFoundError, ERROR_MESSAGES } from "../../../../errors";
import { serverLogger } from "../../../../monitoring";
import {
  unitOfWork,
  siteSettingsRepository,
  userRepository,
  storeRepository,
  couponsRepository,
  notificationRepository,
} from "../../../../repositories";
import { failedCheckoutRepository } from "../../../../features/checkout/repository/failed-checkout.repository";
import type {
  FailedCheckoutReason,
  FailedPaymentReason,
} from "../../../../features/checkout/schemas/firestore";
import { sendOrderConfirmationEmail } from "../../../../features/contact/server";
import { splitCartIntoOrderGroups } from "../../../../features/orders/index";
import { resolveDate } from "../../../../utils";
import {
  getAdminDb,
  getAdminRealtimeDb,
  RTDB_PATHS,
} from "../../../../providers/db-firebase";
import { PRODUCT_COLLECTION, ProductStatusValues } from "../../../../features/products/schemas/firestore";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import { CART_COLLECTION } from "../../../../features/cart/schemas/index";
import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";
import {
  consentOtpRef,
  consentOtpRateLimitRef,
  CONSENT_OTP_MAX_BYPASS_CREDITS,
} from "../../../../features/auth/server";
import {
  OrderStatusValues,
  PaymentStatusValues,
  PaymentMethodValues,
} from "../../../../features/orders/schemas/index";
import { getDefaultCurrency } from "../../../../core/index";
import {
  verifyPaymentSignatureWithKeys,
  fetchRazorpayOrder,
  paiseToRupees,
} from "../../../../providers/payment-razorpay/index";
import { CHECKOUT_DEFAULT_COMMISSIONS, type CheckoutPaymentMethod } from "../../../shared/features/checkout/config";
import { formatShippingAddress, type CheckoutOrderResult } from "./data";
import {
  enforceMaxPerUserForCart,
  enforcePrizePoolCap,
  computePrizeRevealDeadline,
} from "./prize-bundle-gates";

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
}): void {
  const { orderId, buyerUid, buyerName, storeOwnerId, productLabel, paid } = args;
  const buyerNotif = notificationRepository
    .create({
      userId: buyerUid,
      type: "order_placed",
      priority: "normal",
      title: "Order placed",
      message: `Your order for ${productLabel} has been placed.`,
      relatedId: orderId,
      relatedType: "order",
      actionUrl: `/user/orders/view/${orderId}`,
    } as never)
    .catch((err: unknown) =>
      serverLogger.warn("Failed to create buyer order_placed notification", {
        err,
        orderId,
      }),
    );
  const sellerNotif = storeOwnerId
    ? notificationRepository
        .create({
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
        } as never)
        .catch((err: unknown) =>
          serverLogger.warn("Failed to create seller order_placed notification", {
            err,
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
  addressId: string;
  paymentMethod: CheckoutPaymentMethod;
  notes?: string;
  excludedProductIds?: string[];
}

interface StockResult {
  available: { item: CartItemDocument; product: ProductDocument }[];
  unavailable: NonNullable<CheckoutOrderResult["unavailableItems"]>;
  emailOtpUsed: boolean;
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
    notes,
    excludedProductIds = [],
  } = input;

  const siteSettings = await siteSettingsRepository.getSingleton();
  const commissions = siteSettings?.commissions ?? CHECKOUT_DEFAULT_COMMISSIONS;

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

  const address = await unitOfWork.addresses.findById(uid, addressId);
  if (!address) {
    failedCheckoutRepository
      .logCheckout(uid, "address_not_found", "Address not found", { addressId, paymentMethod })
      .catch(() => {});
    throw new NotFoundError(ERROR_MESSAGES.CHECKOUT.ADDRESS_REQUIRED);
  }
  const shippingAddress = formatShippingAddress(address);

  const db = getAdminDb();
  const otpRef = consentOtpRef(db, uid, addressId);

  // SB6-C — pre-tx fetch products so we can run the maxPerUser cap check
  // (count queries can't run inside a Firestore transaction). The same
  // product docs are re-read inside the transaction below for stock + prize
  // pool checks; this is intentional (the tx is the source of truth for the
  // counts we actually mutate).
  const preTxProductRefs = cartItems.map((item) =>
    db.collection(PRODUCT_COLLECTION).doc(item.productId),
  );
  const preTxProductSnaps = await Promise.all(preTxProductRefs.map((r) => r.get()));
  const preTxPairs = cartItems
    .map((item, i) => {
      const data = preTxProductSnaps[i].exists
        ? (preTxProductSnaps[i].data() as ProductDocument)
        : undefined;
      return data ? { item, product: data } : null;
    })
    .filter((pair): pair is { item: CartItemDocument; product: ProductDocument } => pair !== null);
  await enforceMaxPerUserForCart({ userId: uid, items: preTxPairs });

  let stockResult: StockResult;
  try {
    stockResult = await db.runTransaction(async (tx): Promise<StockResult> => {
      const otpSnap = await tx.get(otpRef as FirebaseFirestore.DocumentReference);
      const otpData = otpSnap.exists
        ? (otpSnap.data() as {
            verified?: boolean;
            expiresAt?: FirebaseFirestore.Timestamp;
            verifiedVia?: string;
          })
        : null;
      const isConsentValid =
        otpData?.verified === true &&
        otpData.expiresAt &&
        (resolveDate(otpData.expiresAt)?.getTime() ?? 0) > Date.now();
      if (!isConsentValid) {
        const reason = !otpData ? "otp_not_verified" : "consent_expired";
        throw Object.assign(
          new ApiError(
            403,
            "Order verification required. Please complete OTP verification before placing this order.",
          ),
          { _failReason: reason },
        );
      }
      const emailOtpUsed = otpData.verifiedVia !== "sms";

      const productRefs = cartItems.map((item) =>
        db.collection(PRODUCT_COLLECTION).doc(item.productId),
      );
      const productDocs = await Promise.all(productRefs.map((ref) => tx.get(ref)));

      const availableItems: StockResult["available"] = [];
      const unavailableItems: StockResult["unavailable"] = [];

      for (let i = 0; i < cartItems.length; i++) {
        const item = cartItems[i];
        const doc = productDocs[i];
        const productData = doc.exists ? (doc.data() as ProductDocument) : null;
        if (
          !productData ||
          productData.status !== ProductStatusValues.PUBLISHED ||
          productData.availableQuantity < item.quantity
        ) {
          unavailableItems.push({
            productId: item.productId,
            productTitle: item.productTitle,
            requestedQty: item.quantity,
            availableQty: productData?.availableQuantity ?? 0,
          });
        } else {
          // SB6-C — prize-draw pool cap (in-tx, atomic with availableQuantity).
          enforcePrizePoolCap({
            productSnapshot: productData,
            requestedQuantity: item.quantity,
          });
          const productUpdate: Record<string, unknown> = {
            availableQuantity: productData.availableQuantity - item.quantity,
            updatedAt: new Date(),
          };
          if (productData.listingType === "prize-draw") {
            productUpdate.prizeCurrentEntries =
              (productData.prizeCurrentEntries ?? 0) + item.quantity;
          }
          tx.update(productRefs[i], productUpdate);
          availableItems.push({ item, product: productData });
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
        tx.delete(otpRef as FirebaseFirestore.DocumentReference);
      }

      return { available: availableItems, unavailable: unavailableItems, emailOtpUsed };
    });
  } catch (err: unknown) {
    const reason =
      (err as { _failReason?: string })?._failReason === "consent_expired"
        ? "consent_expired"
        : (err as { _failReason?: string })?._failReason === "otp_not_verified"
          ? "otp_not_verified"
          : "unknown";
    failedCheckoutRepository
      .logCheckout(uid, reason as FailedCheckoutReason, err instanceof Error ? err.message : String(err), {
        addressId,
        paymentMethod,
      })
      .catch(() => {});
    throw err;
  }
  const { available, unavailable, emailOtpUsed } = stockResult;

  if (available.length === 0) {
    failedCheckoutRepository
      .logCheckout(uid, "stock_failed", "All items out of stock", {
        addressId,
        paymentMethod,
        cartItemCount: cartItems.length,
      })
      .catch(() => {});
    throw new ValidationError(ERROR_MESSAGES.CHECKOUT.INSUFFICIENT_STOCK);
  }

  const appliedCoupons = cart.appliedCoupons ?? [];
  const orderGroups = splitCartIntoOrderGroups(available);

  const orderIds: string[] = [];
  let total = 0;
  const emailsToSend: Parameters<typeof sendOrderConfirmationEmail>[0][] = [];

  const cartSubtotal = orderGroups.reduce(
    (s, { items: g }) => s + g.reduce((gs, { item }) => gs + item.price * item.quantity, 0),
    0,
  );

  const couponUsageAccumulator = new Map<
    string,
    { couponId: string; code: string; orderIds: string[]; totalDiscount: number }
  >();

  for (const { items: group, orderType } of orderGroups) {
    const firstItem = group[0].item;
    const groupTotal = group.reduce((sum, { item }) => sum + item.price * item.quantity, 0);
    total += groupTotal;

    const orderItems = group.map(({ item }) => ({
      productId: item.productId,
      productTitle: item.productTitle,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity,
    }));
    const totalQuantity = group.reduce((sum, { item }) => sum + item.quantity, 0);

    let shippingFee = 0;
    let storeOwnerId: string | undefined;
    const storeId = firstItem.storeId;
    if (storeId) {
      const store = await storeRepository.findById(storeId);
      storeOwnerId = store?.ownerId;
      if (storeOwnerId) {
        const sellerUser = await userRepository.findById(storeOwnerId);
        const shippingConfig = sellerUser?.shippingConfig;
        if (shippingConfig?.isConfigured) {
          if (shippingConfig.method === "custom") {
            shippingFee = shippingConfig.customShippingPrice ?? 0;
          } else if (shippingConfig.method === "shiprocket") {
            const percentFee = groupTotal * (commissions.platformShippingPercent / 100);
            shippingFee = Math.max(percentFee, commissions.platformShippingFixedMin);
          }
        }
      }
    }

    const isCodLike = paymentMethod === "cod" || paymentMethod === "upi_manual";
    const depositAmount = isCodLike
      ? Math.round(groupTotal * (commissions.codDepositPercent / 100) * 100) / 100
      : undefined;
    const codRemainingAmount = isCodLike
      ? Math.round((groupTotal - (depositAmount ?? 0)) * 100) / 100
      : undefined;

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
                  Math.round((eligibleTotal / groupTotal) * coupon.discountAmount * 100) / 100,
                  eligibleTotal,
                )
              : 0;
        } else {
          couponGroupDiscount = Math.min(coupon.discountAmount, groupTotal);
        }
      } else {
        if (cartSubtotal > 0) {
          couponGroupDiscount = Math.min(
            Math.round((groupTotal / cartSubtotal) * coupon.discountAmount * 100) / 100,
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
          const entry = couponUsageAccumulator.get(coupon.code) ?? {
            couponId: coupon.couponId,
            code: coupon.code,
            orderIds: [],
            totalDiscount: 0,
          };
          entry.totalDiscount += couponGroupDiscount;
          couponUsageAccumulator.set(coupon.code, entry);
          groupCouponCodes.add(coupon.code);
        }
      }
    }

    couponDiscount = Math.min(couponDiscount, groupTotal);
    const orderTotal = Math.max(0, groupTotal - couponDiscount) + shippingFee;

    const imageUrls = [
      ...new Set(
        group
          .map(({ product }) => product.mainImage)
          .filter((url): url is string => typeof url === "string" && url.length > 0),
      ),
    ];

    // SB6-C / SB8-A — prize-draw + bundle order-level fields.
    const isPrizeDrawOrder = orderType === "prize-draw";
    const isBundleOrder = orderType === "bundle";
    const prizeDrawFields =
      isPrizeDrawOrder
        ? {
            prizeDrawProductId: group[0].product.id,
            isNonRefundable: true,
            prizeRevealDeadline: computePrizeRevealDeadline(group[0].product),
          }
        : isBundleOrder
          ? { isNonRefundable: true }
          : {};

    const order = await unitOfWork.orders.create({
      productId: firstItem.productId,
      productTitle: firstItem.productTitle,
      userId: uid,
      userName,
      userEmail,
      quantity: totalQuantity,
      unitPrice: firstItem.price,
      totalPrice: orderTotal,
      currency: firstItem.currency ?? getDefaultCurrency(),
      storeId: firstItem.storeId || undefined,
      storeName: firstItem.storeName || undefined,
      items: orderItems,
      orderType,
      offerId: firstItem.offerId ?? undefined,
      status: OrderStatusValues.PENDING,
      paymentStatus: PaymentStatusValues.PENDING,
      paymentMethod,
      shippingAddress,
      notes,
      shippingFee: shippingFee > 0 ? shippingFee : undefined,
      depositAmount,
      codRemainingAmount,
      couponCode: appliedDiscounts[0]?.code,
      couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
      appliedDiscounts: appliedDiscounts.length > 0 ? appliedDiscounts : undefined,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      ...prizeDrawFields,
    });

    orderIds.push(order.id);

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
      paid: false,
    });
  }

  if (couponUsageAccumulator.size > 0) {
    Promise.all(
      [...couponUsageAccumulator.values()].map(({ couponId, code, orderIds: ids, totalDiscount }) =>
        couponsRepository.applyCoupon(couponId, code, uid, ids, totalDiscount),
      ),
    ).catch((err: unknown) =>
      serverLogger.error("Failed to record coupon usage:", err),
    );
  }

  if (emailOtpUsed && unavailable.length > 0) {
    const metaRef = consentOtpRateLimitRef(db, uid);
    metaRef
      .get()
      .then((snap: FirebaseFirestore.DocumentSnapshot) => {
        const cur = snap.exists ? ((snap.data()?.bypassCredits as number) ?? 0) : 0;
        return metaRef.set(
          { bypassCredits: Math.min(cur + 1, CONSENT_OTP_MAX_BYPASS_CREDITS) },
          { merge: true },
        );
      })
      .catch((err: unknown) =>
        serverLogger.warn("Failed to grant consent OTP bypass credit", { err }),
      );
  }

  if (emailsToSend.length > 0) {
    Promise.all(emailsToSend.map((e) => sendOrderConfirmationEmail(e))).catch(
      (err: unknown) => serverLogger.error("Order confirmation email error:", err),
    );
  }

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
  addressId: string;
  notes?: string;
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
  } = input;

  const siteSettings = await siteSettingsRepository.getSingleton();
  const razorpayFeePercent = siteSettings?.commissions?.razorpayFeePercent ?? 5;
  const commissions = siteSettings?.commissions ?? CHECKOUT_DEFAULT_COMMISSIONS;

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
      .catch(() => {});
    throw new ValidationError(ERROR_MESSAGES.CHECKOUT.PAYMENT_FAILED);
  }

  const cart = await unitOfWork.carts.getOrCreate(uid);
  if (!cart.items || cart.items.length === 0) {
    throw new ValidationError(ERROR_MESSAGES.CHECKOUT.CART_EMPTY);
  }

  const address = await unitOfWork.addresses.findById(uid, addressId);
  if (!address) {
    throw new NotFoundError(ERROR_MESSAGES.CHECKOUT.ADDRESS_REQUIRED);
  }
  const shippingAddress = formatShippingAddress(address);

  const db = getAdminDb();
  const otpRef = consentOtpRef(db, uid, addressId);
  {
    const otpSnap = await otpRef.get();
    const otpData = otpSnap.exists
      ? (otpSnap.data() as {
          verified?: boolean;
          expiresAt?: FirebaseFirestore.Timestamp;
        })
      : null;
    const isConsentValid =
      otpData?.verified === true &&
      otpData.expiresAt &&
      (resolveDate(otpData.expiresAt)?.getTime() ?? 0) > Date.now();
    if (!isConsentValid) {
      const reason = !otpData ? "otp_not_verified" : "consent_expired";
      failedCheckoutRepository
        .logPayment(
          uid,
          reason as FailedPaymentReason,
          "Consent OTP missing or expired at payment verify time",
          {
            gatewayOrderId: razorpay_order_id,
            gatewayPaymentId: razorpay_payment_id,
            addressId,
          },
        )
        .catch(() => {});
      throw new ApiError(
        403,
        "Order verification required. Please complete OTP verification and retry.",
      );
    }
  }

  const productChecks = await Promise.all(
    cart.items.map(async (item) => {
      const product = await unitOfWork.products.findById(item.productId);
      return { item, product };
    }),
  );

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

  // SB6-C — prize-pool cap. Runs against the freshly-read product snapshots.
  for (const { item, product } of productChecks) {
    if (!product) continue;
    enforcePrizePoolCap({
      productSnapshot: product,
      requestedQuantity: item.quantity,
    });
  }

  for (const { item, product } of productChecks) {
    if (!product || product.status !== ProductStatusValues.PUBLISHED) {
      failedCheckoutRepository
        .logPayment(uid, "product_unavailable", `Product ${item.productId} not published`, {
          gatewayOrderId: razorpay_order_id,
          gatewayPaymentId: razorpay_payment_id,
          addressId,
        })
        .catch(() => {});
      throw new ValidationError(ERROR_MESSAGES.CHECKOUT.PRODUCT_UNAVAILABLE);
    }
    if (product.availableQuantity < item.quantity) {
      failedCheckoutRepository
        .logPayment(
          uid,
          "stock_insufficient",
          `Product ${item.productId} has ${product.availableQuantity} left, requested ${item.quantity}`,
          {
            gatewayOrderId: razorpay_order_id,
            gatewayPaymentId: razorpay_payment_id,
            addressId,
          },
        )
        .catch(() => {});
      throw new ValidationError(ERROR_MESSAGES.CHECKOUT.INSUFFICIENT_STOCK);
    }
  }

  {
    const cartSubtotalRs = productChecks.reduce(
      (sum, { item, product }) => sum + product!.price * item.quantity,
      0,
    );
    const expectedPlatformFee =
      Math.round(cartSubtotalRs * (razorpayFeePercent / 100) * 100) / 100;
    const expectedPaymentAmountRs = cartSubtotalRs + expectedPlatformFee;
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
        .catch(() => {});
      throw new ValidationError(ERROR_MESSAGES.CHECKOUT.PAYMENT_FAILED);
    }
  }

  const appliedCoupons = cart.appliedCoupons ?? [];
  const orderGroups = splitCartIntoOrderGroups(productChecks);

  const orderIds: string[] = [];
  let total = 0;
  const emailsToSend: Parameters<typeof sendOrderConfirmationEmail>[0][] = [];

  const cartSubtotal = orderGroups.reduce(
    (s, { items: g }) =>
      s +
      g.reduce(
        (gs, { item, product }) => gs + product!.price * item.quantity,
        0,
      ),
    0,
  );

  for (const { items: group, orderType } of orderGroups) {
    const firstItem = group[0].item;
    const groupTotal = group.reduce(
      (sum, { item, product }) => sum + product!.price * item.quantity,
      0,
    );

    let shippingFee = 0;
    let storeOwnerId: string | undefined;
    const storeId = firstItem.storeId;
    if (storeId) {
      const store = await storeRepository.findById(storeId);
      storeOwnerId = store?.ownerId;
      const sellerUser = storeOwnerId ? await userRepository.findById(storeOwnerId) : null;
      const shippingConfig = sellerUser?.shippingConfig;
      if (shippingConfig?.isConfigured) {
        if (shippingConfig.method === "custom") {
          shippingFee = shippingConfig.customShippingPrice ?? 0;
        } else if (shippingConfig.method === "shiprocket") {
          const percentFee = groupTotal * (commissions.platformShippingPercent / 100);
          shippingFee = Math.max(percentFee, commissions.platformShippingFixedMin);
        }
      }
    }

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
            .reduce((s, { item, product }) => s + product!.price * item.quantity, 0);
          couponGroupDiscount =
            eligibleTotal > 0
              ? Math.min(
                  Math.round((eligibleTotal / groupTotal) * coupon.discountAmount * 100) / 100,
                  eligibleTotal,
                )
              : 0;
        } else {
          couponGroupDiscount = Math.min(coupon.discountAmount, groupTotal);
        }
      } else if (cartSubtotal > 0) {
        couponGroupDiscount = Math.min(
          Math.round((groupTotal / cartSubtotal) * coupon.discountAmount * 100) / 100,
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
    const platformFee = Math.round(groupTotal * (razorpayFeePercent / 100) * 100) / 100;
    const orderTotal = Math.max(0, groupTotal - couponDiscount) + shippingFee;
    total += orderTotal;

    const orderItems = group.map(({ item, product }) => ({
      productId: item.productId,
      productTitle: item.productTitle,
      quantity: item.quantity,
      unitPrice: product!.price,
      totalPrice: product!.price * item.quantity,
    }));
    const totalQuantity = group.reduce((sum, { item }) => sum + item.quantity, 0);

    const imageUrls = [
      ...new Set(
        group
          .map(({ product }) => product?.mainImage)
          .filter((url): url is string => typeof url === "string" && url.length > 0),
      ),
    ];

    // SB6-C / SB8-A — prize-draw + bundle order-level fields.
    const isPrizeDrawOrder = orderType === "prize-draw";
    const isBundleOrder = orderType === "bundle";
    const prizeDrawFields =
      isPrizeDrawOrder && group[0].product
        ? {
            prizeDrawProductId: group[0].product.id,
            isNonRefundable: true,
            prizeRevealDeadline: computePrizeRevealDeadline(group[0].product),
          }
        : isBundleOrder
          ? { isNonRefundable: true }
          : {};

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
      shippingAddress,
      notes,
      platformFee,
      shippingFee: shippingFee > 0 ? shippingFee : undefined,
      couponCode: appliedDiscounts[0]?.code,
      couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
      appliedDiscounts: appliedDiscounts.length > 0 ? appliedDiscounts : undefined,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      ...prizeDrawFields,
    } as never);

    orderIds.push(order.id);

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
    });
  }

  await unitOfWork.runBatch((batch) => {
    for (const { item, product } of productChecks) {
      if (!product) continue;
      const prizeBump =
        product.listingType === "prize-draw"
          ? {
              prizeCurrentEntries:
                (product.prizeCurrentEntries ?? 0) + item.quantity,
            }
          : {};
      unitOfWork.products.updateInBatch(batch, item.productId, {
        availableQuantity: product.availableQuantity - item.quantity,
        ...prizeBump,
      } as never);
    }
    unitOfWork.carts.updateInBatch(batch, uid, {
      items: [],
      appliedCoupons: [],
      selectedItemIds: null,
    } as never);
  });
  otpRef.delete().catch(() => {});

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

  return { orderIds, total, itemCount: orderIds.length };
}
