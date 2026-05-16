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
// S-SBUNI-RULES 2026-05-13 — bundle cart-line stock fan-out helpers.
import {
  getCartItemMemberIds,
  getExpandedDecrements,
  validateCartItemStock,
} from "./bundle-expansion";
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
  computePrizeRevealDeadline,
} from "./prize-bundle-gates";
import type { ListingType } from "../../../../features/products/types/index";
import {
  getListingRule,
  runSyncPreflight,
} from "../../../shared/checkout/rules";
import { cartIsDigitalOnly } from "../../../shared/listing-types/cart-shipping";

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
  /** Required for physical carts; omitted for digital-code-only carts (no shipping). */
  addressId?: string;
  paymentMethod: CheckoutPaymentMethod;
  notes?: string;
  excludedProductIds?: string[];
  /** When true this is an admin test order — OTP consent is pre-granted and the order is created paid/processing. */
  adminBypass?: boolean;
  /** UID of the admin who triggered the bypass. Set when adminBypass is true. */
  adminBypassBy?: string;
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
  groupTotal: number,
  commissions: { platformShippingPercent: number; platformShippingFixedMin: number },
): Promise<{ shippingFee: number; storeOwnerId: string | undefined }> {
  if (!storeId) return { shippingFee: 0, storeOwnerId: undefined };
  const store = await storeRepository.findById(storeId);
  const storeOwnerId = store?.ownerId;
  if (!storeOwnerId) return { shippingFee: 0, storeOwnerId: undefined };
  const sellerUser = await userRepository.findById(storeOwnerId);
  const shippingConfig = sellerUser?.shippingConfig;
  if (!shippingConfig?.isConfigured) return { shippingFee: 0, storeOwnerId };
  if (shippingConfig.method === "custom") {
    return { shippingFee: shippingConfig.customShippingPrice ?? 0, storeOwnerId };
  }
  if (shippingConfig.method === "shiprocket") {
    const percentFee = groupTotal * (commissions.platformShippingPercent / 100);
    return { shippingFee: Math.max(percentFee, commissions.platformShippingFixedMin), storeOwnerId };
  }
  return { shippingFee: 0, storeOwnerId };
}

