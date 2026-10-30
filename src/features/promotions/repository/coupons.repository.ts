import type { JsonValue } from "../../../schemas/types";
import {
  planSearchTxt,
  beginSearchWindow,
  emptySearchResult,
} from "../../../utils/search-txt-query";
import { buildCouponSearchTxt } from "../../../utils/search-txt-builders";
import { normalizeError } from "../../../errors/normalize";
import { serverLogger } from "../../../monitoring/server-logger";
import type { ListingType } from "../../products/types";
/**
 * Coupons Repository
 *
 * Manages coupon creation, validation, and usage tracking
 */

import {
  BaseRepository,
  prepareForFirestore,
  parseSieveDateValue,
} from "../../../providers/db-firebase";
import type {
  SieveModel,
  FirebaseSieveResult,
} from "../../../providers/db-firebase";
import {
  COUPONS_COLLECTION,
  COUPON_FIELDS,
  CouponDocument,
  CouponUsageDocument,
  CouponCreateInput,
  isValidCouponCode,
  isCouponValid,
  isCouponDisplayable,
  canUserUseCoupon,
  calculateDiscount,
  createCouponId,
} from "../schemas";
import type { CouponType } from "../types";
import { ATTACHED_COUPON_MAX } from "../constants/attached-coupons";
import type { FirestoreDocument } from "../../../schemas/types";
import { USER_COLLECTION } from "../../auth/schemas";
import { DatabaseError } from "../../../errors";
import { increment, arrayUnion, serverTimestamp } from "../../../contracts/field-ops";
import type { DocumentReference, WriteBatch } from "firebase-admin/firestore";

const COUPON_USAGE_SUBCOLLECTION = "couponUsage" as const;

/**
 * Repository for coupon management
 */
/**
 * Is this cart line a collector drop?
 *
 * Inlined rather than importing `isCollectorDropListing` from the products
 * feature — no repository in this codebase imports another feature's modules
 * (the Turbopack import-chain trap, Root Cause #6/#18). Accepts the pre-rename
 * "auction" spelling a stored cart line may still carry (Root Cause #58).
 */
function isCollectorDropLine(item: { listingType?: string }): boolean {
  return item.listingType === "collector-drop" || item.listingType === "auction";
}

export class CouponsRepository extends BaseRepository<CouponDocument> {
  constructor() {
    super(COUPONS_COLLECTION);
  }

