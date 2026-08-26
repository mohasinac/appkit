import { normalizeError } from "../../../errors/normalize";

/**
 * Bid Repository
 *
 * Data access layer for bid documents in Firestore
 */

import {
  BaseRepository,
  getFirestoreCount,
  prepareForFirestore,
  parseSieveDateValue,
} from "../../../providers/db-firebase";
import type { DocumentReference, WriteBatch } from "firebase-admin/firestore";
import { DatabaseError } from "../../../errors";
import type {
  SieveModel,
  FirebaseSieveResult,
} from "../../../providers/db-firebase";
import type {
  BidDocument,
  BidCreateInput,
  BidUpdateInput,
  BidAdminUpdateInput,
  BidStatus,
} from "../schemas";
import { BID_COLLECTION, BID_TRACKED_FIELDS, BID_HISTORY_PII_FIELDS, createBidId } from "../schemas";
import { withHistory, type HistoryActor } from "../../../_internal/shared/history/index";
import type { FirestoreDocument } from "../../../schemas/types";

/** Who/why for a bid write that lands in `statusHistory`. */
export interface BidWriteContext {
  actor?: HistoryActor;
  trigger?: string;
  reason?: string;
  note?: string;
}
import {
  encryptPiiFields,
  decryptPiiFields,
  BID_PII_FIELDS,
} from "../../../security";
import { BID_FIELDS } from "../../../constants/field-names";

export class BidRepository extends BaseRepository<BidDocument> {
  constructor() {
    super(BID_COLLECTION);
  }

  /** Override mapDoc to auto-decrypt PII on every bid read */
  protected override mapDoc<D = BidDocument>(
    snap: import("../../../providers/db-firebase").DocumentSnapshot,
  ): D {
    const raw = super.mapDoc<BidDocument>(snap);
    return decryptPiiFields(raw, [
      ...BID_PII_FIELDS,
    ]) as unknown as D;
  }

  /**
   * Create new bid with auto-generated ID
   */
  override async create(input: BidCreateInput): Promise<BidDocument> {
    const bidIdInput = {
      productName: input.productTitle,
      userFirstName: input.userName.split(" ")[0] || input.userName,
      date: new Date(),
    };

    const id = createBidId(bidIdInput);

    const bidData: Omit<BidDocument, "id"> = {
      ...input,
      status: "active",
      isWinning: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Encrypt PII before persisting
    const encrypted = encryptPiiFields(bidData,
      [...BID_PII_FIELDS],
    );

    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(encrypted));

    return { id, ...bidData }; // return plaintext to caller
  }

  /**
   * Find bids by product ID
   */
  async findByProduct(productId: string): Promise<BidDocument[]> {
    return this.findBy(BID_FIELDS.PRODUCT_ID, productId);
  }

  /**
   * Find bids by user ID
   */
  async findByUser(userId: string): Promise<BidDocument[]> {
    return this.findBy(BID_FIELDS.USER_ID, userId);
  }

  /**
   * Paginated bids by user — returns at most pageSize bids, sorted by createdAt desc.
   */
  async findByUserPaginated(
    userId: string,
    pageSize = 25,
    startAfterDoc?: import("firebase-admin/firestore").QueryDocumentSnapshot,
  ): Promise<{ items: BidDocument[]; hasMore: boolean }> {
    let query = this.db
      .collection(this.collection)
      .where(BID_FIELDS.USER_ID, "==", userId)
      .orderBy(BID_FIELDS.CREATED_AT, "desc")
      .limit(pageSize + 1);
    if (startAfterDoc) query = query.startAfter(startAfterDoc);
    const snap = await query.get();
    const hasMore = snap.docs.length > pageSize;
    const docs = hasMore ? snap.docs.slice(0, pageSize) : snap.docs;
    return { items: docs.map((d) => this.mapDoc<BidDocument>(d)), hasMore };
  }

  /**
   * Find bids by status
   */
  async findByStatus(status: BidStatus): Promise<BidDocument[]> {
    return this.findBy(BID_FIELDS.STATUS, status);
  }

