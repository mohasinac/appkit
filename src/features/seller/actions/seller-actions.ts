/**
 * Seller Domain Actions — appkit
 *
 * Pure async functions (no auth, no rate-limit). Accept userId/adminId as
 * explicit params. Called by letitrip thin wrappers that handle auth,
 * rate-limiting, and user-facing validation.
 *
 * Note: updateSellerShipping remains in the letitrip thin wrapper
 * (src/actions/seller.actions.ts) alongside the other seller server actions.
 */

import { serverLogger } from "../../../monitoring";
import { isAdminUser, isSellerUser, isStrictSellerUser, isTesterUser } from "../../auth/role-predicates";
import {
  ApiError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../../../errors";
import { userRepository } from "../../auth/repository/user.repository";
import { storeRepository } from "../../stores/repository/store.repository";
import type { JsonValue } from "../../../schemas/types";
import { productRepository } from "../../products/repository/products.repository";
import { ProductStatusValues } from "../../products/schemas";
import {
  assertPrizeDrawNotLocked,
  assertPrizeDrawWonItemsImmutable,
} from "../../../_internal/server/features/products/service";
import { orderRepository } from "../../orders/repository/orders.repository";
import { OrderStatusValues } from "../../orders/schemas";
import { payoutRepository } from "../../payments/repository/payout.repository";
import { PAYOUT_FIELDS } from "../../payments/schemas";
import { couponsRepository } from "../../promotions/repository/coupons.repository";
import { generateStoreSlug } from "../../stores/schemas/firestore";
import { siteSettingsRepository } from "../../admin/repository/site-settings.repository";
import { computePayoutDeduction } from "../../../_internal/shared/fees/calculator";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import {
  finalizeStagedMediaUrl,
  finalizeStagedMediaField,
  finalizeStagedMediaArray,
} from "../../media/finalize";
import type { UserDocument, SellerPayoutDetails } from "../../auth/schemas/firestore";
import type { StoreDocument } from "../../stores/schemas/firestore";
import { StoreStatusValues } from "../../stores/schemas/firestore";
import type { ProductDocument } from "../../products/schemas/firestore";
import type { OrderDocument } from "../../orders/schemas/firestore";
import type { CouponDocument } from "../../promotions/schemas/firestore";
import type { FirebaseSieveResult } from "../../../providers/db-firebase/index";

// --- Types --------------------------------------------------------------------

export interface BecomeSellerResult {
  storeStatus: "pending" | "approved" | "rejected";
  alreadySeller?: boolean;
}

export interface CreateStoreInput {
  storeName: string;
  storeDescription?: string;
  storeCategory?: string;
}

export interface UpdateStoreInput {
  storeName?: string;
  storeDescription?: string;
  storeCategory?: string;
  storeLogoURL?: string;
  storeBannerURL?: string;
  returnPolicy?: string;
  shippingPolicy?: string;
  bio?: string;
  website?: string;
  location?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
  isVacationMode?: boolean;
  vacationMessage?: string;
  isPublic?: boolean;
}

export type UpdatePayoutSettingsInput =
  | { method: "upi"; upiId: string }
  | {
      method: "bank_transfer";
      bankAccount: {
        accountHolderName: string;
        accountNumber: string;
        ifscCode: string;
        bankName: string;
        accountType: "savings" | "current";
      };
    };

export interface RequestPayoutInput {
  paymentMethod: "bank_transfer" | "upi";
  bankAccount?: {
    accountHolderName: string;
    accountNumberMasked: string;
    ifscCode: string;
    bankName: string;
  };
  upiId?: string;
  notes?: string;
}

export interface BulkSellerOrderResult {
  payoutId: string;
  requested: string[];
  skipped: string[];
  eligibleCount: number;
  skippedCount: number;
  netAmount: number;
  grossAmount: number;
  platformFee: number;
}

export interface CustomShipOrderInput {
  shippingCarrier: string;
  trackingNumber: string;
  trackingUrl: string;
}

export interface MarkEmiInstallmentPaidInput {
  /** 1-based installment number, matches EmiInstallment.index. */
  installmentIndex: number;
  /** Buyer-supplied UTR/reference number for this installment's manual payment. */
  transactionId?: string;
  /** Signed-URL media slug for the buyer's payment proof for this installment. */
  proofUrl?: string;
}

export interface SellerListParams {
  filters?: string;
  sorts?: string;
  page?: number;
  pageSize?: number;
}

// --- Helper -------------------------------------------------------------------

async function finalizeProductMediaReferences<
  T extends Record<string, JsonValue>,
>(data: T): Promise<T> {
  const finalized = { ...data } as T & {
    mainImage?: string;
    images?: string[];
    video?: {
      url?: string;
      thumbnailUrl?: string;
      duration?: number;
      trimStart?: number;
      trimEnd?: number;
    };
  };

  if (typeof finalized.mainImage === "string" && finalized.mainImage) {
    finalized.mainImage = await finalizeStagedMediaUrl(finalized.mainImage);
  }
  if (Array.isArray(finalized.images) && finalized.images.length > 0) {
    finalized.images = await finalizeStagedMediaArray(finalized.images);
  }
  if (finalized.video?.url) {
    finalized.video = {
      ...finalized.video,
      url: await finalizeStagedMediaUrl(finalized.video.url),
      thumbnailUrl: await finalizeStagedMediaField(
        finalized.video.thumbnailUrl,
      ),
    };
  }
  return finalized as T;
}

function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return "****";
  return "X".repeat(accountNumber.length - 4) + accountNumber.slice(-4);
}

