/**
 * Offer Repository
 *
 * Data access layer for the `offers` Firestore collection.
 * Handles buyer make-an-offer, seller counter/accept/decline lifecycle.
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
import type { OfferDocument, OfferCreateInput, OfferUpdateInput } from "../schemas";
import { OFFER_COLLECTION, OFFER_FIELDS, createOfferId } from "../schemas";
import {
  encryptPiiFields,
  decryptPiiFields,
  OFFER_PII_FIELDS,
} from "../../../security";

class OfferRepository extends BaseRepository<OfferDocument> {
  constructor() {
    super(OFFER_COLLECTION);
  }

  /** Override mapDoc to auto-decrypt PII on every offer read */
  protected override mapDoc<D = OfferDocument>(
    snap: import("../../../providers/db-firebase").DocumentSnapshot,
  ): D {
    const raw = super.mapDoc<OfferDocument>(snap);
    return decryptPiiFields(raw, [
      ...OFFER_PII_FIELDS,
    ]) as unknown as D;
  }

  /**
   * Every Timestamp field here carries `parseValue: parseSieveDateValue`.
   *
   * Without it a GTE/LTE on a Timestamp field silently matches ZERO documents:
   * sievejs's default coercion leaves an ISO string as a string, and Firestore
   * requires an inequality's value to match the stored type. That is Root Cause
   * #47, and `createdAt` flipping from `canFilter: false` to `true` here is
   * exactly the transition that introduces it.
   *
   * `checkoutDeadline` is added by hand: `audit-sieve-date-fields` recognises
   * Timestamp fields by an `...At` / `...Date` / `...Time` suffix, which this
   * name does not have, so the audit cannot flag it for you.
   */
  static readonly SIEVE_FIELDS = {
    id: { canFilter: true, canSort: false },
    status: { canFilter: true, canSort: true },
    productId: { canFilter: true, canSort: false },
    productTitle: { canFilter: true, canSort: true },
    buyerUid: { canFilter: true, canSort: false },
    buyerName: { canFilter: true, canSort: true },
    storeId: { canFilter: true, canSort: false },
    storeName: { canFilter: true, canSort: true },
    offerAmount: { canFilter: true, canSort: true },
    listedPrice: { canFilter: true, canSort: true },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    expiresAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    checkoutDeadline: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
  };

  /**
   * Paginated, Firestore-native offer list (admin use).
   *
   * Mirrors `BidRepository.list`. The seller- and buyer-scoped reads have their
   * own dedicated methods (`findByStore` / `findByBuyer`) because they carry
   * mandatory ownership filters; this one is deliberately unscoped and is only
   * reachable behind `admin:offers:read`.
   */
  async list(model: SieveModel): Promise<FirebaseSieveResult<OfferDocument>> {
    return this.sieveQuery<OfferDocument>(model, OfferRepository.SIEVE_FIELDS, {
      defaultPageSize: 50,
      maxPageSize: 200,
    });
  }

  // --- Create --------------------------------------------------------------

  override async create(input: OfferCreateInput): Promise<OfferDocument> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 h
    const id = createOfferId({
      productId: input.productId,
      buyerUid: input.buyerUid,
      date: now,
    });

    const data: Omit<OfferDocument, "id"> = {
      ...input,
      status: "pending",
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    // Encrypt PII fields before persisting
    const encrypted = encryptPiiFields(
      { ...data },
      [...OFFER_PII_FIELDS],
    ) as typeof data;

    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(encrypted));
    return { id, ...data }; // return plaintext to caller
  }

  // --- Reads ---------------------------------------------------------------

  async findByBuyer(
    buyerUid: string,
    model?: SieveModel,
  ): Promise<FirebaseSieveResult<OfferDocument>> {
    if (model) {
      return this.sieveQuery(model, OfferRepository.SIEVE_FIELDS, {
        baseQuery: this.getCollection().where(
          OFFER_FIELDS.BUYER_UID,
          "==",
          buyerUid,
        ),
      });
    }
    const snap = await this.getCollection()
      .where(OFFER_FIELDS.BUYER_UID, "==", buyerUid)
      .orderBy(OFFER_FIELDS.CREATED_AT, "desc")
      .get();
    const items = snap.docs.map((d) => this.mapDoc(d));
    return {
      items,
      total: items.length,
      page: 1,
      pageSize: items.length,
      totalPages: 1,
      hasMore: false,
    };
  }

  async findByStore(
    storeId: string,
    model?: SieveModel,
  ): Promise<FirebaseSieveResult<OfferDocument>> {
    if (model) {
      return this.sieveQuery(model, OfferRepository.SIEVE_FIELDS, {
        baseQuery: this.getCollection().where(
          OFFER_FIELDS.STORE_ID,
          "==",
          storeId,
        ),
      });
    }
    const snap = await this.getCollection()
      .where(OFFER_FIELDS.STORE_ID, "==", storeId)
      .orderBy(OFFER_FIELDS.CREATED_AT, "desc")
      .get();
    const items = snap.docs.map((d) => this.mapDoc(d));
    return {
      items,
      total: items.length,
      page: 1,
      pageSize: items.length,
      totalPages: 1,
      hasMore: false,
    };
  }

  async findPendingByStore(storeId: string): Promise<OfferDocument[]> {
    const snap = await this.getCollection()
      .where(OFFER_FIELDS.STORE_ID, "==", storeId)
      .where(OFFER_FIELDS.STATUS, "==", "pending")
      .orderBy(OFFER_FIELDS.CREATED_AT, "asc")
      .get();
    return snap.docs.map((d) => this.mapDoc(d));
  }

  /** Returns all pending or countered offers past their expiresAt — used by expiry sweep job */
  async findExpired(): Promise<OfferDocument[]> {
    const snap = await this.getCollection()
      .where(OFFER_FIELDS.STATUS, "in", ["pending", "countered"])
      .where(OFFER_FIELDS.EXPIRES_AT, "<=", new Date())
      .get();
    return snap.docs.map((d) => this.mapDoc(d));
  }

  /**
   * Returns true when the buyer already has an active (pending or countered) offer
   * on this product.  Used to prevent duplicate parallel negotiations.
   */
  async hasActiveOffer(buyerUid: string, productId: string): Promise<boolean> {
    const snap = await this.getCollection()
      .where(OFFER_FIELDS.BUYER_UID, "==", buyerUid)
      .where(OFFER_FIELDS.PRODUCT_ID, "==", productId)
      .where(OFFER_FIELDS.STATUS, "in", ["pending", "countered"])
      .select() // stub read — minimal cost
      .limit(1)
      .get();
    return !snap.empty;
  }

  /**
   * Count how many offer documents a buyer has created for a product since `since`.
   * Used to enforce the 3-offer-per-product limit; resets automatically when
   * `product.updatedAt` advances past the previously-created offer dates.
   */
  async countByBuyerAndProduct(
    buyerUid: string,
    productId: string,
    since: Date,
  ): Promise<number> {
    const snap = await this.getCollection()
      .where(OFFER_FIELDS.BUYER_UID, "==", buyerUid)
      .where(OFFER_FIELDS.PRODUCT_ID, "==", productId)
      .where(OFFER_FIELDS.CREATED_AT, ">=", since)
      .select() // fetch no fields — only doc stubs for minimal read cost
      .get();
    return snap.size;
  }

  // --- Mutations -----------------------------------------------------------

  async updateStatus(
    offerId: string,
    patch: OfferUpdateInput,
  ): Promise<OfferDocument> {
    return this.update(offerId, {
      ...patch,
      updatedAt: new Date(),
    });
  }

  async accept(
    offerId: string,
    lockedPrice: number,
    sellerNote?: string,
    checkoutDeadline?: Date,
  ): Promise<OfferDocument> {
    // One write, not two. `checkoutDeadline` used to be missing from
    // OfferUpdateInput, which forced callers to follow every accept() with a
    // separate generic update() — leaving a window where an offer was
    // "accepted" with no deadline at all.
    return this.updateStatus(offerId, {
      status: "accepted",
      lockedPrice,
      sellerNote,
      acceptedAt: new Date(),
      respondedAt: new Date(),
      ...(checkoutDeadline ? { checkoutDeadline } : {}),
    });
  }

  async decline(offerId: string, sellerNote?: string): Promise<OfferDocument> {
    return this.updateStatus(offerId, {
      status: "declined",
      sellerNote,
      respondedAt: new Date(),
    });
  }

  async counter(
    offerId: string,
    counterAmount: number,
    sellerNote?: string,
  ): Promise<OfferDocument> {
    return this.updateStatus(offerId, {
      status: "countered",
      counterAmount,
      sellerNote,
      respondedAt: new Date(),
    });
  }

  async acceptCounter(
    offerId: string,
    checkoutDeadline?: Date,
  ): Promise<OfferDocument> {
    const offer = await this.findById(offerId);
    if (!offer || !offer.counterAmount)
      throw new Error("Offer or counter not found");
    return this.updateStatus(offerId, {
      status: "accepted",
      lockedPrice: offer.counterAmount,
      acceptedAt: new Date(),
      respondedAt: new Date(),
      ...(checkoutDeadline ? { checkoutDeadline } : {}),
    });
  }

  async withdraw(offerId: string): Promise<OfferDocument> {
    return this.updateStatus(offerId, {
      status: "withdrawn",
      respondedAt: new Date(),
    });
  }

  /**
   * Terminal transition, called once the buyer's order for this offer exists.
   *
   * `"paid"` has been in `OfferStatusValues` since the feature shipped but had
   * NO server-side writer — the only thing that ever set it was an optimistic
   * client-side patch in UserOffersPanel, which meant a reload showed the offer
   * back at "accepted" and it could be added to the cart and ordered again.
   */
  async markPaid(offerId: string, orderId: string): Promise<OfferDocument> {
    return this.updateStatus(offerId, {
      status: "paid",
      paidOrderId: orderId,
      paidAt: new Date(),
    });
  }

  /**
   * Cloud Functions compatibility: pending/countered offers already expired.
   */
  async findExpiredActive(now: Date): Promise<OfferDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(OFFER_FIELDS.STATUS, "in", ["pending", "countered"])
      .where(OFFER_FIELDS.EXPIRES_AT, "<=", now)
      .limit(500)
      .get();

    return snapshot.docs.map((doc) => this.mapDoc<OfferDocument>(doc));
  }

  /**
   * Accepted offers whose 48h checkout window has lapsed. These were never
   * swept before — `findExpiredActive` only looks at pending/countered — so an
   * accepted-but-never-paid offer stayed "accepted" forever and its locked
   * price remained claimable long after the seller expected it to lapse.
   */
  async findExpiredAccepted(now: Date): Promise<OfferDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(OFFER_FIELDS.STATUS, "==", "accepted")
      .where(OFFER_FIELDS.CHECKOUT_DEADLINE, "<=", now)
      .limit(500)
      .get();

    return snapshot.docs.map((doc) => this.mapDoc<OfferDocument>(doc));
  }

  async expireMany(offerIds: string[]): Promise<void> {
    const batch = this.db.batch();
    const now = new Date();
    for (const id of offerIds) {
      batch.update(this.db.collection(this.collection).doc(id), {
        [OFFER_FIELDS.STATUS]: "expired",
        [OFFER_FIELDS.UPDATED_AT]: now,
      });
    }
    await batch.commit();
  }
}

export const offerRepository = new OfferRepository();
export { OfferRepository };
