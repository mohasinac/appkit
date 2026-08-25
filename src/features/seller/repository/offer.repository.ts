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
import { OFFER_COLLECTION, OFFER_FIELDS, OFFER_TRACKED_FIELDS, createOfferId } from "../schemas";
import { withHistory, type HistoryActor } from "../../../_internal/shared/history/index";
import type { FirestoreDocument } from "../../../schemas/types";
import {
  encryptPiiFields,
  decryptPiiFields,
  OFFER_PII_FIELDS,
} from "../../../security";

/** Max rounds in one negotiation chain — matches the per-buyer offer limit. */
const OFFER_CHAIN_MAX = 3;

/**
 * Who/why for a write that lands in an offer's `statusHistory`.
 * Optional throughout so existing callers keep compiling and record `system`.
 */
export interface OfferWriteContext {
  actor?: HistoryActor;
  trigger?: string;
  reason?: string;
  note?: string;
}

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
      // The root of a chain stores its OWN id. Without this, round 1 is the
      // only document with no `chainRootOfferId`, so `findChain(root.id)`
      // would return rounds 2..N and silently omit the round the buyer
      // actually started with. Set here rather than at the call site because
      // the id is generated in this method.
      chainRootOfferId: input.chainRootOfferId ?? id,
      counterRound: input.counterRound ?? 1,
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

  /**
   * The single write choke point for offers, so `statusHistory` is appended
   * in ONE place rather than at every call site — the same shape
   * `OrderRepository.updateWithHistory` uses.
   *
   * `prior` is the already-fetched document when the caller has one. Every
   * real caller does (`respondToOffer`, `acceptCounterOffer`, `withdrawOffer`,
   * `counterOfferByBuyer`, `finalizeLockedLines`, the admin PATCH, both expiry
   * sweeps), so threading it through means history costs **zero extra reads**.
   */
  async updateStatus(
    offerId: string,
    patch: OfferUpdateInput,
    ctx?: OfferWriteContext,
    prior?: OfferDocument | null,
  ): Promise<OfferDocument> {
    const full: OfferUpdateInput = { ...patch, updatedAt: new Date() };
    const current = prior !== undefined ? prior : await this.findById(offerId);
    const withEntry = withHistory(
      current as unknown as FirestoreDocument | undefined,
      full as unknown as FirestoreDocument,
      {
        tracked: OFFER_TRACKED_FIELDS,
        actor: ctx?.actor ?? { role: "system" },
        trigger: ctx?.trigger ?? "offerRepository.updateStatus",
        reason: ctx?.reason,
        note: ctx?.note,
        // buyerName/buyerEmail live on this document. `encryptPiiFields` is a
        // flat top-level loop and never descends into arrays, so without this
        // they would persist in PLAINTEXT inside statusHistory.
        piiFields: OFFER_PII_FIELDS,
        historyField: OFFER_FIELDS.STATUS_HISTORY,
        truncatedField: OFFER_FIELDS.STATUS_HISTORY_TRUNCATED,
      },
    );
    return this.update(offerId, (withEntry ?? full) as OfferUpdateInput);
  }

  async accept(
    offerId: string,
    lockedPrice: number,
    sellerNote?: string,
    checkoutDeadline?: Date,
    ctx?: OfferWriteContext,
    prior?: OfferDocument | null,
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
    }, { actor: { role: "seller" }, trigger: "respondToOffer:accept", note: sellerNote, ...ctx }, prior);
  }

  async decline(
    offerId: string,
    sellerNote?: string,
    ctx?: OfferWriteContext,
    prior?: OfferDocument | null,
  ): Promise<OfferDocument> {
    return this.updateStatus(offerId, {
      status: "declined",
      sellerNote,
      respondedAt: new Date(),
    }, { actor: { role: "seller" }, trigger: "respondToOffer:decline", note: sellerNote, ...ctx }, prior);
  }

  async counter(
    offerId: string,
    counterAmount: number,
    sellerNote?: string,
    ctx?: OfferWriteContext,
    prior?: OfferDocument | null,
  ): Promise<OfferDocument> {
    return this.updateStatus(offerId, {
      status: "countered",
      counterAmount,
      sellerNote,
      respondedAt: new Date(),
    }, { actor: { role: "seller" }, trigger: "respondToOffer:counter", note: sellerNote, ...ctx }, prior);
  }

  async acceptCounter(
    offerId: string,
    checkoutDeadline?: Date,
    ctx?: OfferWriteContext,
    prior?: OfferDocument | null,
  ): Promise<OfferDocument> {
    // Reuse the caller's document when supplied — this method used to always
    // re-read, so passing `prior` makes the feature land one read CHEAPER
    // than before rather than one more expensive.
    const offer = prior !== undefined && prior !== null ? prior : await this.findById(offerId);
    if (!offer || !offer.counterAmount)
      throw new Error("Offer or counter not found");
    return this.updateStatus(offerId, {
      status: "accepted",
      lockedPrice: offer.counterAmount,
      acceptedAt: new Date(),
      respondedAt: new Date(),
      ...(checkoutDeadline ? { checkoutDeadline } : {}),
    }, { actor: { role: "buyer" }, trigger: "acceptCounterOffer", ...ctx }, offer);
  }

  /**
   * Two distinct events share this method:
   *  - the buyer walks away        → status alone
   *  - the buyer counters          → status + `supersededByOfferId`
   *
   * The second is what makes the chain walkable forward, and it is ONE write
   * with ONE history entry. A `withdrawn` document carrying
   * `supersededByOfferId` renders as *Superseded* (neutral) rather than
   * *Withdrawn* (negative) — the negotiation continued, it did not end.
   */
  async withdraw(
    offerId: string,
    supersededByOfferId?: string,
    ctx?: OfferWriteContext,
    prior?: OfferDocument | null,
  ): Promise<OfferDocument> {
    return this.updateStatus(offerId, {
      status: "withdrawn",
      respondedAt: new Date(),
      ...(supersededByOfferId ? { supersededByOfferId } : {}),
    }, {
      actor: { role: "buyer" },
      trigger: supersededByOfferId ? "counterOfferByBuyer:supersede" : "withdrawOffer",
      ...(supersededByOfferId ? { reason: "Superseded by the buyer's counter" } : {}),
      ...ctx,
    }, prior);
  }

  /**
   * Terminal transition, called once the buyer's order for this offer exists.
   *
   * `"paid"` has been in `OfferStatusValues` since the feature shipped but had
   * NO server-side writer — the only thing that ever set it was an optimistic
   * client-side patch in UserOffersPanel, which meant a reload showed the offer
   * back at "accepted" and it could be added to the cart and ordered again.
   */
  async markPaid(
    offerId: string,
    orderId: string,
    prior?: OfferDocument | null,
  ): Promise<OfferDocument> {
    return this.updateStatus(offerId, {
      status: "paid",
      paidOrderId: orderId,
      paidAt: new Date(),
    }, { actor: { role: "system" }, trigger: "finalizeLockedLines" }, prior);
  }

  /**
   * Every round of one negotiation, oldest first.
   *
   * A single-field equality — served by Firestore's AUTOMATIC index, so this
   * adds no composite index and none of the existing `offers` indexes is
   * affected. The sort is done in memory because the result is at most 3 rows
   * (the per-buyer offer limit), which is cheaper than the index a compound
   * orderBy would demand.
   *
   * Offers written before `chainRootOfferId` existed return ZERO rows, not
   * one — callers must fall back to `[offer]` and never read empty as
   * "this offer is missing".
   */
  async findChain(chainRootOfferId: string): Promise<OfferDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(OFFER_FIELDS.CHAIN_ROOT_OFFER_ID, "==", chainRootOfferId)
      .limit(OFFER_CHAIN_MAX)
      .get();

    return snapshot.docs
      .map((doc) => this.mapDoc<OfferDocument>(doc))
      .sort((a, b) => (a.counterRound ?? 1) - (b.counterRound ?? 1));
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

  /**
   * Bulk-expire, taking the DOCUMENTS rather than their ids.
   *
   * The signature changed deliberately. `arrayUnion` would let a batch append
   * without a read, but it **cannot enforce the FIFO cap** — so history would
   * grow unbounded on exactly the path that touches the most documents at
   * once. Folding entries in memory and writing whole arrays keeps the cap,
   * and costs **zero extra reads**: `findExpiredActive`, `findExpiredAccepted`
   * and the admin cancel route all already hold full `OfferDocument`s.
   *
   * Also carries the admin path: a reasoned cancel is an expiry with an actor
   * and a reason, recorded in the offer's own history as well as in
   * `adminAuditLog`.
   */
  async expireMany(
    offers: OfferDocument[],
    ctx?: OfferWriteContext & { cancelledByAdminUid?: string },
  ): Promise<void> {
    if (offers.length === 0) return;
    const batch = this.db.batch();
    const now = new Date();

    for (const offer of offers) {
      const patch: OfferUpdateInput = {
        status: "expired",
        updatedAt: now,
        ...(ctx?.cancelledByAdminUid
          ? { cancelledByAdminUid: ctx.cancelledByAdminUid, cancelReason: ctx.reason }
          : {}),
      };
      const withEntry = withHistory(
        offer as unknown as FirestoreDocument,
        patch as unknown as FirestoreDocument,
        {
          tracked: OFFER_TRACKED_FIELDS,
          actor: ctx?.actor ?? { role: "system" },
          trigger: ctx?.trigger ?? "runOfferExpiry",
          reason: ctx?.reason,
          piiFields: OFFER_PII_FIELDS,
          historyField: OFFER_FIELDS.STATUS_HISTORY,
          truncatedField: OFFER_FIELDS.STATUS_HISTORY_TRUNCATED,
          now,
        },
      );
      batch.update(
        this.db.collection(this.collection).doc(offer.id),
        (withEntry ?? patch) as Record<string, unknown>,
      );
    }
    await batch.commit();
  }
}

export const offerRepository = new OfferRepository();
export { OfferRepository };