// --- Become Seller ------------------------------------------------------------

export async function becomeSeller(
  userId: string,
): Promise<BecomeSellerResult> {
  const profile = await userRepository.findById(userId);
  const isTester = isTesterUser(profile);

  /*
   * 🛑 `isStrictSellerUser`, not `isSellerUser`.
   *
   * `isSellerUser` now answers true for the `tester` role — testers own real
   * stores and must clear every seller gate. But that makes it the WRONG test
   * here: a brand-new tester has role `tester` from the moment they are
   * flagged, so an early return keyed on it would send them straight back with
   * `storeStatus: "pending"` and they would never reach the auto-approve below.
   * The tester sandbox depends on that approval.
   *
   * A tester who HAS already onboarded is caught by the `storeStatus` clause,
   * so this stays idempotent for them.
   */
  const alreadyOnboarded =
    profile &&
    (isStrictSellerUser(profile) ||
      isAdminUser(profile) ||
      (isTester && Boolean(profile.storeStatus)));

  if (alreadyOnboarded) {
    return {
      alreadySeller: true,
      storeStatus:
        (profile.storeStatus as "pending" | "approved" | "rejected") ??
        "pending",
    };
  }

  const storeStatus = isTester ? "approved" : "pending";
  await userRepository.update(userId, {
    // 🛑 A tester must NOT be demoted to `seller` here. `tester` is a peer of
    // `seller` in the hierarchy and already clears every seller gate
    // (`isSellerUser` returns true for it), so overwriting the role would
    // silently strip their tester identity — and with it the Tester Hub and
    // the test-data visibility their whole programme depends on — the first
    // time they opened a store.
    ...(isTester ? {} : { role: "seller" as const }),
    storeStatus,
  } as Partial<UserDocument>);

  serverLogger.info("becomeSeller: application submitted", { userId, storeStatus });
  return { storeStatus };
}

// --- Create Store -------------------------------------------------------------

