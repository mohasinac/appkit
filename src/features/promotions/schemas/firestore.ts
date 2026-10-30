/**
 * Coupons/Promotions Firestore Document Types & Constants
 */

import { generateCouponId } from "../../../utils/id-generators";
import type { CouponType } from "../types";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";

export interface DiscountConfig {
  /** Percentage (0-100) when type === "percentage"; decimal rupees when type === "fixed". */
  value: number;
  maxDiscount?: number;
  minPurchase?: number;
}

export interface BXGYConfig {
  buyQuantity: number;
  getQuantity: number;
  /**
   * Per-UNIT price ceiling, in decimal rupees. A unit priced above this does
   * not qualify: it neither counts toward a block nor can be given free.
   *
   * 🛑 This is a UNIT price, not a line total and not the order total — the
   * promotion it exists for is "buy 3 get 1 free on items under ₹2,000", and
   * `discount.minPurchase` already covers the order-total reading. A line of
   * quantity 3 at ₹1,500 contributes three qualifying units, not one ₹4,500
   * item that fails the ceiling.
   *
   * Omitted means no ceiling, which is what every BOGO coupon written before
   * 2026-10-22 means. Do not default it to a number — a ceiling nobody asked
   * for would silently shrink an existing coupon's discount.
   */
  maxItemPrice?: number;
  applicableProducts?: string[];
  applicableCategories?: string[];
}

export interface TieredDiscount {
  minAmount: number;
  /** Percentage (0-100) when the coupon type === "percentage"; decimal rupees when type === "fixed". */
  discountValue: number;
}

export interface UsageConfig {
  totalLimit?: number;
  perUserLimit?: number;
  currentUsage: number;
}