  /**
   * Create new coupon with SEO-friendly ID based on code
   */
  override async create(input: CouponCreateInput | Partial<CouponDocument> | FirestoreDocument): Promise<CouponDocument> {
    // Narrow to the expected create-input shape — the base class accepts a
    // broader union for FieldValue/Date passthrough.
    const data = input as CouponCreateInput;
    // Generate coupon ID from code
    const code = data.code || "COUPON";
    const id = createCouponId(code);

    const couponData = {
      ...data,
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
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve coupon by code: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Batch-read coupons by id, for content that ATTACHES a set of them
   * (`EventDocument.couponIds`, `BlogPostDocument.couponIds`).
   *
   * 🛑 ONE `getAll`, never a loop of `findById`. A blog post carrying six
   * coupons would otherwise be six sequential round trips on a public,
   * ISR-regenerated page — Rule #6 budgets about three for a whole request.
   *
   * 🛑 Order is PRESERVED and missing ids are DROPPED, not nulled — the same
   * contract as `categoriesRepository.findByIds`, deliberately, so the two
   * batch readers in this codebase cannot behave differently. A content
   * editor's ordering is the display order, and a coupon that was deleted
   * after being attached must not render as a hole in the grid.
   *
   * Bounded at `ATTACHED_COUPON_MAX`. The cap is the reason this is safe to
   * call from a Server Component: the write schemas enforce the same number,
   * so a hand-edited Firestore document cannot turn a public page into an
   * unbounded read.
   */
  async findByIds(ids: string[]): Promise<CouponDocument[]> {
    const unique = Array.from(new Set(ids.filter(Boolean))).slice(0, ATTACHED_COUPON_MAX);
    if (unique.length === 0) return [];
    try {
      const refs = unique.map((id) => this.db.collection(this.collection).doc(id));
      const snaps = await this.db.getAll(...refs);
      return snaps.filter((s) => s.exists).map((s) => this.mapDoc<CouponDocument>(s));
    } catch (error) {
      const e = normalizeError(error);
      /*
       * `kind` and a COUNT, never the raw message and never the ids —
       * Root Cause #86 (a thrown message is written for a developer and this
       * one can reach a user through a 500) plus Hobby's ~4 KB/s log budget.
       */
      throw new DatabaseError(
        `Failed to batch-read ${unique.length} coupon(s) by id (${e.kind})`,
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
        .where(COUPON_FIELDS.VALIDITY.IS_ACTIVE, "==", true)
        .where(COUPON_FIELDS.VALIDITY.END_DATE, ">=", now)
        .orderBy(COUPON_FIELDS.VALIDITY.END_DATE, "asc")
        .get();

      /*
       * 🛑 `isCouponDisplayable`, NOT `isCouponValid` — this line used to carry
       * the comment "still checks startDate + usage" and that start-date check
       * was the deepest of FOUR copies of the same rule.
       *
       * Both callers of this method are DISPLAY surfaces — `getPromotions()`
       * for the promotions page and `getHomepageCoupons()` for the homepage
       * rail. No redemption path reads it (checkout goes through
       * `validateCouponForCart` / `canUserUseCoupon`, which apply the full
       * `isCouponValid` themselves). So the repository was enforcing a
       * checkout rule on behalf of two callers that never redeem anything.
       *
       * The effect: the Diwali event's five codes all open on Dhanteras, so
       * every one was stripped HERE, before the callers could decide. Fixing
       * the two call sites alone changed nothing, because the rows never
       * reached them — Root Cause #75, one money predicate hand-written in
       * several layers until the copies disagree.
       *
       * Expired, inactive and exhausted are still dropped. Only "has not
       * opened yet" is now the caller's business.
       *
       * 🛑 KNOWN LATENT GAP, deliberately not changed here: the query above
       * requires `END_DATE >= now`, and a Firestore inequality EXCLUDES every
       * document that lacks the field (Root Cause #100). An open-ended coupon
       * — `validity.endDate` absent, which `isCouponDisplayable` explicitly
       * treats as "no end date, not expired" — can therefore never appear in
       * this result at all. Every coupon in the corpus currently carries an
       * end date, so nothing is missing today; closing it means a second
       * query or a stored sentinel, not a tweak to this filter.
       */
      return snapshot.docs
        .map((doc) => this.mapDoc<CouponDocument>(doc))
        .filter((coupon) => isCouponDisplayable(coupon));
    } catch (error) {
      void normalizeError(error);
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
        .where(COUPON_FIELDS.TYPE, "==", type)
        .orderBy(COUPON_FIELDS.CREATED_AT, "desc")
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<CouponDocument>(doc));
    } catch (error) {
      void normalizeError(error);
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
        .where(COUPON_FIELDS.CREATED_BY, "==", userId)
        .orderBy(COUPON_FIELDS.CREATED_AT, "desc")
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<CouponDocument>(doc));
    } catch (error) {
      void normalizeError(error);
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

      // Firestore-native range filter â€” reuses the same composite index as getActiveCoupons()
      const snapshot = await this.db
        .collection(this.collection)
        .where(COUPON_FIELDS.VALIDITY.IS_ACTIVE, "==", true)
        .where(COUPON_FIELDS.VALIDITY.END_DATE, ">", now)
        .where(COUPON_FIELDS.VALIDITY.END_DATE, "<=", futureDate)
        .orderBy(COUPON_FIELDS.VALIDITY.END_DATE, "asc")
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<CouponDocument>(doc));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve expiring coupons: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Steps shared by all public validate methods:
   * 1. Code format  2. DB lookup  3. Validity  4. Per-user limit
   *
   * Returns either an early-exit failure result or the resolved coupon.
   */
  private async _fetchAndValidateCoupon(
    code: string,
    userId: string,
  ): Promise<
    | { ok: false; result: { valid: false; coupon?: CouponDocument; message: string } }
    | { ok: true; coupon: CouponDocument }
  > {
    if (!isValidCouponCode(code)) {
      return { ok: false, result: { valid: false, message: "Invalid coupon code format" } };
    }
    const coupon = await this.getCouponByCode(code);
    if (!coupon) {
      return { ok: false, result: { valid: false, message: "Coupon not found" } };
    }
    if (!isCouponValid(coupon)) {
      return { ok: false, result: { valid: false, coupon, message: "Coupon is not currently valid" } };
    }
    const userUsageCount = await this.getUserCouponUsageCount(userId, coupon.id);
    if (!canUserUseCoupon(coupon, userUsageCount)) {
      return { ok: false, result: { valid: false, coupon, message: "You have reached the usage limit for this coupon" } };
    }
    return { ok: true, coupon };
  }

  // ---------------------------------------------------------------------------
  // Public validation methods
  // ---------------------------------------------------------------------------

  /**
   * Validate coupon against a flat order total (no cart breakdown).
   *
   * NOT the authoritative check. `minPurchase` here is measured against the whole
   * amount passed in, whereas `validateCouponForCart` measures it against the
   * subtotal of the items the coupon is actually *eligible* for — so on a mixed
   * cart the two can disagree, and the cart one wins because it is what
   * `/api/cart/coupon` and checkout run. It also cannot enforce
   * `applicableProducts` / `excludeCategories`, having no items to test.
   *
   * Verified 2026-08-21: no UI calls this path, so the disagreement is currently
   * unreachable. Do not wire it into a buyer-facing surface — use
   * `validateCouponForCart` there, or a buyer will be promised a discount that
   * checkout then refuses.
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
    const check = await this._fetchAndValidateCoupon(code, userId);
    if (!check.ok) return check.result;
    const { coupon } = check;

    if (coupon.discount.minPurchase && orderTotal < coupon.discount.minPurchase) {
      return { valid: false, coupon, message: "Minimum purchase requirement not met" };
    }

    return {
      valid: true,
      coupon,
      discountAmount: calculateDiscount(coupon, orderTotal),
      message: "Coupon is valid",
    };
  }

  /**
   * Record coupon usage after a successful checkout.
   *
   * Increments both the global coupon counter and the per-user usage doc so
   * that subsequent `validateCoupon` calls respect `perUserLimit` and
   * `totalLimit` correctly.
   *
   * @param couponId      - Coupon document ID (e.g. "coupon-welcome10")
   * @param couponCode    - Human-readable code (e.g. "WELCOME10")
   * @param userId        - Buyer UID
   * @param orderIds      - All order IDs created in this checkout that used the coupon
   * @param discountAmount - Total discount amount applied across all order groups
   */
  async applyCoupon(
    couponId: string,
    couponCode: string,
    userId: string,
    orderIds: string[],
    discountAmount: number,
  ): Promise<void> {
    try {
      const batch = this.db.batch();

      // Increment global coupon counters
      const couponRef = this.db.collection(this.collection).doc(couponId);
      batch.update(couponRef, {
        "usage.currentUsage": increment(1),
        "stats.totalDiscount": increment(discountAmount),
        "stats.totalUses": increment(1),
        updatedAt: new Date(),
      });

      // Upsert per-user usage doc — safe for perUserLimit > 1
      const usageRef = this.db
        .collection(USER_COLLECTION)
        .doc(userId)
        .collection(COUPON_USAGE_SUBCOLLECTION)
        .doc(couponId);

      // FieldValue sentinels (increment, arrayUnion) must NOT go through
      // prepareForFirestore — it recurses into objects and Object.keys() on a
      // FieldValue returns [] (non-enumerable internals), silently dropping them.
      batch.set(
        usageRef,
        {
          ...prepareForFirestore({ userId, couponCode: couponCode.toUpperCase(), lastUsedAt: new Date() }),
          usageCount: increment(1),
          orders: arrayUnion(...orderIds),
        },
        { merge: true },
      );

      await batch.commit();
    } catch (error) {
      void normalizeError(error);
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

      if (!doc.exists) return 0;
      const data = doc.data() as { usageCount?: number };
      return data.usageCount ?? 1;
    } catch (err) {
      void normalizeError(err);
      serverLogger.error("coupons-repo: getUserCouponUsageCount failed — rethrowing to prevent coupon limit bypass", { userId, couponId, error: err instanceof Error ? err.message : String(err) });
      throw err;
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
      void normalizeError(error);
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
      void normalizeError(error);
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
      void normalizeError(error);
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
  async getStoreCoupons(storeId: string): Promise<CouponDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(COUPON_FIELDS.STORE_ID, "==", storeId)
        .orderBy(COUPON_FIELDS.CREATED_AT, "desc")
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<CouponDocument>(doc));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve store coupons: ${error instanceof Error ? error.message : "Unknown error"}`,
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
   * - If `applicableToCollectorDrops` is true, only collector drop items from that seller
   *   are eligible; regular (fixed-price) items from the same store are
   *   excluded.
   * - If `applicableToCollectorDrops` is false/undefined, only non-collectorDrop items
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
      storeId: string;
      price: number;
      quantity: number;
      /** Canonical listing-kind snapshot (SB1-G Phase 4). */
      listingType: ListingType;
    }>,
    opts?: {
      /**
       * Lazily resolves productId → categorySlugs[]. Supplied by the action
       * layer (which may import the products repository) so this repository
       * never takes a cross-repository dependency. Called at most once, and
       * only when the coupon actually carries a category restriction — so a
       * coupon without one costs zero extra Firestore reads.
       */
      resolveCategorySlugs?: (
        productIds: string[],
      ) => Promise<Map<string, string[]>>;
    },
  ): Promise<{
    valid: boolean;
    coupon?: CouponDocument;
    discountAmount?: number;
    eligibleSubtotal?: number;
    eligibleProductIds?: string[];
    scope?: "admin" | "seller";
    storeId?: string;
    message?: string;
  }> {
    const check = await this._fetchAndValidateCoupon(code, userId);
    if (!check.ok) return check.result;
    const { coupon } = check;

    // Determine eligible items — no blanket exclusion by product type.
    // Coupon flags (applicableToCollectorDrops) decide type eligibility below.
    let eligible = [...cartItems];

    const scope = coupon.scope ?? "admin";

    if (scope === "seller") {
      // Restrict to this store's items
      eligible = eligible.filter((item) => item.storeId === coupon.storeId);
    }

    // Apply product-type filter based on the coupon's own flag:
    //   true       → collector-drop-only coupon
    //   false      → explicitly excludes collector drops (still allows pre-orders + standard)
    //   undefined  → no restriction; applies to every listing type
    if (coupon.applicableToCollectorDrops === true) {
      eligible = eligible.filter((item) => isCollectorDropLine(item));
    } else if (coupon.applicableToCollectorDrops === false) {
      eligible = eligible.filter((item) => !isCollectorDropLine(item));
    }

    // Apply product/category restrictions from the coupon itself
    const {
      applicableProducts,
      applicableCategories,
      excludeProducts,
      excludeCategories,
    } = coupon.restrictions;
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

    // Category restrictions need product metadata the cart doesn't snapshot,
    // so they are resolved through the injected callback. A product carries
    // `categorySlugs[]` (1-to-many), so the test is set intersection.
    const needsCategories =
      (applicableCategories?.length ?? 0) > 0 ||
      (excludeCategories?.length ?? 0) > 0;
    if (needsCategories && eligible.length > 0 && opts?.resolveCategorySlugs) {
      const slugsByProduct = await opts.resolveCategorySlugs(
        eligible.map((item) => item.productId),
      );
      const slugsFor = (productId: string) => slugsByProduct.get(productId) ?? [];
      if (applicableCategories && applicableCategories.length > 0) {
        eligible = eligible.filter((item) =>
          slugsFor(item.productId).some((slug) =>
            applicableCategories.includes(slug),
          ),
        );
      }
      if (excludeCategories && excludeCategories.length > 0) {
        eligible = eligible.filter(
          (item) =>
            !slugsFor(item.productId).some((slug) =>
              excludeCategories.includes(slug),
            ),
        );
      }
    }

    if (eligible.length === 0) {
      return {
        valid: false,
        coupon,
        message:
          coupon.applicableToCollectorDrops === true
            ? "This coupon only applies to collector drop items"
            : needsCategories
              ? "This coupon does not apply to any of the categories in your cart"
              : scope === "seller"
                ? "This coupon is not valid for the items in your cart from this seller"
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

    /*
     * `eligible` is passed through, not just its subtotal — `buy_x_get_y`
     * needs the individual unit prices to know which units are free, and
     * without them it silently returned 0 for every BOGO coupon ever created.
     */
    const discountAmount = calculateDiscount(coupon, eligibleSubtotal, eligible);

    return {
      valid: true,
      coupon,
      discountAmount,
      eligibleSubtotal,
      eligibleProductIds: eligible.map((item) => item.productId),
      scope,
      storeId: coupon.storeId,
      message: "Coupon is valid",
    };
  }

  // ---------------------------------------------------------------------------
  // Sieve-powered list query
  // ---------------------------------------------------------------------------

  static readonly SIEVE_FIELDS = {
    searchTxt: { canFilter: true, canSort: false },
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
      parseValue: parseSieveDateValue,
    },
    "validity.startDate": {
      path: "validity.startDate",
      canFilter: true,
      canSort: true,
      parseValue: parseSieveDateValue,
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
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
  storeId: { canFilter: true, canSort: false },
  scope: { canFilter: true, canSort: false },
  };

  /**
   * Paginated, Firestore-native coupon list.
   *
   * @example
   * ```ts
 * const page = await couponsRepository.list({
 * filters: 'type==percentage,validity.isActive==true',
 * sorts: '-createdAt',
 * page: 1,
 * pageSize: 50,
 * });
 * ```
   */
  /** Derived on every write path via `applyWriteHooks`. */
  protected override buildSearchTxtFor(
    data: Record<string, JsonValue>,
  ): string[] | null {
    return buildCouponSearchTxt(data as Partial<CouponDocument>);
  }

  async list(
    model: SieveModel,
    opts?: { search?: string },
  ): Promise<FirebaseSieveResult<CouponDocument>> {
    const plan = planSearchTxt(opts?.search);
    if (plan.empty) return emptySearchResult<CouponDocument>();

    let baseQuery = this.getCollection();
    if (plan.head) {
      baseQuery = baseQuery.where(
        "searchTxt",
        "array-contains",
        plan.head,
      ) as typeof baseQuery;
    }

    /*
     * One bounded window, one raised `maxPageSize`, one page slice — see
     * `beginSearchWindow`. Hand-writing the three is how the other ten
     * repositories each ended up with two of them, which reads as a working
     * multi-word search and silently cannot reach page 2.
     */
    const win = beginSearchWindow(model, plan);

    const result = await this.sieveQuery<CouponDocument>(
      win.model,
      CouponsRepository.SIEVE_FIELDS,
      {
        baseQuery,
        defaultPageSize: 50,
        maxPageSize: win.maxPageSize(200),
      },
    );
    return win.finish(result);
  }

  /**
   * Cloud Functions: find active coupons whose validity period has expired.
   */
  async getExpiredActiveRefs(now: Date): Promise<DocumentReference[]> {
    const snap = await this.db
      .collection(this.collection)
      .where(COUPON_FIELDS.VALIDITY.IS_ACTIVE, "==", true)
      .where(COUPON_FIELDS.VALIDITY.END_DATE, "<=", now)
      .limit(500)
      .get();
    return snap.docs.map((d) => d.ref as DocumentReference);
  }

  /**
   * Cloud Functions: stage coupon deactivation into a caller-owned WriteBatch.
   */
  deactivateInBatch(batch: WriteBatch, ref: DocumentReference): void {
    batch.update(ref as unknown as FirebaseFirestore.DocumentReference, {
      [COUPON_FIELDS.VALIDITY.IS_ACTIVE]: false,
      updatedAt: serverTimestamp(),
    });
  }
}

// Export singleton instance
export const couponsRepository = new CouponsRepository();