export async function createStore(
  userId: string,
  userName: string,
  input: CreateStoreInput,
): Promise<{ store: StoreDocument }> {
  const existing = await storeRepository.findByOwnerId(userId);
  if (existing) throw new ApiError(409, "Store already exists for this seller");

  const { storeName, storeDescription, storeCategory } = input;
  const baseSlug = `store-${generateStoreSlug(storeName, userName)}`.slice(
    0,
    80,
  );

  let storeSlug = baseSlug;
  let attempt = 1;
  while (await storeRepository.findBySlug(storeSlug)) {
    attempt++;
    const suffix = `-${attempt}`;
    storeSlug = `${baseSlug.slice(0, 80 - suffix.length)}${suffix}`;
  }

  const profile = await userRepository.findById(userId);
  const isTester = isTesterUser(profile);

  const store = await storeRepository.create({
    storeSlug,
    ownerId: userId,
    storeName,
    storeDescription: storeDescription || undefined,
    storeCategory: storeCategory || undefined,
    isPublic: isTester,
    status: isTester ? StoreStatusValues.ACTIVE : StoreStatusValues.PENDING,
  });

  await userRepository.update(userId, {
    storeId: store.id,
    storeSlug: store.storeSlug,
    storeStatus: isTester ? "approved" : "pending",
  } as Parameters<typeof userRepository.update>[1]);

  serverLogger.info("createStore: store created", {
    userId,
    storeSlug: store.storeSlug,
    isTester,
  });
  return { store };
}

// --- Update Store -------------------------------------------------------------

export async function updateStore(
  userId: string,
  input: UpdateStoreInput,
): Promise<{ store: StoreDocument }> {
  const store = await storeRepository.findByOwnerId(userId);
  if (!store) throw new NotFoundError("Store not found. Create a store first.");

  const {
    storeName,
    storeDescription,
    storeCategory,
    storeLogoURL,
    storeBannerURL,
    returnPolicy,
    shippingPolicy,
    bio,
    website,
    location,
    socialLinks,
    isVacationMode,
    vacationMessage,
    isPublic,
  } = input;

  const finalLogoURL = await finalizeStagedMediaField(storeLogoURL);
  const finalBannerURL = await finalizeStagedMediaField(storeBannerURL);

  const updated = await storeRepository.updateStore(store.storeSlug, {
    ...(storeName !== undefined && { storeName }),
    ...(storeDescription !== undefined && { storeDescription }),
    ...(storeCategory !== undefined && { storeCategory }),
    ...(finalLogoURL !== undefined && { storeLogoURL: finalLogoURL }),
    ...(finalBannerURL !== undefined && { storeBannerURL: finalBannerURL }),
    ...(returnPolicy !== undefined && { returnPolicy }),
    ...(shippingPolicy !== undefined && { shippingPolicy }),
    ...(bio !== undefined && { bio }),
    ...(website !== undefined && { website }),
    ...(location !== undefined && { location }),
    ...(socialLinks !== undefined && {
      socialLinks: { ...store.socialLinks, ...socialLinks },
    }),
    ...(isVacationMode !== undefined && { isVacationMode }),
    ...(vacationMessage !== undefined && { vacationMessage }),
    ...(isPublic !== undefined && { isPublic }),
  });

  return { store: updated };
}

// --- Update Payout Settings ---------------------------------------------------

type SafePayoutDetails = Omit<SellerPayoutDetails, "bankAccount"> & {
  bankAccount?: Omit<
    NonNullable<SellerPayoutDetails["bankAccount"]>,
    "accountNumber"
  >;
};

export async function updatePayoutSettings(
  userId: string,
  input: UpdatePayoutSettingsInput,
): Promise<{ payoutDetails: SafePayoutDetails }> {
  let payoutDetails: SellerPayoutDetails;

  if (input.method === "upi") {
    payoutDetails = { method: "upi", upiId: input.upiId, isConfigured: true };
  } else {
    const { accountNumber, ...bankRest } = input.bankAccount;
    payoutDetails = {
      method: "bank_transfer",
      bankAccount: {
        ...bankRest,
        accountNumber,
        accountNumberMasked: maskAccountNumber(accountNumber),
      },
      isConfigured: true,
    };
  }

  await userRepository.update(userId, { payoutDetails });

  serverLogger.info("updatePayoutSettings: payout details updated", {
    userId,
    method: payoutDetails.method,
  });

  if (!payoutDetails.bankAccount) return { payoutDetails };
  const { accountNumber: _removed, ...safeBank } = payoutDetails.bankAccount;
  return { payoutDetails: { ...payoutDetails, bankAccount: safeBank } };
}