export interface ValidityConfig {
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

export interface RestrictionsConfig {
  applicableProducts?: string[];
  applicableCategories?: string[];
  applicableSellers?: string[];
  excludeProducts?: string[];
  excludeCategories?: string[];
  firstTimeUserOnly: boolean;
}

export interface CouponStats {
  totalUses: number;
  totalRevenue: number;
  totalDiscount: number;
}

export interface CouponDocument extends BaseDocument {
  /** Word-prefix search tokens. Derived on write; never fed by a PII field. */
  searchTxt?: string[];
  code: string;
  name: string;
  description: string;
  type: CouponType;
  scope: "admin" | "seller";
  /** For seller-scoped coupons: the storeId (= storeSlug = store.id) of the issuing store */
  storeId?: string;
  applicableToAuctions?: boolean;
  discount: DiscountConfig;
  bxgy?: BXGYConfig;
  tiers?: TieredDiscount[];
  /**
   * D51 — percentage of the amount PAID that a `points_earn` coupon awards as
   * points. Meaningless, and ignored, on every other type.
   *
   * ## 🛑 Why this is not `discount.value`
   *
   * `discount` is read by `computeGroupCouponDiscount` to reduce the order.
   * Overloading its `value` to mean "percent awarded as points" would make a
   * points coupon discount the order by the same number it was supposed to
   * credit — the exact overloading that `bxgy` and `tiers` are separate fields
   * to avoid.
   *
   * `discount` stays REQUIRED on the interface because every existing coupon
   * has one and widening it to optional would ripple through ~30 readers; a
   * points coupon carries `{ value: 0 }`. The protection that matters is in
   * the discount loop, which skips on TYPE rather than trusting that zero
   * (`coupon-discount.ts`) — bad data cannot bypass a type check.
   *
   * The base is the post-discount amount actually paid in money, which is
   * `POINTS_EARN_PERCENT`'s existing rule; this field exists so a campaign can
   * raise it (the festival double event) without editing a constant.
   */
  pointsPercent?: number;
  usage: UsageConfig;
  validity: ValidityConfig;
  restrictions: RestrictionsConfig;
  createdBy: string;
  stats: CouponStats;
}

export type CouponUsageDocument = {
  id: string;
  userId: string;
  couponCode: string;
  usageCount: number;
  lastUsedAt: Date;
  orders: string[];
}

// ─── Claimed Coupons (user wallet) ──────────────────────────────────────────
// Plan §10 — one row per (userId, couponCode). Top-level collection so the
// wallet page is a single indexed query; soft-delete preserves history.

export type ClaimedCouponStatus = "active" | "expired" | "used";
export type ClaimedCouponSource =
  | "manual"
  | "promo"
  | "spin"
  | "raffle"
  | "random-lots";

export interface ClaimedCouponSnapshot {
  name: string;
  description?: string;
  type: CouponType;
  scope: "admin" | "seller";
  storeId?: string;
  discount: DiscountConfig;
  restrictions: RestrictionsConfig;
}

export interface ClaimedCouponDocument extends BaseDocument {
  userId: string;
  couponId: string;
  couponCode: string;
  /** Source surface that initiated the claim — useful for analytics + UX. */
  source: ClaimedCouponSource;
  /** Denormalised snapshot so the wallet list renders without joins. */
  couponSnapshot: ClaimedCouponSnapshot;
  /** Lifecycle: active → used after redemption, → expired when validity.endDate passes. */
  status: ClaimedCouponStatus;
  /** Mirrors coupon.validity.endDate; null when the coupon is open-ended. */
  expiresAt?: Date | null;
  /** Set when status transitions to "used". */
  usedAt?: Date;
  /** Set when status transitions to "used". */
  usedOrderId?: string;
  claimedAt: Date;
}

export const CLAIMED_COUPONS_COLLECTION = "claimedCoupons" as const;

export const CLAIMED_COUPONS_INDEXED_FIELDS = [
  "userId",
  "couponCode",
  "status",
  "expiresAt",
] as const;

export function createClaimedCouponId(userId: string, couponCode: string): string {
  // Mirrors the wishlist/history "claimed-{userSlug}-{code}" prefix convention.
  const userSlug = userId.replace(/^user-/, "").toLowerCase();
  const code = couponCode.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `claimed-${userSlug}-${code}`;
}

export const COUPONS_COLLECTION = "coupons" as const;
export const COUPON_USAGE_SUBCOLLECTION = "couponUsage" as const;

export const COUPONS_INDEXED_FIELDS = [
  "searchTxt",
  "code",
  "validity.isActive",
  "validity.startDate",
  "validity.endDate",
  "type",
  "createdBy",
] as const;

export const COUPON_FIELDS = {
  CODE: "code",
  TYPE: "type",
  SCOPE: "scope",
  CREATED_BY: "createdBy",
  STORE_ID: "storeId",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
  VALIDITY: {
    IS_ACTIVE: "validity.isActive",
    START_DATE: "validity.startDate",
    END_DATE: "validity.endDate",
  },
  USAGE: {
    CURRENT_USAGE: "usage.currentUsage",
    TOTAL_LIMIT: "usage.totalLimit",
  },
  TYPE_VALUES: {
    PERCENTAGE: "percentage" as CouponType,
    FIXED: "fixed" as CouponType,
    FREE_SHIPPING: "free_shipping" as CouponType,
    BUY_X_GET_Y: "buy_x_get_y" as CouponType,
    POINTS_EARN: "points_earn" as CouponType,
  },
  SCOPE_VALUES: {
    ADMIN: "admin" as const,
    SELLER: "seller" as const,
  },
} as const;

export const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  percentage: "Percentage Discount",
  fixed: "Fixed Amount Discount",
  free_shipping: "Free Shipping",
  buy_x_get_y: "Buy X Get Y",
  // Named for what the buyer gets, not for the mechanism. "Points earn" is
  // our word for it; "Points back" is what appears on their balance.
  points_earn: "Points Back",
};

export const DEFAULT_COUPON_DATA: Partial<CouponDocument> = {
  usage: { currentUsage: 0 },
  validity: { isActive: true, startDate: new Date(), endDate: undefined },
  restrictions: { firstTimeUserOnly: false },
  stats: { totalUses: 0, totalRevenue: 0, totalDiscount: 0 },
};

export const COUPONS_PUBLIC_FIELDS = [
  "id",
  "code",
  "name",
  "description",
  "type",
  "discount",
  "validity.startDate",
  "validity.endDate",
  "usage.totalLimit",
  "usage.perUserLimit",
] as const;

export const COUPONS_UPDATABLE_FIELDS = [
  "name",
  "description",
  "discount",
  "bxgy",
  "tiers",
  "usage",
  "validity",
  "restrictions",
] as const;

