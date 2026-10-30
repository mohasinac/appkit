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
  applySieveToFirestore,
} from "../../../providers/db-firebase";
import type { DocumentReference, WriteBatch } from "firebase-admin/firestore";
import { DatabaseError } from "../../../errors";
import type { JsonValue } from "../../../schemas/types";
import { buildBidSearchTxt } from "../../../utils/search-txt-builders";
import {
  planSearchTxt,
  beginSearchWindow,
  emptySearchResult,
} from "../../../utils/search-txt-query";
import type {
  SieveModel,
  FirebaseSieveResult,
} from "../../../providers/db-firebase";
import type {
  BidDocument,
  BidPlain,
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
  BID_PII_FIELDS,
  maskPii,
  revealPii,
} from "../../../security";
import { BID_FIELDS } from "../../../constants/field-names";

export class BidRepository extends BaseRepository<BidDocument> {
  constructor() {
    super(BID_COLLECTION);
  }

  /**
   * Declared, not hand-rolled.
   *
   * `create` encrypted `userEmail` while nothing else did, and there was no
   * `update` override — so `adminUpdateBid`, whose input type is
   * `Partial<Omit<BidDocument,"id"|"createdAt">>` and therefore INCLUDES
   * `userEmail`, routed to `BaseRepository.update` -> `applyWriteHooks` with
   * `piiFields = []` and wrote plaintext back over the ciphertext.
   *
   * Declaring it covers all nine mutating methods, including the `*InTx` /
   * `*InBatch` family that had no encryption at all.
   *
   * 🛑 It does NOT cover `setWinningBid`, `endCollectorDrop`, `cancelProductBids` or
   * the `markWon`/`markLost`/`markOutbid`/`markWinning` cluster — those call
   * `batch.update(ref, …)` DIRECTLY and always will. They do not touch
   * `userEmail` today, so there is no leak; the next PII-shaped field added to
   * one of those patches would inherit the bypass.
   */
  protected override piiFields = BID_PII_FIELDS;

  /** Override mapDoc to auto-decrypt PII on every bid read */
  /*
   * 🛑 `mapDoc` is NOT overridden, and that absence IS the change.
   *
   * It used to decrypt on every read, so ciphertext never left the database
   * and every caller handled plaintext without ever saying so. Following
   * `SiteSettingsRepository`: reads return what Firestore holds, and plaintext
   * requires one of the two named methods below.
   *
   * A convention would not hold this. `BidDocument`'s PII fields are
   * `Encrypted<string>`, assignable to nothing that wants a plain `string`, so
   * a reader that skips both accessors is a compile error naming file and line.
   */

  /** Plaintext PII. **Opt-in and named** — shows up in review and in a grep. */
  revealBid(doc: BidDocument): BidPlain {
    return revealPii<BidPlain>(doc, BID_PII_FIELDS);
  }

  /** As `revealBid`, for a list read. */
  revealBids(docs: readonly BidDocument[]): BidPlain[] {
    return docs.map((d) => this.revealBid(d));
  }

  /**
   * Masked PII — **the default for any surface that only needs to identify a
   * row to a human.** Decrypts first, then masks: the mask helpers refuse
   * ciphertext by design, so passing a stored field straight in would return
   * "Anonymous" for every row.
   */
  maskedBid(doc: BidDocument): BidPlain {
    return maskPii<BidPlain>(doc, BID_PII_FIELDS);
  }

  /** As `maskedBid`, for a list read. */
  maskedBids(docs: readonly BidDocument[]): BidPlain[] {
    return docs.map((d) => this.maskedBid(d));
  }