// --- Request Payout -----------------------------------------------------------

async function computeSellerEarnings(sellerId: string) {
  const products = await productRepository.findByStore(sellerId);
  const productIds = products.slice(0, 50).map((p) => p.id);

  let deliveredOrders: OrderDocument[] = [];
  if (productIds.length > 0) {
    const batches = await Promise.all(
      productIds.map((id) =>
        orderRepository.findByProduct(id).catch(() => [] as OrderDocument[]),
      ),
    );
    deliveredOrders = batches
      .flat()
      .filter((o) => o.status === OrderStatusValues.DELIVERED);
  }

  const paidOutIds = await payoutRepository.getPaidOutOrderIds(sellerId);
  const eligibleOrders = deliveredOrders.filter((o) => !paidOutIds.has(o.id));

  const grossAmount = eligibleOrders.reduce(
    (sum, o) => sum + (o.totalPrice ?? 0),
    0,
  );
  const siteSettings = await siteSettingsRepository.getSingleton();
  const deduction = computePayoutDeduction(grossAmount, siteSettings.commissions);

  return {
    eligibleOrders,
    grossAmount,
    platformFee: deduction.platformFee,
    gatewayFee: deduction.gatewayFee,
    gstAmount: deduction.gstOnFee,
    netAmount: deduction.netAmount,
    productCount: products.length,
    commissions: siteSettings.commissions,
  };
}

export async function requestPayout(
  userId: string,
  userName: string,
  userEmail: string,
  input: RequestPayoutInput,
): Promise<unknown> {
  const existing = await payoutRepository.findByStore(userId);
  const hasPending = existing.some(
    (p) =>
      p.status === PAYOUT_FIELDS.STATUS_VALUES.PENDING ||
      p.status === PAYOUT_FIELDS.STATUS_VALUES.PROCESSING,
  );
  if (hasPending)
    throw new ValidationError("A payout is already pending or processing.");

  const earnings = await computeSellerEarnings(userId);
  if (earnings.netAmount <= 0 || earnings.eligibleOrders.length === 0)
    throw new ValidationError("No eligible earnings available for payout.");

  const payout = await payoutRepository.create({
    storeId: userId,
    sellerName: userName,
    sellerEmail: userEmail,
    amount: earnings.netAmount,
    grossAmount: earnings.grossAmount,
    platformFee: earnings.platformFee,
    platformFeeRate: earnings.commissions.platformFeePercent / 100,
    gatewayFee: earnings.gatewayFee,
    gatewayFeeRate: (earnings.commissions.gatewayFeePercent ?? 0) / 100,
    gstAmount: earnings.gstAmount,
    gstRate: earnings.commissions.gstPercent / 100,
    currency: getDefaultCurrency(),
    paymentMethod: input.paymentMethod,
    ...(input.bankAccount && { bankAccount: input.bankAccount }),
    ...(input.upiId && { upiId: input.upiId }),
    ...(input.notes && { notes: input.notes }),
    orderIds: earnings.eligibleOrders.map((o) => o.id),
  });

  serverLogger.info("requestPayout: payout requested", {
    userId,
    payoutId: payout.id,
    netAmount: earnings.netAmount,
  });

  return payout;
}

// --- Bulk Seller Order --------------------------------------------------------

