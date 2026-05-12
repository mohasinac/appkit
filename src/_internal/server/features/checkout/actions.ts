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
} from "../../../../repositories";
import { failedCheckoutRepository } from "../../../../features/checkout/repository/failed-checkout.repository";
import type { FailedCheckoutReason } from "../../../../features/checkout/schemas/firestore";
import { sendOrderConfirmationEmail } from "../../../../features/contact/server";
import { splitCartIntoOrderGroups } from "../../../../features/orders/index";
import { resolveDate } from "../../../../utils";
import { getAdminDb } from "../../../../providers/db-firebase";
import { PRODUCT_COLLECTION, ProductStatusValues } from "../../../../features/products/schemas/firestore";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import { CART_COLLECTION } from "../../../../features/cart/schemas/index";
import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";
import {
  consentOtpRef,
  consentOtpRateLimitRef,
  CONSENT_OTP_MAX_BYPASS_CREDITS,
} from "../../../../features/auth/server";
import { OrderStatusValues, PaymentStatusValues } from "../../../../features/orders/schemas/index";
import { getDefaultCurrency } from "../../../../core/index";
import { CHECKOUT_DEFAULT_COMMISSIONS, type CheckoutPaymentMethod } from "../../../shared/features/checkout/config";
import { formatShippingAddress, type CheckoutOrderResult } from "./data";

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
          tx.update(productRefs[i], {
            availableQuantity: productData.availableQuantity - item.quantity,
            updatedAt: new Date(),
          });
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
    const storeId = firstItem.storeId;
    if (storeId) {
      const store = await storeRepository.findById(storeId);
      const storeOwnerId = store?.ownerId;
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