export type CouponCreateInput = Omit<
  CouponDocument,
  "id" | "createdAt" | "updatedAt" | "stats"
> & {
  stats?: Partial<CouponStats>;
};

export type CouponUpdateInput = Partial<
  Pick<
    CouponDocument,
    | "name"
    | "description"
    | "discount"
    | "bxgy"
    | "tiers"
    | "usage"
    | "validity"
    | "restrictions"
    | "applicableToAuctions"
  >
>;

export interface CouponValidationResult {
  valid: boolean;
  discountAmount: number;
  error?: string;
  message?: string;
}

export const couponQueryHelpers = {
  byCode: (code: string) => ["code", "==", code.toUpperCase()] as const,
  active: () => ["validity.isActive", "==", true] as const,
  inactive: () => ["validity.isActive", "==", false] as const,
  byType: (type: CouponType) => ["type", "==", type] as const,
  byCreator: (userId: string) => ["createdBy", "==", userId] as const,
  byStore: (storeId: string) => ["storeId", "==", storeId] as const,
  expiringSoon: (days = 7) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return ["validity.endDate", "<=", futureDate] as const;
  },
} as const;

export function createCouponId(code: string): string {
  return generateCouponId(code);
}

export function isValidCouponCode(code: string): boolean {
  const regex = /^[A-Z0-9][A-Z0-9-]{2,28}[A-Z0-9]$|^[A-Z0-9]{4,20}$/;
  return regex.test(code) && !code.startsWith("-") && !code.endsWith("-");
}

export function sellerCouponCodePrefix(storeSlug: string): string {
  return storeSlug.replace(/-/g, "").toUpperCase().slice(0, 10);
}

export function buildSellerCouponCode(
  storeSlug: string,
  sellerCode: string,
): string {
  return `${sellerCouponCodePrefix(storeSlug)}-${sellerCode.toUpperCase()}`;
}

export function isCouponValid(coupon: CouponDocument): boolean {
  const now = new Date();
  const startDate = new Date(coupon.validity.startDate);
  const endDate = coupon.validity.endDate
    ? new Date(coupon.validity.endDate)
    : null;
  return (
    coupon.validity.isActive &&
    startDate <= now &&
    (!endDate || endDate >= now) &&
    (coupon.usage.totalLimit === undefined ||
      coupon.usage.currentUsage < coupon.usage.totalLimit)
  );
}

/**
 * Is this coupon worth SHOWING to a reader? (As distinct from `isCouponValid`,
 * which asks whether the till will honour it right now.)
 *
 * 🛑 THE DIFFERENCE IS ONE CLAUSE — `startDate <= now` — AND IT WAS A REAL,
 * USER-REPORTED BUG. The Diwali event attaches four codes that open on
 * Dhanteras. Every display surface filtered them with `isCouponValid`, so
 * through all of October the event page rendered ONE coupon (its `offerConfig`
 * headline, which is not filtered) where the event carries five, the homepage
 * rail would have been empty, and the `/promotions` Coupons tab counted zero
 * while its own client-side listing happily fetched and rendered them from
 * `/api/coupons` — which has never applied the start-date clause.
 *
 * So three server surfaces disagreed with the one client surface about whether
 * a published-ahead code exists.
 *
 * The event's own copy settles which side is right: *"The code is published now
 * so you can save it ahead of time."* Publishing a code before it opens is the
 * intended behaviour, not an accident, and a page that hides it is breaking the
 * promise the page itself makes.
 *
 * 🛑 EXPIRED AND INACTIVE ARE STILL DROPPED, and that half must not be relaxed.
 * A reader who copies a dead code does the work and is refused at the till —
 * strictly worse than seeing nothing. "Not yet" is a fact a card can state;
 * "no longer" is a card that wastes someone's time.
 *
 * Use `isCouponValid` wherever the question is "may this be redeemed" —
 * checkout, validation, `canUserUseCoupon`. Use this one wherever the question
 * is "should a human see this".
 */
export function isCouponDisplayable(coupon: CouponDocument): boolean {
  const now = new Date();
  const endDate = coupon.validity.endDate
    ? new Date(coupon.validity.endDate)
    : null;
  return (
    coupon.validity.isActive &&
    (!endDate || endDate >= now) &&
    (coupon.usage.totalLimit === undefined ||
      coupon.usage.currentUsage < coupon.usage.totalLimit)
  );
}