export async function bulkSellerOrder(
  userId: string,
  userRole: string,
  userDisplayName: string,
  userEmail: string,
  orderIds: string[],
): Promise<BulkSellerOrderResult> {
  const userDoc = await userRepository.findById(userId);
  if (!userDoc) throw new AuthorizationError("User not found");
  if (!userDoc.payoutDetails?.isConfigured) {
    throw new ValidationError(
      "Payout details are not set up. Please configure your payout method before requesting a payout.",
    );
  }

  // order.storeId is the store slug, not the seller's Firebase UID — resolve
  // the caller's store once so eligibility can compare like-for-like.
  const callerStore =
    userRole !== "admin" ? await storeRepository.findByOwnerId(userId) : null;

  const orders = await Promise.all(
    orderIds.map((id) => orderRepository.findById(id)),
  );

  const requested: string[] = [];
  const skipped: string[] = [];
  const eligible: NonNullable<
    Awaited<ReturnType<typeof orderRepository.findById>>
  >[] = [];

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const id = orderIds[i];
    if (!order) {
      skipped.push(id);
      continue;
    }
    if (userRole !== "admin" && order.storeId !== callerStore?.id) {
      skipped.push(id);
      continue;
    }
    if (order.status !== OrderStatusValues.DELIVERED) {
      skipped.push(id);
      continue;
    }
    if (order.shippingMethod !== "custom") {
      skipped.push(id);
      continue;
    }
    if (order.payoutStatus === "requested" || order.payoutStatus === "paid") {
      skipped.push(id);
      continue;
    }
    if (order.emiEnabled && !order.emiComplete) {
      // Delivered via the seller's allowShipBeforeEmiComplete override, but the
      // buyer hasn't finished paying — hold the payout until emiComplete.
      skipped.push(id);
      continue;
    }
    eligible.push(order as NonNullable<typeof order>);
  }

  if (eligible.length === 0)
    throw new ValidationError("No eligible orders found.");

  const grossAmount = eligible.reduce((sum, o) => sum + (o.totalPrice ?? 0), 0);
  const bulkSiteSettings = await siteSettingsRepository.getSingleton();
  const bulkDeduction = computePayoutDeduction(grossAmount, bulkSiteSettings.commissions);

  const payoutDoc = await payoutRepository.create({
    storeId: userId,
    sellerName: userDisplayName,
    sellerEmail: userEmail,
    orderIds: eligible.map((o) => o.id!),
    amount: bulkDeduction.netAmount,
    grossAmount,
    platformFee: bulkDeduction.platformFee,
    platformFeeRate: bulkSiteSettings.commissions.platformFeePercent / 100,
    gatewayFee: bulkDeduction.gatewayFee,
    gatewayFeeRate: (bulkSiteSettings.commissions.gatewayFeePercent ?? 0) / 100,
    gstAmount: bulkDeduction.gstOnFee,
    gstRate: bulkSiteSettings.commissions.gstPercent / 100,
    currency: getDefaultCurrency(),
    paymentMethod:
      userDoc.payoutDetails.method === "upi"
        ? ("upi" as const)
        : ("bank_transfer" as const),
    upiId:
      userDoc.payoutDetails.method === "upi"
        ? userDoc.payoutDetails.upiId
        : undefined,
    bankAccount:
      userDoc.payoutDetails.method === "bank_transfer"
        ? userDoc.payoutDetails.bankAccount
        : undefined,
    notes: `Payout request for ${eligible.length} custom-shipped delivered order(s)`,
  });

  const payoutId = payoutDoc.id;

  await Promise.all(
    eligible.map((o) =>
      orderRepository.update(o.id!, { payoutStatus: "requested", payoutId }),
    ),
  );

  eligible.forEach((o) => requested.push(o.id!));

  serverLogger.info("bulkSellerOrder: bulk payout requested", {
    userId,
    payoutId,
    orderCount: eligible.length,
    netAmount: bulkDeduction.netAmount,
  });

  return {
    payoutId,
    requested,
    skipped,
    eligibleCount: eligible.length,
    skippedCount: skipped.length,
    netAmount: bulkDeduction.netAmount,
    grossAmount,
    platformFee: bulkDeduction.platformFee,
  };
}