  /**
   * Cloud Functions compatibility: active bids for a product with refs.
   */
  async getActiveByProduct(
    productId: string,
  ): Promise<Array<{ id: string; ref: DocumentReference; data: BidDocument }>> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(BID_FIELDS.PRODUCT_ID, "==", productId)
      .where(BID_FIELDS.STATUS, "==", "active")
      .orderBy(BID_FIELDS.BID_AMOUNT, "desc")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ref: doc.ref,
      data: this.mapDoc<BidDocument>(doc),
    }));
  }

  /**
   * Cloud Functions compatibility: current winning active bid with ref.
   */
  async getWinningBid(
    productId: string,
  ): Promise<{ ref: DocumentReference; data: BidDocument } | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(BID_FIELDS.PRODUCT_ID, "==", productId)
      .where(BID_FIELDS.IS_WINNING, "==", true)
      .where(BID_FIELDS.STATUS, "==", "active")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      ref: doc.ref,
      data: this.mapDoc<BidDocument>(doc),
    };
  }

  /*
   * ── Batch mutators ─────────────────────────────────────────────────────
   *
   * These take a `DocumentReference` because settlement writes every bid on
   * an auction in one Firestore batch. `prior` is the document from the SAME
   * query that produced the ref — every caller has it (`activeBids` and
   * `losers` are both `{ ref, data }` pairs), so history costs no extra read
   * even when an auction closes with hundreds of bids (Rule #6).
   *
   * Omitting `prior` is legitimate rather than broken: the entry then records
   * `undefined → "lost"`, which is still true and still stamped with who and
   * when. It just cannot say what the bid was before.
   */
  markWon(batch: WriteBatch, ref: DocumentReference, ctx?: BidWriteContext, prior?: BidDocument | null): void {
    batch.update(
      ref,
      this.withBidHistory(prior, { status: "won", isWinning: true, updatedAt: new Date() }, ctx, "markWon"),
    );
  }

  /**
   * Link a won bid to the order it eventually became.
   *
   * `BidDocument` had no `orderId` at all before 2026-08-21, so a won bid and
   * the thing the buyer paid for were two unrelated records — the "Won" row in
   * /user/bids could not link anywhere, and nothing could tell a settled win
   * from an unpaid one.
   */
  async attachOrder(bidId: string, orderId: string, ctx?: BidWriteContext, prior?: BidDocument | null): Promise<void> {
    const current = prior !== undefined ? prior : await this.findById(bidId);
    await this.update(
      bidId,
      this.withBidHistory(current, { orderId, updatedAt: new Date() }, ctx, "attachOrder") as never,
    );
  }

  /**
   * The winner never paid within their checkout window. Distinct from "lost"
   * (outbid) — this bidder won and then defaulted, which a seller may want to
   * act on.
   */
  async markForfeited(bidId: string, ctx?: BidWriteContext, prior?: BidDocument | null): Promise<void> {
    const current = prior !== undefined ? prior : await this.findById(bidId);
    await this.update(
      bidId,
      this.withBidHistory(
        current,
        { status: "forfeited", isWinning: false, updatedAt: new Date() },
        ctx,
        "markForfeited",
      ) as never,
    );
  }

  markLost(batch: WriteBatch, ref: DocumentReference, ctx?: BidWriteContext, prior?: BidDocument | null): void {
    batch.update(
      ref,
      this.withBidHistory(prior, { status: "lost", isWinning: false, updatedAt: new Date() }, ctx, "markLost"),
    );
  }

  /**
   * Batched "everyone else lost", for callers that are not already inside a
   * batch of their own — a Buy Now purchase ends the auction outside the
   * settlement job, and the losing bids can be any number, so this writes them
   * in Firestore-batch chunks rather than one round-trip per bid.
   */
  async markManyLost(
    entries: readonly (DocumentReference | { ref: DocumentReference; data?: BidDocument })[],
    ctx?: BidWriteContext,
  ): Promise<void> {
    const CHUNK = 400; // under Firestore's 500-write batch limit, with headroom
    for (let i = 0; i < entries.length; i += CHUNK) {
      const batch = this.db.batch();
      for (const entry of entries.slice(i, i + CHUNK)) {
        // Accepts a bare ref OR a {ref, data} pair, so the caller that already
        // holds the documents gets a real before-value on the timeline and the
        // one that does not still works. Widened rather than made required
        // because forcing a read per losing bid would put a large auction's
        // settlement over the Firestore read budget.
        const isPair = typeof entry === "object" && "ref" in entry;
        const ref = isPair ? entry.ref : (entry as DocumentReference);
        this.markLost(batch, ref, ctx, isPair ? entry.data : undefined);
      }
      await batch.commit();
    }
  }

  /**
   * A pending Buy Now claim that never became a sale. Not `forfeited` — that
   * status means "won, then defaulted", and a lapsed claim never won anything;
   * the auction it was placed against carried on untouched.
   */
  async markCancelled(bidId: string, ctx?: BidWriteContext, prior?: BidDocument | null): Promise<void> {
    const current = prior !== undefined ? prior : await this.findById(bidId);
    await this.update(
      bidId,
      this.withBidHistory(
        current,
        { status: "cancelled", isWinning: false, updatedAt: new Date() },
        ctx,
        "markCancelled",
      ) as never,
    );
  }

  markOutbid(batch: WriteBatch, ref: DocumentReference, ctx?: BidWriteContext, prior?: BidDocument | null): void {
    batch.update(
      ref,
      this.withBidHistory(prior, { status: "outbid", isWinning: false, updatedAt: new Date() }, ctx, "markOutbid"),
    );
  }

  markWinning(batch: WriteBatch, ref: DocumentReference, ctx?: BidWriteContext, prior?: BidDocument | null): void {
    batch.update(
      ref,
      this.withBidHistory(prior, { isWinning: true, updatedAt: new Date() }, ctx, "markWinning"),
    );
  }

  /** Append a timeline entry when the patch touches a tracked field. */
  private withBidHistory(
    current: BidDocument | null | undefined,
    patch: Partial<BidDocument>,
    ctx: BidWriteContext | undefined,
    defaultTrigger: string,
  ): Partial<BidDocument> {
    const withEntry = withHistory(
      current as unknown as FirestoreDocument | undefined,
      patch as FirestoreDocument,
      {
        tracked: BID_TRACKED_FIELDS,
        actor: ctx?.actor ?? { role: "system" },
        trigger: ctx?.trigger ?? defaultTrigger,
        reason: ctx?.reason,
        note: ctx?.note,
        // `userName`/`userEmail` are denormalised onto every bid, and
        // `encryptPiiFields` never descends into arrays.
        piiFields: BID_HISTORY_PII_FIELDS,
      },
    );
    return (withEntry as Partial<BidDocument> | null) ?? patch;
  }

  /**
   * Find current winning bid for a product
   */
  async findWinningBid(productId: string): Promise<BidDocument | null> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(BID_FIELDS.PRODUCT_ID, "==", productId)
        .where(BID_FIELDS.IS_WINNING, "==", true)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return this.mapDoc<BidDocument>(doc);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to find winning bid for product: ${productId}`,
        error,
      );
    }
  }

  /**
   * Find highest bid amount for a product
   */
  async findHighestBid(productId: string): Promise<number> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(BID_FIELDS.PRODUCT_ID, "==", productId)
        .where(BID_FIELDS.STATUS, "==", "active")
        .orderBy(BID_FIELDS.BID_AMOUNT, "desc")
        .limit(1)
        .get();

      if (snapshot.empty) {
        return 0;
      }

      const doc = snapshot.docs[0];
      const bid = doc.data() as BidDocument;
      return bid.bidAmount;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to find highest bid for product: ${productId}`,
        error,
      );
    }
  }

  /**
   * Find all bids for a product sorted by amount (descending)
   */
  async findByProductSorted(productId: string): Promise<BidDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(BID_FIELDS.PRODUCT_ID, "==", productId)
        .orderBy(BID_FIELDS.BID_AMOUNT, "desc")
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<BidDocument>(doc));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to find bids for product: ${productId}`,
        error,
      );
    }
  }

  /**
   * Update bid (user can only update autoMaxBid)
   */
  async updateBid(bidId: string, data: BidUpdateInput): Promise<BidDocument> {
    const updateData: Partial<BidDocument> = {
      ...data,
      updatedAt: new Date(),
    };

    return this.update(bidId, updateData);
  }

  /**
   * Admin update bid (can update any field except id and createdAt)
   */
  async adminUpdateBid(
    bidId: string,
    data: BidAdminUpdateInput,
  ): Promise<BidDocument> {
    const updateData: Partial<BidDocument> = {
      ...data,
      updatedAt: new Date(),
    };

    return this.update(bidId, updateData);
  }

  /**
   * Mark bid as winning and set all other bids for the product as outbid
   */
  async setWinningBid(bidId: string, productId: string): Promise<void> {
    try {
      const batch = this.db.batch();

      // Set all bids for this product to not winning
      const allBidsSnapshot = await this.db
        .collection(this.collection)
        .where(BID_FIELDS.PRODUCT_ID, "==", productId)
        .get();

      allBidsSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          isWinning: false,
          status: doc.id === bidId ? "active" : "outbid",
          updatedAt: new Date(),
        });
      });

      // Set the new winning bid
      const winningBidRef = this.db.collection(this.collection).doc(bidId);
      batch.update(winningBidRef, {
        isWinning: true,
        status: "active",
        updatedAt: new Date(),
      });

      await batch.commit();
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to set winning bid: ${bidId}`, error);
    }
  }

  /**
   * End auction - mark winning bid as won and others as lost
   */
  async endAuction(productId: string): Promise<void> {
    try {
      const batch = this.db.batch();

      const bidsSnapshot = await this.db
        .collection(this.collection)
        .where(BID_FIELDS.PRODUCT_ID, "==", productId)
        .get();

      bidsSnapshot.docs.forEach((doc) => {
        const bid = doc.data() as BidDocument;
        batch.update(doc.ref, {
          status: bid.isWinning ? "won" : "lost",
          updatedAt: new Date(),
        });
      });

      await batch.commit();
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to end auction for product: ${productId}`,
        error,
      );
    }
  }

  /**
   * Cancel all bids for a product (when product is deleted)
   */
  async cancelProductBids(productId: string): Promise<void> {
    try {
      const batch = this.db.batch();

      const bidsSnapshot = await this.db
        .collection(this.collection)
        .where(BID_FIELDS.PRODUCT_ID, "==", productId)
        .get();

      bidsSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          status: "cancelled",
          isWinning: false,
          updatedAt: new Date(),
        });
      });

      await batch.commit();
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to cancel bids for product: ${productId}`,
        error,
      );
    }
  }

  /**
   * Get bid count for a product
   */
  async countByProduct(productId: string): Promise<number> {
    try {
      return await getFirestoreCount(
        this.db.collection(this.collection).where(BID_FIELDS.PRODUCT_ID, "==", productId),
      );
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to count bids for product: ${productId}`,
        error,
      );
    }
  }

  /**
   * Get user's bid count
   */
  async countByUser(userId: string): Promise<number> {
    try {
      return await getFirestoreCount(
        this.db.collection(this.collection).where(BID_FIELDS.USER_ID, "==", userId),
      );
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to count bids for user: ${userId}`,
        error,
      );
    }
  }

  /**
   * Find a single bid by product, user, and status (database-layer query)
   * Used instead of findBy() + Array.find() for efficiency
   */
  async findOneByProductAndUser(
    productId: string,
    userId: string,
    status: BidStatus = "active",
  ): Promise<BidDocument | null> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(BID_FIELDS.PRODUCT_ID, "==", productId)
        .where(BID_FIELDS.USER_ID, "==", userId)
        .where(BID_FIELDS.STATUS, "==", status)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return this.mapDoc<BidDocument>(snapshot.docs[0]);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to find bid for productId=${productId}, userId=${userId}`,
        error,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Sieve-powered list query
  // ---------------------------------------------------------------------------

  static readonly SIEVE_FIELDS = {
    id: { canFilter: true, canSort: false },
    productId: { canFilter: true, canSort: false },
    productTitle: { canFilter: true, canSort: true },
    userId: { canFilter: true, canSort: false },
    userName: { canFilter: true, canSort: true },
    userEmail: { canFilter: true, canSort: true },
    bidAmount: { canFilter: true, canSort: true },
    status: { canFilter: true, canSort: true },
    isWinning: { canFilter: true, canSort: false },
    bidDate: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
  };

  /**
   * Paginated, Firestore-native bid list (admin use).
   */
  async list(model: SieveModel): Promise<FirebaseSieveResult<BidDocument>> {
    return this.sieveQuery<BidDocument>(model, BidRepository.SIEVE_FIELDS, {
      defaultPageSize: 50,
      maxPageSize: 200,
    });
  }
}

export const bidRepository = new BidRepository();