/** Has this coupon been published ahead of its opening date? */
export function isCouponUpcoming(coupon: CouponDocument): boolean {
  return new Date(coupon.validity.startDate) > new Date();
}

export function canUserUseCoupon(
  coupon: CouponDocument,
  userUsageCount: number,
): boolean {
  if (!isCouponValid(coupon)) return false;
  if (coupon.usage.perUserLimit === undefined) return true;
  return userUsageCount < coupon.usage.perUserLimit;
}

/** One cart line, as much of it as a BOGO calculation needs. */
export interface DiscountableLine {
  price: number;
  quantity: number;
}

/**
 * "Buy X, get Y free" over the ELIGIBLE lines.
 *
 * 🛑 THE BUG THIS CLOSES: a BOGO coupon discounted ₹0.
 *
 * `calculateDiscount` had `case "buy_x_get_y": discountAmount = 0`, sharing a
 * branch with `free_shipping`. That zero is CORRECT for free shipping — the
 * waiver is honoured downstream as a shipping line, not as a discount — but
 * `buy_x_get_y` had no second path anywhere: `coupon.bxgy` had **zero read
 * sites in the repo**. So an admin could create and save a BOGO coupon,
 * `validateCouponForCart` would answer "Coupon is valid", `CouponCard` would
 * render a BOGO badge, and the buyer paid full price.
 *
 * WHY THIS NEEDS ITS OWN FUNCTION: BOGO cannot be computed from a total. Which
 * units are free depends on individual unit prices, so the line items are
 * required input. `calculateDiscount(coupon, total)` structurally could not
 * express it, which is how the `= 0` came to look like a complete branch.
 *
 * THE RULE: units are grouped in blocks of `buyQuantity + getQuantity`, and in
 * each complete block the CHEAPEST `getQuantity` units are free. Cheapest-free
 * is the conventional retail reading of "buy 2 get 1 free" and the one a buyer
 * expects to be charged; awarding the dearest would make the same promotion
 * worth a different amount depending on basket order.
 *
 * 🛑 An INCOMPLETE block earns nothing. "Buy 2 get 1" on 2 units is a block of
 * 2 against a required 3, so the discount is 0 — not a partial credit.
 *
 * 🛑 `bxgy.maxItemPrice` filters the UNIT POOL before blocks are formed, so an
 * over-ceiling unit neither counts toward a block nor can be free. Filtering
 * only the free-unit selection instead would let four ₹5,000 tops earn a free
 * one under an "items under ₹2,000" promotion, because the cheapest of four
 * dear units is still dear. The ceiling defines what the promotion is ABOUT,
 * not merely what it pays out.
 */
export function calculateBxgyDiscount(
  bxgy: BXGYConfig | undefined,
  lines: readonly DiscountableLine[],
): number {
  if (!bxgy) return 0;
  const buy = Math.floor(bxgy.buyQuantity);
  const get = Math.floor(bxgy.getQuantity);
  // A non-positive `get` awards nothing; a non-positive `buy` would make every
  // unit free, which is a misconfiguration, not a promotion.
  if (!Number.isFinite(buy) || !Number.isFinite(get) || buy <= 0 || get <= 0) return 0;

  /*
   * A non-finite or non-positive ceiling is a misconfiguration, and treating
   * it as "0" would disqualify every unit and silently zero the coupon. Treat
   * it as absent — the same thing an omitted ceiling means.
   */
  const ceiling =
    typeof bxgy.maxItemPrice === "number" &&
    Number.isFinite(bxgy.maxItemPrice) &&
    bxgy.maxItemPrice > 0
      ? bxgy.maxItemPrice
      : undefined;

  // Expand to one entry per UNIT — a line of quantity 3 contributes 3 prices,
  // because the free units are counted in units, not in lines.
  const unitPrices: number[] = [];
  for (const line of lines) {
    const qty = Math.floor(line.quantity);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    if (!Number.isFinite(line.price) || line.price < 0) continue;
    // Inclusive: "under ₹2,000" is authored as maxItemPrice 1999 when the
    // boundary matters. An exclusive test here would make a ₹2,000 ceiling
    // reject a ₹2,000 item, which is not how a price cap reads to an admin.
    if (ceiling !== undefined && line.price > ceiling) continue;
    for (let i = 0; i < qty; i++) unitPrices.push(line.price);
  }

  const blockSize = buy + get;
  const freeUnits = Math.floor(unitPrices.length / blockSize) * get;
  if (freeUnits <= 0) return 0;

  unitPrices.sort((a, b) => a - b);
  let discount = 0;
  for (let i = 0; i < freeUnits; i++) discount += unitPrices[i];
  return discount;
}