// --- Create Seller Product ----------------------------------------------------

export async function createSellerProduct(
  userId: string,
  userName: string,
  userEmail: string,
  input: Record<string, JsonValue>,
): Promise<void> {
  const finalizedData = await finalizeProductMediaReferences(input);
  await productRepository.create({
    ...finalizedData,
    sellerId: userId,
    sellerName: userName,
    sellerEmail: userEmail,
    // Pass through the caller's intended status (draft vs published) instead
    // of hardcoding "draft" — this previously made every "Publish" click
    // silently save as a draft regardless of what the wizard sent.
    status: (finalizedData as { status?: string }).status ?? "draft",
  } as any);
  serverLogger.info("createSellerProduct: product created", {
    userId,
    status: (finalizedData as { status?: string }).status ?? "draft",
  });
}

// --- Read Actions -------------------------------------------------------------

export async function getSellerStore(
  userId: string,
): Promise<StoreDocument | null> {
  return storeRepository.findByOwnerId(userId);
}

export async function getSellerShipping(userId: string) {
  const userData = await userRepository.findById(userId);
  if (!userData) return null;
  return userData.shippingConfig ?? null;
}

export async function getSellerPayoutSettings(userId: string) {
  const userData = await userRepository.findById(userId);
  if (!userData?.payoutDetails) return { method: "upi", isConfigured: false };
  const details = userData.payoutDetails;
  if (!details.bankAccount) return details;
  const { accountNumber: _removed, ...safeBank } = details.bankAccount;
  return { ...details, bankAccount: safeBank };
}

export async function listSellerOrders(
  userId: string,
  params?: SellerListParams,
): Promise<FirebaseSieveResult<OrderDocument>> {
  // productRepository.findByStore expects the store slug, not the seller's
  // Firebase UID — resolve the caller's store first.
  const store = await storeRepository.findByOwnerId(userId);
  if (!store) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: params?.pageSize ?? 20,
      totalPages: 0,
      hasMore: false,
    };
  }
  const sellerProducts = await productRepository.findByStore(store.id);
  const productIds = sellerProducts.map((p) => p.id);
  if (productIds.length === 0) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: params?.pageSize ?? 20,
      totalPages: 0,
      hasMore: false,
    };
  }
  return orderRepository.listForSeller(productIds, {
    filters: params?.filters,
    sorts: params?.sorts ?? "-createdAt",
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
  });
}

export async function getSellerAnalytics(userId: string) {
  // productRepository.findByStore expects the store slug, not the seller's
  // Firebase UID — resolve the caller's store first.
  const store = await storeRepository.findByOwnerId(userId);
  const products = store ? await productRepository.findByStore(store.id) : [];
  const productIds = products.map((p) => p.id);
  let allOrders: OrderDocument[] = [];
  if (productIds.length > 0) {
    const batches = await Promise.all(
      productIds
        .slice(0, 20)
        .map((id) =>
          orderRepository.findByProduct(id).catch(() => [] as OrderDocument[]),
        ),
    );
    allOrders = batches.flat();
  }
  const totalOrders = allOrders.length;
  const totalRevenue = allOrders.reduce((s, o) => s + (o.totalPrice ?? 0), 0);
  const totalProducts = products.length;
  const publishedProducts = products.filter(
    (p) => p.status === ProductStatusValues.PUBLISHED,
  ).length;
  const now = new Date();
  const monthMap = new Map<
    string,
    { month: string; orders: number; revenue: number }
  >();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, {
      month: d.toLocaleDateString("en", { month: "short", year: "numeric" }),
      orders: 0,
      revenue: 0,
    });
  }
  for (const o of allOrders) {
    const d = new Date(o.createdAt as any);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthMap.has(key)) {
      const e = monthMap.get(key)!;
      e.orders += 1;
      e.revenue += o.totalPrice ?? 0;
    }
  }
  return {
    totalOrders,
    totalRevenue,
    totalProducts,
    publishedProducts,
    monthlyRevenue: Array.from(monthMap.values()),
  };
}

