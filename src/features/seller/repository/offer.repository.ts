/**
 * Offer Repository
 *
 * Data access layer for the `offers` Firestore collection.
 * Handles buyer make-an-offer, seller counter/accept/decline lifecycle.
 */

import {
  BaseRepository,
  prepareForFirestore,
} from "../../../providers/db-firebase";
import type {
  SieveModel,
  FirebaseSieveResult,
} from "../../../providers/db-firebase";
import type {
  OfferDocument,
  OfferCreateInput,
  OfferUpdateInput,
  OfferStatus,
} from "../schemas";
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
    return decryptPiiFields(raw as unknown as Record<string, unknown>, [
      ...OFFER_PII_FIELDS,
    ]) as unknown as D;
  }

  static readonly SIEVE_FIELDS = {
    status: { canFilter: true, canSort: false },
    productId: { canFilter: true, canSort: false },
    buyerUid: { canFilter: true, canSort: false },
    sellerId: { canFilter: true, canSort: false },
    createdAt: { canFilter: false, canSort: true },
  } as const;

  // --- Create --------------------------------------------------------------

  async create(input: OfferCreateInput): Promise<OfferDocument> {
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
      { ...data } as unknown as Record<string, unknown>,
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

  async findBySeller(
    sellerId: string,
    model?: SieveModel,
  ): Promise<FirebaseSieveResult<OfferDocument>> {
    if (model) {
      return this.sieveQuery(model, OfferRepository.SIEVE_FIELDS, {
        baseQuery: this.getCollection().where(
          OFFER_FIELDS.SELLER_ID,
          "==",
          sellerId,
        ),
      });
    }
    const snap = await this.getCollection()
      .where(OFFER_FIELDS.SELLER_ID, "==", sellerId)
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

  async findPendingBySeller(sellerId: string): Promise<OfferDocument[]> {
    const snap = await this.getCollection()
      .where(OFFER_FIELDS.SELLER_ID, "==", sellerId)
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
  ): Promise<OfferDocument> {
    return this.updateStatus(offerId, {
      status: "accepted",
      lockedPrice,
      sellerNote,
      acceptedAt: new Date(),
      respondedAt: new Date(),
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

  async acceptCounter(offerId: string): Promise<OfferDocument> {
    const offer = await this.findById(offerId);
    if (!offer || !offer.counterAmount)
      throw new Error("Offer or counter not found");
    return this.updateStatus(offerId, {
      status: "accepted",
      lockedPrice: offer.counterAmount,
      acceptedAt: new Date(),
      respondedAt: new Date(),
    });
  }

  async withdraw(offerId: string): Promise<OfferDocument> {
    return this.updateStatus(offerId, {
      status: "withdrawn",
      respondedAt: new Date(),
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
