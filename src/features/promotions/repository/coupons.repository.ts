/**
 * Coupons Repository
 *
 * Manages coupon creation, validation, and usage tracking
 */

import {
  BaseRepository,
  prepareForFirestore,
} from "../../../providers/db-firebase";
import type {
  SieveModel,
  FirebaseSieveResult,
} from "../../../providers/db-firebase";
import {
  COUPONS_COLLECTION,
  CouponDocument,
  CouponUsageDocument,
  CouponCreateInput,
  isValidCouponCode,
  isCouponValid,
  canUserUseCoupon,
  calculateDiscount,
  createCouponId,
} from "../schemas";
import type { CouponType } from "../types";
import { USER_COLLECTION } from "../../auth/schemas";
import { DatabaseError } from "../../../errors";
import { increment, serverTimestamp } from "../../../contracts/field-ops";
import type { DocumentReference, WriteBatch } from "firebase-admin/firestore";

const COUPON_USAGE_SUBCOLLECTION = "couponUsage" as const;
const COUPON_FIELDS = {
  CODE: "code",
  TYPE: "type",
  CREATED_BY: "createdBy",
  SELLER_ID: "sellerId",
  CREATED_AT: "createdAt",
  VALIDITY_FIELDS: {
    IS_ACTIVE: "validity.isActive",
    START_DATE: "validity.startDate",
    END_DATE: "validity.endDate",
  },
} as const;

/**
 * Repository for coupon management
 */
export class CouponsRepository extends BaseRepository<CouponDocument> {
  constructor() {
    super(COUPONS_COLLECTION);
  }

  /**
   * Create new coupon with SEO-friendly ID based on code
   */
  async create(input: CouponCreateInput): Promise<CouponDocument> {
    // Generate coupon ID from code
    const code = input.code || "COUPON";
    const id = createCouponId(code);

    const couponData = {
      ...input,
      stats: {
        totalUses: 0,
        totalRevenue: 0,
        totalDiscount: 0,
      },
      code: code.toUpperCase(), // Normalize to uppercase
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(couponData));

    return { id, ...couponData } as CouponDocument;
  }