export async function listSellerPayouts(
  userId: string,
  params?: { page?: number; pageSize?: number },
) {
  const payouts = await payoutRepository.findByStore(userId);
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const start = (page - 1) * pageSize;
  return {
    items: payouts.slice(start, start + pageSize),
    total: payouts.length,
    page,
    pageSize,
    hasMore: start + pageSize < payouts.length,
  };
}

export async function listSellerCoupons(
  userId: string,
): Promise<CouponDocument[]> {
  const store = await storeRepository.findByOwnerId(userId);
  if (!store) return [];
  return couponsRepository.getStoreCoupons(store.id);
}

export async function listSellerMyProducts(
  userId: string,
  params?: SellerListParams,
) {
  const store = await storeRepository.findByOwnerId(userId);
  if (!store) return { items: [], total: 0, page: 1, pageSize: params?.pageSize ?? 20, totalPages: 0, hasMore: false };
  const products = await productRepository.findByStore(store.id);
  let filtered = products;
  if (params?.filters?.includes("status==")) {
    const match = params.filters.match(/status==([\w]+)/);
    if (match) filtered = products.filter((p) => p.status === match[1]);
  }
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const start = (page - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.ceil(filtered.length / pageSize),
    hasMore: start + pageSize < filtered.length,
  };
}

export async function sellerUpdateProduct(
  userId: string,
  userRole: string,
  productId: string,
  input: Record<string, JsonValue>,
): Promise<ProductDocument> {
  const existing = await productRepository.findById(productId);
  if (!existing) throw new NotFoundError("Product not found");
  // existing.storeId is the store slug, not the seller's Firebase UID.
  if (userRole !== "admin") {
    const store = await storeRepository.findByOwnerId(userId);
    if (!store || existing.storeId !== store.id)
      throw new AuthorizationError("You do not own this product");
  }
  if (
    typeof input.status === "string" &&
    input.status !== "published" &&
    existing.status === "published"
  ) {
    assertPrizeDrawNotLocked(existing, "unpublished or archived");
  }
  assertPrizeDrawWonItemsImmutable(existing, input.prizeDrawItems);
  const finalizedData = await finalizeProductMediaReferences(input);
  const updated = await productRepository.updateProduct(
    productId,
    finalizedData as any,
  );
  serverLogger.info("sellerUpdateProduct", { userId, productId });
  return updated;
}

export async function sellerDeleteProduct(
  userId: string,
  userRole: string,
  productId: string,
): Promise<void> {
  const existing = await productRepository.findById(productId);
  if (!existing) throw new NotFoundError("Product not found");
  // existing.storeId is the store slug, not the seller's Firebase UID.
  if (userRole !== "admin") {
    const store = await storeRepository.findByOwnerId(userId);
    if (!store || existing.storeId !== store.id)
      throw new AuthorizationError("You do not own this product");
  }
  assertPrizeDrawNotLocked(existing, "deleted");
  await productRepository.delete(productId);
  serverLogger.info("sellerDeleteProduct", { userId, productId });
}

// --- Custom Ship Order --------------------------------------------------------

/**
 * EMI orders stay unshipped until every installment is paid, UNLESS every
 * product in the order has its `allowShipBeforeEmiComplete` flag set. This
 * is the single choke point for the "ship" transition, so it can't be
 * bypassed by a different route/action reaching `orderRepository.update`
 * directly with `status: "shipped"`.
 */