  /**
   * Create new bid with auto-generated ID
   */
  /*
   * 🛑 NOT an `override` of `create`, and the rename is forced rather than
   * stylistic.
   *
   * `BaseRepository.create` is declared `(data: Partial<Doc> | FirestoreDocument)`,
   * i.e. it promises to accept the CIPHERTEXT shape. This method accepts
   * PLAINTEXT and encrypts. `string` and `Encrypted<string>` are incompatible
   * in both directions, so an override is a TS2416 no matter which way the
   * check runs — and it should be, because the two signatures genuinely
   * disagree about what the caller is holding.
   *
   * Five call sites across both repositories; `create` remains inherited for
   * anything that legitimately has ciphertext already.
   */
  async createBid(input: BidCreateInput): Promise<BidPlain> {
    const bidIdInput = {
      productName: input.productTitle,
      userFirstName: input.userName.split(" ")[0] || input.userName,
      date: new Date(),
    };

    const id = createBidId(bidIdInput);

    // Plain in, ciphertext out — the write hook encrypts below.
    const bidData: Omit<BidPlain, "id"> = {
      ...input,
      status: "active",
      isWinning: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // The SAME hook every other write path uses, rather than a second
    // hand-rolled call that has to stay in agreement with it.
    const encrypted = this.applyWriteHooks(bidData);

    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(encrypted));

    /*
      * Returns `BidPlain`, and the declared type now says so.
      *
      * This line's own comment has always read "return plaintext to caller"
      * while the signature promised `BidDocument` — the exact mismatch
      * `Encrypted<string>` exists to surface. It echoes the input rather than
      * re-reading, which is deliberate (a read-after-write costs a Firestore
      * read on every bid), so what comes back is the plaintext that went in.
      */
    return { id, ...bidData };
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
   * a collector drop in one Firestore batch. `prior` is the document from the SAME
   * query that produced the ref — every caller has it (`activeBids` and
   * `losers` are both `{ ref, data }` pairs), so history costs no extra read
   * even when a collector drop closes with hundreds of bids (Rule #6).
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
   * batch of their own — a Buy Now purchase ends the collector drop outside the
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
        // because forcing a read per losing bid would put a large collector drop's
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
   * the collector drop it was placed against carried on untouched.
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
        // `encryptPiiFields` covers a field only where it is NAMED. It CAN reach
        // into an array via `array[].key`, but a bare key does not — so an
        // undeclared nested value is stored in plaintext.
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
    const updateData: Partial<BidPlain> = {
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
    const updateData: Partial<BidPlain> = {
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
   * End collector drop - mark winning bid as won and others as lost
   */
  async endCollectorDrop(productId: string): Promise<void> {
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
        `Failed to end collector drop for product: ${productId}`,
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
    /*
     * Filterable so the grammar admits it; the real read is an
     * `array-contains` pushdown in `list()`, not a Sieve clause — Sieve cannot
     * express array membership.
     */
    searchTxt: { canFilter: true, canSort: false },
    // Encrypted (BID_PII_FIELDS). Filtering compares plaintext against
    // `enc:v1:…` and matches ZERO rows with a 200; sorting orders by base64
    // noise. It appeared to work only because the column was still
    // plaintext. There is no blind index for bids (`indexMap: {}`), so the
    // fix is to close it, not to add one — same as payout.sellerEmail.
    userEmail: { canFilter: false, canSort: false },
    bidAmount: { canFilter: true, canSort: true },
    status: { canFilter: true, canSort: true },
    isWinning: { canFilter: true, canSort: false },
    bidDate: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
  };

  /**
   * Paginated, Firestore-native bid list (admin use).
   */
  /** Derived on every write path via `applyWriteHooks`. */
  protected override buildSearchTxtFor(
    data: Record<string, JsonValue>,
  ): string[] | null {
    return buildBidSearchTxt(data as Partial<BidDocument>);
  }

  /**
   * `opts.search` is a searchTxt PUSHDOWN, not a Sieve clause.
   *
   * ## What this replaces, on both of its two surfaces
   *
   * `/api/store/bids` searched the bidder with `userName@=`, a CASE-SENSITIVE
   * prefix — the only thing Firestore can do for a prefix — so a seller typing
   * "ravi" did not find "Ravi", and "kumar" never found anyone at all.
   * `/api/user/bids` filtered `productTitle.includes(q)` in memory AFTER
   * paging, so a match on page 2 was unreachable.
   *
   * Token search fixes both: `buildSearchTxt` normalises case and indexes word
   * prefixes, so the query and the index meet on tokens rather than on a
   * substring of one field.
   *
   * 🛑 `planSearchTxt`'s `empty` guard is the load-bearing part. A query that
   * normalises to no usable token (`"!!!"`, `"—"`) MUST return nothing —
   * emitting no clause instead returns the whole collection and calls it a
   * search result, which is the shape of every silent-search bug in this
   * codebase.
   */
  async list(
    model: SieveModel,
    opts?: { search?: string },
  ): Promise<FirebaseSieveResult<BidDocument>> {
    const plan = planSearchTxt(opts?.search);
    if (plan.empty) return emptySearchResult<BidDocument>();

    if (!plan.head) {
      return this.sieveQuery<BidDocument>(model, BidRepository.SIEVE_FIELDS, {
        defaultPageSize: 50,
        maxPageSize: 200,
      });
    }

    const baseQuery = this.getCollection().where(
      "searchTxt",
      "array-contains",
      plan.head,
    ) as FirebaseFirestore.Query;

    // One bounded window, one raised maxPageSize, one page slice — hand-rolling
    // the three is how other repositories each ended up with two of them.
    const win = beginSearchWindow(model, plan);
    const result = await applySieveToFirestore<BidDocument>({
      baseQuery,
      model: win.model,
      options: { maxPageSize: win.maxPageSize(200) },
      fields: BidRepository.SIEVE_FIELDS,
      mapDoc: (snap) => this.mapDoc<BidDocument>(snap),
    });
    return win.finish(result);
  }
}

export const bidRepository = new BidRepository();