  /**
   * Get coupon by code
   *
   * @param code - Coupon code (case-insensitive)
   * @returns Promise<CouponDocument | null>
   */
  async getCouponByCode(code: string): Promise<CouponDocument | null> {
    try {
      const upperCode = code.toUpperCase();
      const snapshot = await this.db
        .collection(this.collection)
        .where(COUPON_FIELDS.CODE, "==", upperCode)
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return this.mapDoc<CouponDocument>(doc);
    } catch (error) {
      throw new DatabaseError(
        `Failed to retrieve coupon by code: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get all active coupons
   *
   * @returns Promise<CouponDocument[]>
   */
  async getActiveCoupons(): Promise<CouponDocument[]> {
    try {
      const now = new Date();
      // Firestore-native compound filter. Requires composite index:
      // validity.isActive ASC + validity.endDate ASC (see firestore.indexes.json)
      const snapshot = await this.db
        .collection(this.collection)
        .where(COUPON_FIELDS.VALIDITY_FIELDS.IS_ACTIVE, "==", true)
        .where(COUPON_FIELDS.VALIDITY_FIELDS.END_DATE, ">=", now)
        .orderBy(COUPON_FIELDS.VALIDITY_FIELDS.END_DATE, "asc")
        .get();

      return snapshot.docs
        .map((doc) => this.mapDoc<CouponDocument>(doc))
        .filter((coupon) => isCouponValid(coupon)); // still checks startDate + usage
    } catch (error) {
      throw new DatabaseError(
        `Failed to retrieve active coupons: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get coupons by type
   *
   * @param type - Coupon type
   * @returns Promise<CouponDocument[]>
   */
  async getCouponsByType(type: CouponType): Promise<CouponDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("type", "==", type)
        .orderBy("createdAt", "desc")
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<CouponDocument>(doc));
    } catch (error) {
      throw new DatabaseError(
        `Failed to retrieve coupons by type: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get coupons created by specific user
   *
   * @param userId - Creator user ID
   * @returns Promise<CouponDocument[]>
   */
  async getCouponsByCreator(userId: string): Promise<CouponDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("createdBy", "==", userId)
        .orderBy("createdAt", "desc")
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<CouponDocument>(doc));
    } catch (error) {
      throw new DatabaseError(
        `Failed to retrieve coupons by creator: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get coupons expiring soon (within specified days)
   *
   * @param days - Number of days to look ahead
   * @returns Promise<CouponDocument[]>
   */
  async getCouponsExpiringSoon(days: number = 7): Promise<CouponDocument[]> {
    try {
      const now = new Date();
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      // Firestore-native range filter — reuses the same composite index as getActiveCoupons()
      const snapshot = await this.db
        .collection(this.collection)
        .where(COUPON_FIELDS.VALIDITY_FIELDS.IS_ACTIVE, "==", true)
        .where(COUPON_FIELDS.VALIDITY_FIELDS.END_DATE, ">", now)
        .where(COUPON_FIELDS.VALIDITY_FIELDS.END_DATE, "<=", futureDate)
        .orderBy(COUPON_FIELDS.VALIDITY_FIELDS.END_DATE, "asc")
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<CouponDocument>(doc));
    } catch (error) {
      throw new DatabaseError(
        `Failed to retrieve expiring coupons: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Validate coupon code (format and availability)
   *
   * @param code - Coupon code to validate
   * @param userId - User ID attempting to use coupon
   * @param orderTotal - Order total amount (for validation)
   * @returns Promise<{valid: boolean, coupon?: CouponDocument, message?: string}>
   */
  async validateCoupon(
    code: string,
    userId: string,
    orderTotal: number,
  ): Promise<{
    valid: boolean;
    coupon?: CouponDocument;
    discountAmount?: number;
    message?: string;
  }> {
    // Validate code format
    if (!isValidCouponCode(code)) {
      return {
        valid: false,
        message: "Invalid coupon code format",
      };
    }

    // Get coupon from database
    const coupon = await this.getCouponByCode(code);
    if (!coupon) {
      return {
        valid: false,
        message: "Coupon not found",
      };
    }

    // Check if coupon is valid (active, date range, usage limits)
    if (!isCouponValid(coupon)) {
      return {
        valid: false,
        coupon,
        message: "Coupon is not currently valid",
      };
    }

    // Check minimum purchase requirement
    if (
      coupon.discount.minPurchase &&
      orderTotal < coupon.discount.minPurchase
    ) {
      return {
        valid: false,
        coupon,
        message: "Minimum purchase requirement not met",
      };
    }

    // Check user-specific usage limit
    const userUsageCount = await this.getUserCouponUsageCount(
      userId,
      coupon.id,
    );
    if (!canUserUseCoupon(coupon, userUsageCount)) {
      return {
        valid: false,
        coupon,
        message: "You have reached the usage limit for this coupon",
      };
    }

    // Calculate discount
    const discountAmount = calculateDiscount(coupon, orderTotal);

    return {
      valid: true,
      coupon,
      discountAmount,
      message: "Coupon is valid",
    };
  }

  /**
   * Apply coupon to order (increment usage counters)
   *
   * @param couponId - Coupon ID
   * @param userId - User ID
   * @param orderId - Order ID
   * @param discountAmount - Applied discount amount
   * @returns Promise<void>
   */
  async applyCoupon(
    couponId: string,
    userId: string,
    orderId: string,
    discountAmount: number,
  ): Promise<void> {
    try {
      const batch = this.db.batch();

      // Update coupon usage stats
      const couponRef = this.db.collection(this.collection).doc(couponId);
      batch.update(couponRef, {
        "usage.currentUsage": increment(1),
        "stats.totalDiscountGiven": increment(discountAmount),
        "stats.totalOrders": increment(1),
        updatedAt: new Date(),
      });

      // Create user coupon usage record
      const usageData = {
        userId,
        couponCode: "", // Will be filled by getCouponByCode
        orderId,
        discountAmount,
        usedAt: new Date(),
      } as any;

      const usageRef = this.db
        .collection(USER_COLLECTION)
        .doc(userId)
        .collection(COUPON_USAGE_SUBCOLLECTION)
        .doc(couponId);

      batch.set(usageRef, prepareForFirestore(usageData));

      await batch.commit();
    } catch (error) {
      throw new DatabaseError(
        `Failed to apply coupon: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get user's coupon usage count for a specific coupon
   *
   * @param userId - User ID
   * @param couponId - Coupon ID
   * @returns Promise<number>
   */
  async getUserCouponUsageCount(
    userId: string,
    couponId: string,
  ): Promise<number> {
    try {
      const doc = await this.db
        .collection(USER_COLLECTION)
        .doc(userId)
        .collection(COUPON_USAGE_SUBCOLLECTION)
        .doc(couponId)
        .get();

      return doc.exists ? 1 : 0; // Document exists = used once (per our schema)
    } catch {
      return 0;
    }
  }

  /**
   * Get user's coupon usage history
   *
   * @param userId - User ID
   * @returns Promise<CouponUsageDocument[]>
   */
  async getUserCouponHistory(userId: string): Promise<CouponUsageDocument[]> {
    try {
      const snapshot = await this.db
        .collection(USER_COLLECTION)
        .doc(userId)
        .collection(COUPON_USAGE_SUBCOLLECTION)
        .orderBy("usedAt", "desc")
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<CouponUsageDocument>(doc));
    } catch (error) {
      throw new DatabaseError(
        `Failed to retrieve coupon history: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Deactivate a coupon
   *
   * @param couponId - Coupon ID to deactivate
   * @returns Promise<CouponDocument>
   */
  async deactivateCoupon(couponId: string): Promise<CouponDocument> {
    try {
      await this.db.collection(this.collection).doc(couponId).update({
        "validity.isActive": false,
        updatedAt: new Date(),
      });

      return await this.findByIdOrFail(couponId);
    } catch (error) {
      throw new DatabaseError(
        `Failed to deactivate coupon: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Reactivate a coupon
   *
   * @param couponId - Coupon ID to reactivate
   * @returns Promise<CouponDocument>
   */
  async reactivateCoupon(couponId: string): Promise<CouponDocument> {
    try {
      await this.db.collection(this.collection).doc(couponId).update({
        "validity.isActive": true,
        updatedAt: new Date(),
      });

      return await this.findByIdOrFail(couponId);
    } catch (error) {
      throw new DatabaseError(
        `Failed to reactivate coupon: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Seller-scoped helpers
  // ---------------------------------------------------------------------------

  /**
   * Get all coupons created by a specific seller.
   *
   * @param sellerId - The seller's user UID
   */
  async getSellerCoupons(sellerId: string): Promise<CouponDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(COUPON_FIELDS.SELLER_ID, "==", sellerId)
        .orderBy(COUPON_FIELDS.CREATED_AT, "desc")
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<CouponDocument>(doc));
    } catch (error) {
      throw new DatabaseError(
        `Failed to retrieve seller coupons: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Validate a coupon against the cart items and return a per-item breakdown.
   *
   * Business rules enforced here:
   * - Pre-order items are NEVER eligible for any coupon.
   * - Admin coupons apply to all non-pre-order items that satisfy product/
   *   category restrictions.
   * - Seller coupons apply only to non-pre-order items from that seller.
   * - If `applicableToAuctions` is true, only auction items from that seller
   *   are eligible; regular (fixed-price) items from the same store are
   *   excluded.
   * - If `applicableToAuctions` is false/undefined, only non-auction items
   *   from that seller are eligible.
   *
   * @returns An object that mirrors `validateCoupon` but also includes
   *          `eligibleSubtotal` (the order slice the discount is based on)
   *          and `eligibleProductIds` (the `productId` values that qualify).
   */
  async validateCouponForCart(
    code: string,
    userId: string,
    cartItems: Array<{
      productId: string;
      sellerId: string;
      price: number;
      quantity: number;
      isPreOrder: boolean;
      isAuction: boolean;
    }>,
  ): Promise<{
    valid: boolean;
    coupon?: CouponDocument;
    discountAmount?: number;
    eligibleSubtotal?: number;
    eligibleProductIds?: string[];
    scope?: "admin" | "seller";
    sellerId?: string;
    message?: string;
  }> {
    // Format check
    if (!isValidCouponCode(code)) {
      return { valid: false, message: "Invalid coupon code format" };
    }

    const coupon = await this.getCouponByCode(code);
    if (!coupon) {
      return { valid: false, message: "Coupon not found" };
    }

    if (!isCouponValid(coupon)) {
      return { valid: false, coupon, message: "Coupon is not currently valid" };
    }

    const userUsageCount = await this.getUserCouponUsageCount(
      userId,
      coupon.id,
    );
    if (!canUserUseCoupon(coupon, userUsageCount)) {
      return {
        valid: false,
        coupon,
        message: "You have reached the usage limit for this coupon",
      };
    }

    // Determine eligible items
    // Pre-order items are always excluded
    let eligible = cartItems.filter((item) => !item.isPreOrder);

    const scope = coupon.scope ?? "admin";

    if (scope === "seller") {
      // Restrict to this seller's items
      eligible = eligible.filter((item) => item.sellerId === coupon.sellerId);

      if (coupon.applicableToAuctions === true) {
        // Auction-only coupon
        eligible = eligible.filter((item) => item.isAuction);
      } else {
        // Regular (fixed-price) items only — exclude auctions
        eligible = eligible.filter((item) => !item.isAuction);
      }
    }

    // Apply product/category restrictions from the coupon itself
    const { applicableProducts, applicableCategories, excludeProducts } =
      coupon.restrictions;
    if (applicableProducts && applicableProducts.length > 0) {
      eligible = eligible.filter((item) =>
        applicableProducts.includes(item.productId),
      );
    }
    if (excludeProducts && excludeProducts.length > 0) {
      eligible = eligible.filter(
        (item) => !excludeProducts.includes(item.productId),
      );
    }
    // Note: category filtering requires product metadata — skipped here but
    // the restriction is stored and can be enforced by the order service.
    void applicableCategories;

    if (eligible.length === 0) {
      return {
        valid: false,
        coupon,
        message:
          scope === "seller"
            ? "This coupon is not valid for the items in your cart from this store"
            : "No eligible items found for this coupon",
      };
    }

    const eligibleSubtotal = eligible.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    if (
      coupon.discount.minPurchase &&
      eligibleSubtotal < coupon.discount.minPurchase
    ) {
      return {
        valid: false,
        coupon,
        message: "Minimum purchase requirement not met",
      };
    }

    const discountAmount = calculateDiscount(coupon, eligibleSubtotal);

    return {
      valid: true,
      coupon,
      discountAmount,
      eligibleSubtotal,
      eligibleProductIds: eligible.map((item) => item.productId),
      scope,
      sellerId: coupon.sellerId,
      message: "Coupon is valid",
    };
  }

  // ---------------------------------------------------------------------------
  // Sieve-powered list query
  // ---------------------------------------------------------------------------

  static readonly SIEVE_FIELDS = {
    id: { canFilter: true, canSort: false },
    code: { canFilter: true, canSort: true },
    name: { canFilter: true, canSort: true },
    type: { canFilter: true, canSort: true },
    "validity.isActive": {
      path: "validity.isActive",
      canFilter: true,
      canSort: false,
    },
    "validity.endDate": {
      path: "validity.endDate",
      canFilter: true,
      canSort: true,
    },
    "validity.startDate": {
      path: "validity.startDate",
      canFilter: true,
      canSort: true,
    },
    "discount.value": {
      path: "discount.value",
      canFilter: true,
      canSort: true,
    },
    "discount.minPurchase": {
      path: "discount.minPurchase",
      canFilter: true,
      canSort: true,
    },
    "usage.currentUsage": {
      path: "usage.currentUsage",
      canFilter: true,
      canSort: true,
    },
    createdAt: { canFilter: true, canSort: true },
  };

  /**
   * Paginated, Firestore-native coupon list.
   *
   * @example
   * ```ts
   * const page = await couponsRepository.list({
   *   filters:  'type==percentage,validity.isActive==true',
   *   sorts:    '-createdAt',
   *   page:     1,
   *   pageSize: 50,
   * });
   * ```
   */
  async list(model: SieveModel): Promise<FirebaseSieveResult<CouponDocument>> {
    return this.sieveQuery<CouponDocument>(
      model,
      CouponsRepository.SIEVE_FIELDS,
      {
        defaultPageSize: 50,
        maxPageSize: 200,
      },
    );
  }

  /**
   * Cloud Functions: find active coupons whose validity period has expired.
   */
  async getExpiredActiveRefs(now: Date): Promise<DocumentReference[]> {
    const snap = await this.db
      .collection(this.collection)
      .where(COUPON_FIELDS.VALIDITY_FIELDS.IS_ACTIVE, "==", true)
      .where(COUPON_FIELDS.VALIDITY_FIELDS.END_DATE, "<=", now)
      .limit(500)
      .get();
    return snap.docs.map((d) => d.ref as DocumentReference);
  }

  /**
   * Cloud Functions: stage coupon deactivation into a caller-owned WriteBatch.
   */
  deactivateInBatch(batch: WriteBatch, ref: DocumentReference): void {
    batch.update(ref as unknown as FirebaseFirestore.DocumentReference, {
      [COUPON_FIELDS.VALIDITY_FIELDS.IS_ACTIVE]: false,
      updatedAt: serverTimestamp(),
    });
  }
}

// Export singleton instance
export const couponsRepository = new CouponsRepository();