export async function assertEmiShippable(order: OrderDocument): Promise<void> {
  if (!order.emiEnabled || order.emiComplete) return;
  const productIds = (order.items ?? []).map((i) => i.productId).filter(Boolean);
  const products = await Promise.all(productIds.map((id) => productRepository.findById(id)));
  const allAllowEarlyShip = products.length > 0 && products.every((p) => p?.allowShipBeforeEmiComplete === true);
  if (!allAllowEarlyShip) {
    throw new ValidationError(
      "This order is still on an EMI plan — it can't ship until all installments are paid, unless the seller has enabled early shipping for every item in the order.",
    );
  }
}

export async function customShipOrder(
  userId: string,
  userRole: string,
  orderId: string,
  input: CustomShipOrderInput,
): Promise<{ orderId: string; method: string }> {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new NotFoundError("Order not found");
  // order.storeId is the store slug, not the seller's Firebase UID.
  if (userRole !== "admin") {
    const store = await storeRepository.findByOwnerId(userId);
    if (!store || order.storeId !== store.id)
      throw new AuthorizationError("You do not own this order");
  }
  if (
    order.status === OrderStatusValues.SHIPPED ||
    order.status === OrderStatusValues.DELIVERED
  )
    throw new ValidationError("Order is already shipped");
  if (order.status !== OrderStatusValues.CONFIRMED)
    throw new ValidationError("Order must be confirmed before shipping");
  await assertEmiShippable(order);

  await orderRepository.update(orderId, {
    status: OrderStatusValues.SHIPPED,
    shippingMethod: "custom",
    shippingCarrier: input.shippingCarrier,
    trackingNumber: input.trackingNumber,
    trackingUrl: input.trackingUrl,
    shippingDate: new Date(),
    payoutStatus: "eligible",
  });

  serverLogger.info("customShipOrder", {
    orderId,
    userId,
    carrier: input.shippingCarrier,
  });
  return { orderId, method: "custom" };
}

/**
 * Records collection of one EMI installment. Seller/admin marks the
 * installment paid after verifying the buyer's manual transfer (UTR +
 * proof). Recomputes `emiRemainingBalance` from the still-pending
 * installments and flips `emiComplete` once none remain — that flag is the
 * single gate `assertEmiShippable` reads, so this is the only place an
 * EMI order can become shippable.
 */
export async function markEmiInstallmentPaid(
  userId: string,
  userRole: string,
  orderId: string,
  input: MarkEmiInstallmentPaidInput,
): Promise<OrderDocument> {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new NotFoundError("Order not found");
  // order.storeId is the store slug, not the seller's Firebase UID.
  if (userRole !== "admin") {
    const store = await storeRepository.findByOwnerId(userId);
    if (!store || order.storeId !== store.id)
      throw new AuthorizationError("You do not own this order");
  }
  if (!order.emiEnabled) throw new ValidationError("This order is not on an EMI plan");

  const installments = order.emiInstallments ?? [];
  const target = installments.find((i) => i.index === input.installmentIndex);
  if (!target) throw new ValidationError(`Installment ${input.installmentIndex} not found on this order`);
  if (target.status === "paid") throw new ValidationError("This installment is already marked paid");

  const updatedInstallments = installments.map((i) =>
    i.index === input.installmentIndex
      ? {
          ...i,
          status: "paid" as const,
          paidAt: new Date(),
          transactionId: input.transactionId,
          proofUrl: input.proofUrl,
        }
      : i,
  );
  const emiRemainingBalance = updatedInstallments
    .filter((i) => i.status !== "paid")
    .reduce((sum, i) => sum + i.amount, 0);
  const emiComplete = updatedInstallments.every((i) => i.status === "paid");

  const updated = await orderRepository.update(orderId, {
    emiInstallments: updatedInstallments,
    emiRemainingBalance,
    emiComplete,
  });

  serverLogger.info("markEmiInstallmentPaid", {
    orderId,
    userId,
    installmentIndex: input.installmentIndex,
    emiComplete,
  });
  return updated;
}