function buildStockUpdatePayload(
  product: ProductDocument,
  qtyDelta: number,
): Record<string, unknown> {
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
    adminBypass = false,
    adminBypassBy,
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

  const isDigitalCart = cartIsDigitalOnly(cartItems);

  let shippingAddress: string | undefined;
  let resolvedAddress: import("../../../../features/addresses/schemas/firestore").AddressDocument | null = null;
  if (!isDigitalCart) {
    if (!addressId) {
      failedCheckoutRepository
        .logCheckout(uid, "address_not_found", "Address required for physical cart", { addressId: "", paymentMethod })
        .catch(() => {});
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
        .catch(() => {});
      throw new NotFoundError(ERROR_MESSAGES.CHECKOUT.ADDRESS_REQUIRED);
    }
    shippingAddress = formatShippingAddress(resolvedAddress);
  }

  const db = getAdminDb();
  const otpRef = isDigitalCart ? null : consentOtpRef(db, uid, addressId!);

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
      let emailOtpUsed = false;
      if (!isDigitalCart && otpRef) {
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
        emailOtpUsed = otpData.verifiedVia !== "sms" && otpData.verifiedVia !== "admin_bypass";
      }

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

      const availableItems: StockResult["available"] = [];
      const unavailableItems: StockResult["unavailable"] = [];

      for (const item of cartItems) {
        const shortfall = validateCartItemStock(
          item,
          productById,
          expansion.decrements,
        );
        if (shortfall) {
          unavailableItems.push({
            productId: shortfall.productId,
            productTitle: item.productTitle,
            requestedQty: item.quantity,
            availableQty: shortfall.availableQty,
          });
          continue;
        }
        // Bundle cart-lines surface the first member as the "product" so
        // downstream listingType branching (prize-draw) stays sound — bundle
        // pricing is always "standard" so the prize-draw cap isn't enforced.
        const memberIds = getCartItemMemberIds(item);
        const representative = productById.get(memberIds[0]) as ProductDocument;
        // S-SBUNI-RULES 2026-05-13 — sync preflight (prize-pool cap, pre-order
        // quota) via rule registry. Bundles skip — they bypass the cart path.
        if (!item.bundleProductIds?.length) {
          runSyncPreflight([{ item, product: representative }]);
        }
        availableItems.push({ item, product: representative });
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
        if (otpRef) {
          tx.delete(otpRef as FirebaseFirestore.DocumentReference);
        }
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

  // Admin-bypass orders are immediately paid and processing; generate a shared
  // transaction reference for all orders in this checkout batch.
  const adminBatchId = adminBypass
    ? `ADMIN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    : undefined;

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
      const baseLine = {
        productId: item.productId,
        productTitle: item.productTitle,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
        ...bundleFields,
      };
      return itemRule.decorateOrderItem(baseLine, product);
    });
    const totalQuantity = group.reduce((sum, { item }) => sum + item.quantity, 0);

    const { shippingFee, storeOwnerId } = await resolveShippingCost(
      firstItem.storeId,
      groupTotal,
      commissions,
    );

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
          accumulateCouponUsage(couponUsageAccumulator, coupon.code, coupon.couponId, couponGroupDiscount);
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

    // S-SBUNI-RULES 2026-05-13 — order-doc decoration via rule registry.
    const lt0 = (group[0].product.listingType ?? "standard") as ListingType;
    const groupRule = getListingRule(lt0);
    const extraOrderFields = {
      ...groupRule.decorateOrderDoc(group[0].item, group[0].product),
      ...(orderType === "prize-draw"
        ? { prizeRevealDeadline: computePrizeRevealDeadline(group[0].product) }
        : {}),
    };

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
      status: adminBypass ? OrderStatusValues.PROCESSING : OrderStatusValues.PENDING,
      paymentStatus: adminBypass ? PaymentStatusValues.PAID : PaymentStatusValues.PENDING,
      paymentMethod: adminBypass ? PaymentMethodValues.ADMIN_BYPASS : paymentMethod,
      paymentId: adminBatchId,
      adminBypassBy: adminBypassBy,
      shippingAddress,
      notes,
      shippingFee: shippingFee > 0 ? shippingFee : undefined,
      depositAmount: adminBypass ? undefined : depositAmount,
      codRemainingAmount: adminBypass ? undefined : codRemainingAmount,
      couponCode: appliedDiscounts[0]?.code,
      couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
      appliedDiscounts: appliedDiscounts.length > 0 ? appliedDiscounts : undefined,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      ...extraOrderFields,
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
      paid: adminBypass,
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
  /** Required for physical carts; omitted for digital-code-only carts. */
  addressId?: string;
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
  const platformFeePercent = siteSettings?.commissions?.platformFeePercent ?? 5;
  const gstPercent = siteSettings?.commissions?.gstPercent ?? 18;
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

  const db = getAdminDb();
  if (!isDigitalCartRazorpay && addressId) {
    const otpRef = consentOtpRef(db, uid, addressId);
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

  // SB-UNI-5 2026-05-13 — bundle-aware product fetch + validation. Each
  // cart line gets paired with a "representative" product (first member id
  // for bundles, productId for regular items). The full bundle-member
  // decrement runs against `expansionPaid.decrements` lower down.
  const expansionPaid = getExpandedDecrements(cart.items);
  const productByIdPaid = new Map<string, ProductDocument>();
  for (const pid of expansionPaid.productIds) {
    const product = await unitOfWork.products.findById(pid);
    if (product) productByIdPaid.set(pid, product);
  }
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
  runSyncPreflight(preflightPairs);

  // SB-UNI-O 2026-05-15 — Live-item jurisdiction guard.
  if (!isDigitalCartRazorpay && resolvedAddressRzp) {
    assertLiveJurisdiction(cart.items, productByIdPaid, resolvedAddressRzp.state);
  }

  // SB-UNI-5 — validate every required member product across the cart with
  // cumulative decrement awareness (two bundles sharing a member must NOT
  // both succeed unless the product has enough stock for the sum).
  for (const item of cart.items) {
    const shortfall = validateCartItemStock(
      item,
      productByIdPaid,
      expansionPaid.decrements,
    );
    if (shortfall) {
      const exists = productByIdPaid.has(shortfall.productId);
      const reason = exists ? "stock_insufficient" : "product_unavailable";
      failedCheckoutRepository
        .logPayment(
          uid,
          reason,
          exists
            ? `Product ${shortfall.productId} has ${shortfall.availableQty} left, requested ${item.quantity}`
            : `Product ${shortfall.productId} not published`,
          {
            gatewayOrderId: razorpay_order_id,
            gatewayPaymentId: razorpay_payment_id,
            addressId,
          },
        )
        .catch(() => {});
      throw new ValidationError(
        exists
          ? ERROR_MESSAGES.CHECKOUT.INSUFFICIENT_STOCK
          : ERROR_MESSAGES.CHECKOUT.PRODUCT_UNAVAILABLE,
      );
    }
  }

  {
    // SB-UNI-5 2026-05-13 — bundle cart-lines use item.price (locked
    // bundlePriceInPaise) instead of the representative member's product.price.
    const cartSubtotalRs = productChecks.reduce((sum, { item, product }) => {
      const isBundle = Boolean(
        item.bundleCategorySlug && item.bundleProductIds?.length,
      );
      const unit = isBundle ? item.price : product!.price;
      return sum + unit * item.quantity;
    }, 0);
    const expectedPlatformFee =
      Math.round(cartSubtotalRs * (platformFeePercent / 100) * 100) / 100;
    const expectedGstOnFee = Math.round(expectedPlatformFee * (gstPercent / 100) * 100) / 100;
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
        .catch(() => {});
      throw new ValidationError(ERROR_MESSAGES.CHECKOUT.PAYMENT_FAILED);
    }
  }

  const appliedCoupons = cart.appliedCoupons ?? [];
  const orderGroups = splitCartIntoOrderGroups(productChecks);

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
    const firstItem = group[0].item;
    const groupTotal = group.reduce(
      (sum, { item, product }) => sum + unitPriceFor(item, product) * item.quantity,
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
            .reduce((s, { item, product }) => s + unitPriceFor(item, product) * item.quantity, 0);
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
    const rawPlatformFee = Math.round(groupTotal * (platformFeePercent / 100) * 100) / 100;
    const gstOnFee = Math.round(rawPlatformFee * (gstPercent / 100) * 100) / 100;
    const platformFee = rawPlatformFee + gstOnFee;
    const orderTotal = Math.max(0, groupTotal - couponDiscount) + shippingFee;
    total += orderTotal;

    // S-SBUNI-RULES 2026-05-13 — order-item decoration via rule registry.
    const orderItems = group.map(({ item, product }) => {
      const lt = (product?.listingType ?? "standard") as ListingType;
      const itemRule = getListingRule(lt);
      // SB-UNI-5 2026-05-13 — bundle cart-lines surface the locked
      // bundlePriceInPaise (item.price), not the representative member's
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
      ...(orderType === "prize-draw" && group[0].product
        ? { prizeRevealDeadline: computePrizeRevealDeadline(group[0].product) }
        : {}),
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
      shippingAddress,
      notes,
      platformFee,
      shippingFee: shippingFee > 0 ? shippingFee : undefined,
      couponCode: appliedDiscounts[0]?.code,
      couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
      appliedDiscounts: appliedDiscounts.length > 0 ? appliedDiscounts : undefined,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      ...extraOrderFields,
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
  if (!isDigitalCartRazorpay && addressId) {
    const otpRefForDelete = consentOtpRef(db, uid, addressId);
    otpRefForDelete.delete().catch(() => {});
  }

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
