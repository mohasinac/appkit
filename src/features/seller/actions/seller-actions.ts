/**
 * Seller Domain Actions — appkit
 *
 * Pure async functions (no auth, no rate-limit). Accept userId/adminId as
 * explicit params. Called by letitrip thin wrappers that handle auth,
 * rate-limiting, and user-facing validation.
 *
 * Note: Shiprocket-specific actions (updateSellerShipping,
 * verifyShiprocketPickupOtp, shiprocketShipOrder) remain in the letitrip
 * thin wrapper because they use the @/lib/shiprocket/client SDK which is
 * a permanent letitrip-only dependency.
 */

import { serverLogger } from "../../../monitoring";
import {
  ApiError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../../../errors";
import { userRepository } from "../../auth/repository/user.repository";
import { storeRepository } from "../../stores/repository/store.repository";
import { productRepository } from "../../products/repository/products.repository";
import { orderRepository } from "../../orders/repository/orders.repository";
import { payoutRepository } from "../../payments/repository/payout.repository";
import { couponsRepository } from "../../promotions/repository/coupons.repository";
import { generateStoreSlug } from "../../stores/schemas/firestore";
import { DEFAULT_PLATFORM_FEE_RATE } from "../../payments/schemas/firestore";
import {
  finalizeStagedMediaUrl,
  finalizeStagedMediaField,
  finalizeStagedMediaArray,
} from "../../media/finalize";
import type {
  UserDocument,
  SellerPayoutDetails,
  SellerShippingConfig,
} from "../../auth/schemas/firestore";
import type { StoreDocument } from "../../stores/schemas/firestore";
import type { ProductDocument } from "../../products/schemas/firestore";
import type { OrderDocument } from "../../orders/schemas/firestore";
import type { CouponDocument } from "../../promotions/schemas/firestore";
import type { FirebaseSieveResult } from "../../../providers/db-firebase/index";

// ─── Types ────────────────────────────────────────────────────────────────────

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

export interface SellerListParams {
  filters?: string;
  sorts?: string;
  page?: number;
  pageSize?: number;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function finalizeProductMediaReferences<
  T extends Record<string, unknown>,
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

// ─── Become Seller ────────────────────────────────────────────────────────────

export async function becomeSeller(
  userId: string,
): Promise<BecomeSellerResult> {
  const profile = await userRepository.findById(userId);
  if (profile?.role === "seller" || profile?.role === "admin") {
    return {
      alreadySeller: true,
      storeStatus:
        (profile.storeStatus as "pending" | "approved" | "rejected") ??
        "pending",
    };
  }

  await userRepository.update(userId, {
    role: "seller",
    storeStatus: "pending",
  } as Partial<UserDocument>);

  serverLogger.info("becomeSeller: application submitted", { userId });
  return { storeStatus: "pending" };
}

// ─── Create Store ─────────────────────────────────────────────────────────────

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

  const store = await storeRepository.create({
    storeSlug,
    ownerId: userId,
    storeName,
    storeDescription: storeDescription || undefined,
    storeCategory: storeCategory || undefined,
    isPublic: false,
    status: "pending",
  });

  await userRepository.update(userId, {
    storeId: store.id,
    storeSlug: store.storeSlug,
    storeStatus: "pending",
  } as Parameters<typeof userRepository.update>[1]);

  serverLogger.info("createStore: store created", {
    userId,
    storeSlug: store.storeSlug,
  });
  return { store };
}

// ─── Update Store ─────────────────────────────────────────────────────────────

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

// ─── Update Payout Settings ───────────────────────────────────────────────────

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

// ─── Request Payout ───────────────────────────────────────────────────────────

async function computeSellerEarnings(sellerId: string) {
  const products = await productRepository.findBySeller(sellerId);
  const productIds = products.slice(0, 50).map((p) => p.id);

  let deliveredOrders: OrderDocument[] = [];
  if (productIds.length > 0) {
    const batches = await Promise.all(
      productIds.map((id) =>
        orderRepository.findByProduct(id).catch(() => [] as OrderDocument[]),
      ),
    );
    deliveredOrders = batches.flat().filter((o) => o.status === "delivered");
  }

  const paidOutIds = await payoutRepository.getPaidOutOrderIds(sellerId);
  const eligibleOrders = deliveredOrders.filter((o) => !paidOutIds.has(o.id));

  const grossAmount = eligibleOrders.reduce(
    (sum, o) => sum + (o.totalPrice ?? 0),
    0,
  );
  const platformFee = parseFloat(
    (grossAmount * DEFAULT_PLATFORM_FEE_RATE).toFixed(2),
  );
  const netAmount = parseFloat((grossAmount - platformFee).toFixed(2));

  return {
    eligibleOrders,
    grossAmount,
    platformFee,
    netAmount,
    productCount: products.length,
  };
}

export async function requestPayout(
  userId: string,
  userName: string,
  userEmail: string,
  input: RequestPayoutInput,
): Promise<unknown> {
  const existing = await payoutRepository.findBySeller(userId);
  const hasPending = existing.some(
    (p) => p.status === "pending" || p.status === "processing",
  );
  if (hasPending)
    throw new ValidationError("A payout is already pending or processing.");

  const earnings = await computeSellerEarnings(userId);
  if (earnings.netAmount <= 0 || earnings.eligibleOrders.length === 0)
    throw new ValidationError("No eligible earnings available for payout.");

  const payout = await payoutRepository.create({
    sellerId: userId,
    sellerName: userName,
    sellerEmail: userEmail,
    amount: earnings.netAmount,
    grossAmount: earnings.grossAmount,
    platformFee: earnings.platformFee,
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    currency: "INR",
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

// ─── Bulk Seller Order ────────────────────────────────────────────────────────

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
    if (userRole !== "admin" && order.sellerId !== userId) {
      skipped.push(id);
      continue;
    }
    if (order.status !== "delivered") {
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
    eligible.push(order as NonNullable<typeof order>);
  }

  if (eligible.length === 0)
    throw new ValidationError("No eligible orders found.");

  const PLATFORM_COMMISSION_RATE = DEFAULT_PLATFORM_FEE_RATE;
  const grossAmount = eligible.reduce((sum, o) => sum + (o.totalPrice ?? 0), 0);
  const platformFee =
    Math.round(grossAmount * PLATFORM_COMMISSION_RATE * 100) / 100;
  const netAmount = Math.round((grossAmount - platformFee) * 100) / 100;

  const payoutDoc = await payoutRepository.create({
    sellerId: userId,
    sellerName: userDisplayName,
    sellerEmail: userEmail,
    orderIds: eligible.map((o) => o.id!),
    amount: netAmount,
    grossAmount,
    platformFee,
    platformFeeRate: PLATFORM_COMMISSION_RATE,
    currency: "INR",
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
    netAmount,
  });

  return {
    payoutId,
    requested,
    skipped,
    eligibleCount: eligible.length,
    skippedCount: skipped.length,
    netAmount,
    grossAmount,
    platformFee,
  };
}

// ─── Create Seller Product ────────────────────────────────────────────────────

export async function createSellerProduct(
  userId: string,
  userName: string,
  userEmail: string,
  input: Record<string, unknown>,
): Promise<void> {
  const finalizedData = await finalizeProductMediaReferences(input);
  await productRepository.create({
    ...finalizedData,
    sellerId: userId,
    sellerName: userName,
    sellerEmail: userEmail,
    status: "draft",
  } as any);
  serverLogger.info("createSellerProduct: product created", { userId });
}

// ─── Read Actions ─────────────────────────────────────────────────────────────

export async function getSellerStore(
  userId: string,
): Promise<StoreDocument | null> {
  return storeRepository.findByOwnerId(userId);
}

export async function getSellerShipping(userId: string) {
  const userData = await userRepository.findById(userId);
  if (!userData) return null;
  const config = userData.shippingConfig;
  if (!config) return null;
  if (config.method === "shiprocket" && config.shiprocketToken) {
    const { shiprocketToken: _removed, ...safe } = config;
    return safe;
  }
  return config;
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
  const sellerProducts = await productRepository.findBySeller(userId);
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
  const products = await productRepository.findBySeller(userId);
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
    (p) => p.status === "published",
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
  const payouts = await payoutRepository.findBySeller(userId);
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
  return couponsRepository.getSellerCoupons(userId);
}

export async function listSellerMyProducts(
  userId: string,
  params?: SellerListParams,
) {
  const products = await productRepository.findBySeller(userId);
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
  input: Record<string, unknown>,
): Promise<ProductDocument> {
  const existing = await productRepository.findById(productId);
  if (!existing) throw new NotFoundError("Product not found");
  if (userRole !== "admin" && existing.sellerId !== userId)
    throw new AuthorizationError("You do not own this product");
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
  if (userRole !== "admin" && existing.sellerId !== userId)
    throw new AuthorizationError("You do not own this product");
  await productRepository.delete(productId);
  serverLogger.info("sellerDeleteProduct", { userId, productId });
}

// ─── Custom Ship Order ────────────────────────────────────────────────────────

export async function customShipOrder(
  userId: string,
  userRole: string,
  orderId: string,
  input: CustomShipOrderInput,
): Promise<{ orderId: string; method: string }> {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new NotFoundError("Order not found");
  if (userRole !== "admin" && order.sellerId !== userId)
    throw new AuthorizationError("You do not own this order");
  if (order.status === "shipped" || order.status === "delivered")
    throw new ValidationError("Order is already shipped");
  if (order.status !== "confirmed")
    throw new ValidationError("Order must be confirmed before shipping");

  await orderRepository.update(orderId, {
    status: "shipped",
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