export function calculateDiscount(
  coupon: CouponDocument,
  orderTotal: number,
  /**
   * The eligible lines, for the types that need them.
   *
   * Optional because one of the two callers — `validateCoupon(code, userId,
   * orderTotal)` — only ever has a total. That caller gets 0 for a BOGO
   * coupon, which is honest: the discount is genuinely unknowable without the
   * basket. `validateCouponForCart` DOES hold the eligible lines (it already
   * reduces them to `eligibleSubtotal`) and passes them.
   */
  lines?: readonly DiscountableLine[],
): number {
  if (coupon.discount.minPurchase && orderTotal < coupon.discount.minPurchase)
    return 0;

  /*
   * ── Tiered discounts ──────────────────────────────────────────────────────
   *
   * 🛑 `tiers` HAS BEEN ON `CouponDocument` SINCE IT SHIPPED, AND NOTHING EVER
   * READ IT. `getTieredDiscount` existed, was exported from the barrel, and
   * had ZERO callers — so a coupon carrying tiers was charged at its flat
   * `discount.value` and the tiers did nothing at all. This is the reader.
   *
   * A tier REPLACES `discount.value` rather than adding to it, which is what
   * its own field comment describes: "Percentage (0-100) when the coupon type
   * === percentage; decimal rupees when type === fixed". So the tier is the
   * value for that band, not a bonus on top.
   *
   * 🛑 Only `percentage` and `fixed` consult it. A BOGO's value lives in
   * `bxgy` and free shipping is a shipping-line waiver, so neither has a
   * `discount.value` for a tier to replace — applying one there would be
   * inventing semantics the field does not define.
   *
   * 🛑 `> 0` means "a tier matched". `getTieredDiscount` returns 0 for all
   * three of "no tiers", "no band matched" and "the matched band is worth
   * zero", and those are indistinguishable in its signature. That is fine
   * here ONLY because a zero-value tier is a no-op either way — it would
   * discount nothing whether honoured or ignored. Do not reuse this test for
   * anything where zero is a meaningful outcome.
   */
  const tieredValue = getTieredDiscount(coupon.tiers, orderTotal);
  const effectiveValue =
    tieredValue > 0 ? tieredValue : coupon.discount.value;

  let discountAmount = 0;
  switch (coupon.type) {
    case "percentage":
      // audit-money-units-ok: percentage divisor (effectiveValue is 0-100), not paise
      discountAmount = (orderTotal * effectiveValue) / 100;
      if (
        coupon.discount.maxDiscount &&
        discountAmount > coupon.discount.maxDiscount
      ) {
        discountAmount = coupon.discount.maxDiscount;
      }
      break;
    case "fixed":
      discountAmount = Math.min(effectiveValue, orderTotal);
      break;
    case "buy_x_get_y":
      // Needs the basket — see calculateBxgyDiscount. Capped at the total so a
      // misconfigured coupon cannot discount more than is being bought.
      discountAmount = Math.min(
        calculateBxgyDiscount(coupon.bxgy, lines ?? []),
        orderTotal,
      );
      break;
    case "free_shipping":
      // Genuinely 0 HERE. The waiver is applied as a shipping line downstream,
      // not as a discount — this is the one type for which zero is the answer.
      discountAmount = 0;
      break;
  }
  return discountAmount;
}

export function getTieredDiscount(
  tiers: TieredDiscount[] | undefined,
  orderTotal: number,
): number {
  if (!tiers || tiers.length === 0) return 0;
  const sortedTiers = [...tiers].sort((a, b) => b.minAmount - a.minAmount);
  for (const tier of sortedTiers) {
    if (orderTotal >= tier.minAmount) return tier.discountValue;
  }
  return 0;
}
