/**
 * Claimed Coupons Repository — plan §10
 *
 * One row per (userId, couponCode). Top-level collection so the user wallet
 * page is a single indexed read. Status is lazily flipped to "expired" on
 * read when `expiresAt < now`. Soft-delete only (status stays, no destroy).
 */

import {
  BaseRepository,
  prepareForFirestore,
} from "../../../providers/db-firebase";
import { normalizeError } from "../../../errors/normalize";
import { CLAIMED_COUPONS_COLLECTION, type ClaimedCouponDocument, type ClaimedCouponSource, type ClaimedCouponSnapshot, createClaimedCouponId } from "../schemas";
import { DatabaseError } from "../../../errors";
import { COUPON_USAGE_FIELDS } from "../../../constants/field-names";

export interface ClaimedCouponCreateInput {
  userId: string;
  couponId: string;
  couponCode: string;
  source: ClaimedCouponSource;
  couponSnapshot: ClaimedCouponSnapshot;
  expiresAt?: Date | null;
}

export class ClaimedCouponsRepository extends BaseRepository<ClaimedCouponDocument> {
  constructor() {
    super(CLAIMED_COUPONS_COLLECTION);
  }

  async findByUserAndCode(userId: string, couponCode: string): Promise<ClaimedCouponDocument | null> {
    return this.findById(createClaimedCouponId(userId, couponCode));
  }

  /** Idempotent claim — returns the existing claim if one already exists. */
  async claim(input: ClaimedCouponCreateInput): Promise<ClaimedCouponDocument> {
    try {
      const id = createClaimedCouponId(input.userId, input.couponCode);
      const existing = await this.findById(id);
      if (existing) return existing;

      const now = new Date();
      const doc: ClaimedCouponDocument = {
        id,
        userId: input.userId,
        couponId: input.couponId,
        couponCode: input.couponCode.toUpperCase(),
        source: input.source,
        couponSnapshot: input.couponSnapshot,
        status: "active",
        expiresAt: input.expiresAt ?? null,
        claimedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      await this.db
        .collection(this.collection)
        .doc(id)
        .set(prepareForFirestore(doc));

      return doc;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError("Failed to claim coupon", error);
    }
  }

  async listForUser(userId: string): Promise<ClaimedCouponDocument[]> {
    try {
      const snap = await this.db
        .collection(this.collection)
        .where(COUPON_USAGE_FIELDS.USER_ID, "==", userId)
        .get();
      const now = Date.now();
      const rows: ClaimedCouponDocument[] = [];
      for (const docSnap of snap.docs) {
        const raw = this.mapDoc<ClaimedCouponDocument>(docSnap);
        // Lazy expire — flip status when validity has passed. Best-effort
        // write-back; consumers see the corrected status immediately.
        if (
          raw.status === "active" &&
          raw.expiresAt &&
          new Date(raw.expiresAt).getTime() < now
        ) {
          raw.status = "expired";
          void this.db
            .collection(this.collection)
            .doc(raw.id)
            .update({ status: "expired", updatedAt: new Date() })
            .catch(() => {
              /* best-effort */
            });
        }
        rows.push(raw);
      }
      return rows;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError("Failed to list claimed coupons", error);
    }
  }

  /**
   * Re-sync every wallet copy of a coupon's snapshot after the source coupon
   * is edited (D59).
   *
   * 🛑 WHY THIS EXISTS, and what the defect actually was — the plan overstates
   * it and the correction matters.
   *
   * `ClaimedCouponDocument.couponSnapshot` is a denormalised copy of
   * `discount` + `restrictions` + `type` + `scope`, so `/user/coupons` renders
   * the wallet in ONE indexed read instead of N joins. Nothing re-synced it
   * when an admin edited the source coupon, so it drifted — the mirror shape
   * of Root Cause #42.
   *
   * The plan says the consequence is that "a spin/raffle win keeps the old
   * terms". **It does not.** Verified: redemption goes
   * `validateCouponForCart` → `_fetchAndValidateCoupon` →
   * `getCouponByCode(code)`, which reads the LIVE `CouponDocument`. The
   * snapshot is never consulted when money moves.
   *
   * So this is a DISPLAY defect, not a money one — and still worth fixing,
   * because the wallet advertising "20% off" while checkout applies 10% is a
   * trust problem and a support ticket. Calling it a money bug would have
   * sent someone looking for an exploit that is not there.
   *
   * Re-syncing beats dropping the snapshot: rendering live would cost a join
   * per wallet row, which is the exact thing the denormalisation buys.
   *
   * Best-effort by design — a failed re-sync must never fail the admin's
   * coupon edit, which has already succeeded. The worst case is a stale
   * DISPLAY, i.e. exactly today's behaviour.
   */
  async resyncSnapshotsForCoupon(
    couponId: string,
    snapshot: ClaimedCouponSnapshot,
  ): Promise<number> {
    try {
      /*
       * Bounded at 500. A coupon claimed by more wallets than that is a
       * campaign, and silently updating only the first page would be worse
       * than saying so — the count is returned and the caller logs it.
       */
      const snap = await this.db
        .collection(this.collection)
        .where("couponId", "==", couponId)
        .limit(500)
        .get();
      if (snap.empty) return 0;

      const writer = this.db.bulkWriter();
      for (const doc of snap.docs) {
        writer.update(doc.ref, { couponSnapshot: snapshot, updatedAt: new Date() });
      }
      await writer.close();
      return snap.size;
    } catch (error) {
      void normalizeError(error);
      // Deliberately NOT thrown — see the docstring.
      return 0;
    }
  }

  async markUsed(userId: string, couponCode: string, orderId: string): Promise<void> {
    const id = createClaimedCouponId(userId, couponCode);
    try {
      await this.db
        .collection(this.collection)
        .doc(id)
        .update({
          status: "used",
          usedAt: new Date(),
          usedOrderId: orderId,
          updatedAt: new Date(),
        });
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError("Failed to mark coupon used", error);
    }
  }

  async softRemove(userId: string, couponCode: string): Promise<void> {
    const id = createClaimedCouponId(userId, couponCode);
    try {
      // Soft-delete = bump status to expired with a marker. We never physically
      // delete so the audit trail (claim source + dates) is preserved.
      await this.db
        .collection(this.collection)
        .doc(id)
        .update({
          status: "expired",
          updatedAt: new Date(),
        });
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError("Failed to remove claimed coupon", error);
    }
  }
}

export const claimedCouponsRepository = new ClaimedCouponsRepository();
