import type { JsonValue } from "../../../schemas/types";
import type {
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";
import {
  BaseRepository,
  getFirestoreCount,
  prepareForFirestore,
  parseSieveDateValue,
} from "../../../providers/db-firebase";
import { NotFoundError } from "../../../errors";
import { REVIEW_MAX_RATING, REVIEW_MIN_RATING } from "../../../_internal/shared/features/reviews/config";
import {
  decryptPiiFields,
  encryptPiiFields,
  piiIndicesFor,
  REVIEW_PII_FIELDS,
  REVIEW_PII_INDEX_MAP,
} from "../../../security";
import {
  createReviewId,
  REVIEW_COLLECTION,
  type ReviewCreateInput,
  type ReviewDocument,
} from "../schemas";
import type { ReviewStatus } from "../types";
import { buildReviewSearchTxt } from "../../../utils/search-txt-builders";
import {
  planSearchTxt,
  refineSearchTxt,
  emptySearchResult,
} from "../../../utils/search-txt-query";

const REVIEW_FIELDS = {
  /** Word-prefix search tokens. Derived on write by `buildSearchTxtFor`. */
  SEARCH_TXT: "searchTxt",
  PRODUCT_ID: "productId",
  USER_ID: "userId",
  STORE_ID: "storeId",
  STATUS: "status",
  FEATURED: "featured",
  CREATED_AT: "createdAt",
  REVIEWEE_ID: "revieweeId",
  REVIEWER_ROLE: "reviewerRole",
  RATING: "rating",
} as const;

export interface ReviewRatingAggregate {
  count: number;
  avgRating: number;
}

class ReviewRepository extends BaseRepository<ReviewDocument> {
  constructor() {
    super(REVIEW_COLLECTION);
  }

  private decryptSieveResult(
    result: FirebaseSieveResult<ReviewDocument>,
  ): FirebaseSieveResult<ReviewDocument> {
    return {
      ...result,
      items: result.items.map(
        (item) =>
          decryptPiiFields(item, [
            ...REVIEW_PII_FIELDS,
          ]) as unknown as ReviewDocument,
      ),
    };
  }

  /**
   * Encrypt PII, then attach blind indices derived from the plaintext.
   *
   * Previously this reassigned `encrypted = addPiiIndices(data, …)` — which
   * re-reads the ORIGINAL plaintext and returns `{...data, ...indices}` — and
   * then spread that over the ciphertext, so plaintext won and `userName` was
   * written to Firestore in the clear beside a valid index. `piiIndicesFor`
   * returns the index fields alone, so the ciphertext cannot be overwritten.
   * The identical bug was fixed in UserRepository and never propagated here.
   */
  private encryptReviewData<T extends object>(data: T): T {
    return {
      ...encryptPiiFields(data, [...REVIEW_PII_FIELDS]),
      ...piiIndicesFor(data, REVIEW_PII_INDEX_MAP),
    } as T;
  }

  protected override mapDoc<D = ReviewDocument>(
    snap: import("../../../providers/db-firebase").DocumentSnapshot,
  ): D {
    const raw = super.mapDoc<ReviewDocument>(snap);
    // `helpfulVoterIds` is an idempotency key, not review content — publishing it
    // would tell everyone who voted on what. Stripped here rather than in each
    // route because `/api/reviews` returns `result.items` verbatim (REVIEW_PUBLIC_FIELDS
    // exists but nothing projects through it), so a route-level strip is one
    // forgotten call site away from a leak. `voteHelpful` reads the raw snapshot
    // inside its transaction and is unaffected.
    const { helpfulVoterIds: _voters, ...rest } = raw as ReviewDocument;
    return decryptPiiFields(rest, [
      ...REVIEW_PII_FIELDS,
    ]) as unknown as D;
  }

  override async create(input: ReviewCreateInput): Promise<ReviewDocument> {
    const firstName = input.userName.split(" ")[0] || input.userName;
    const id = createReviewId(input.productTitle, firstName, new Date());

    const reviewData: Omit<ReviewDocument, "id"> = {
      ...input,
      helpfulCount: 0,
      reportCount: 0,
      status: "pending",
      verified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const encrypted = this.encryptReviewData(
      reviewData,
    );

    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(encrypted));

    return { id, ...reviewData };
  }

  override async update(
    reviewId: string,
    data: Partial<ReviewDocument>,
  ): Promise<ReviewDocument> {
    const encrypted = this.encryptReviewData(
      data,
    );
    return super.update(reviewId, encrypted as Partial<ReviewDocument>);
  }

  async findByProduct(productId: string): Promise<ReviewDocument[]> {
    return this.findBy(REVIEW_FIELDS.PRODUCT_ID, productId);
  }

  /**
   * Approved reviews for a product, newest first.
   *
   * `limit` is optional and deliberately has no default — callers that page or aggregate
   * should use `listForProduct` / `getApprovedRatingSummary` instead, and the remaining
   * callers each pass their own explicit bound. Silently capping here would truncate
   * consumers that expect the full set (Rule #6 wants the bound at the call site, where
   * it can be reasoned about).
   */
  async findApprovedByProduct(
    productId: string,
    limit?: number,
  ): Promise<ReviewDocument[]> {
    let query = this.getCollection()
      .where(REVIEW_FIELDS.PRODUCT_ID, "==", productId)
      .where(REVIEW_FIELDS.STATUS, "==", "approved")
      .orderBy(REVIEW_FIELDS.CREATED_AT, "desc");

    if (limit !== undefined) query = query.limit(limit);

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => this.mapDoc<ReviewDocument>(doc));
  }

  async findApprovedByStore(storeId: string): Promise<ReviewDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(REVIEW_FIELDS.STORE_ID, "==", storeId)
      .where(REVIEW_FIELDS.STATUS, "==", "approved")
      .orderBy(REVIEW_FIELDS.CREATED_AT, "desc")
      .limit(50)
      .get();

    return snapshot.docs.map((doc) => this.mapDoc<ReviewDocument>(doc));
  }

  async findByUser(userId: string): Promise<ReviewDocument[]> {
    return this.findBy(REVIEW_FIELDS.USER_ID, userId);
  }

  async findApprovedByUser(userId: string): Promise<ReviewDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(REVIEW_FIELDS.USER_ID, "==", userId)
      .where(REVIEW_FIELDS.STATUS, "==", "approved")
      .orderBy(REVIEW_FIELDS.CREATED_AT, "desc")
      .limit(50)
      .get();
    return snapshot.docs.map((doc) => this.mapDoc<ReviewDocument>(doc));
  }

  async findPending(): Promise<ReviewDocument[]> {
    return this.findBy(REVIEW_FIELDS.STATUS, "pending");
  }

  async findByStatus(status: ReviewStatus): Promise<ReviewDocument[]> {
    return this.findBy(REVIEW_FIELDS.STATUS, status);
  }

  async findFeatured(limit = 18): Promise<ReviewDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(REVIEW_FIELDS.FEATURED, "==", true)
      .where(REVIEW_FIELDS.STATUS, "==", "approved")
      .orderBy(REVIEW_FIELDS.CREATED_AT, "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDoc<ReviewDocument>(doc));
  }

  async approve(
    reviewId: string,
    moderatorId: string,
    moderatorNote?: string,
  ): Promise<ReviewDocument> {
    return this.update(reviewId, {
      status: "approved",
      moderatorId,
      moderatorNote,
      approvedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async reject(
    reviewId: string,
    moderatorId: string,
    rejectionReason: string,
    moderatorNote?: string,
  ): Promise<ReviewDocument> {
    return this.update(reviewId, {
      status: "rejected",
      moderatorId,
      moderatorNote,
      rejectionReason,
      rejectedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Record one helpful vote, idempotently per user.
   *
   * Runs in a transaction because the read-modify-write on `helpfulCount` races
   * itself otherwise — two concurrent votes both read N and both write N+1.
   * `helpfulVoterIds` is what makes a repeat POST a no-op; the client's
   * localStorage flag is advisory and cannot be trusted.
   *
   * @returns `counted` false when this user had already voted (not an error —
   *          the caller reports the current count either way).
   */
  async voteHelpful(
    reviewId: string,
    userId: string,
  ): Promise<{ counted: boolean; helpfulCount: number }> {
    const ref = this.getCollection().doc(reviewId);

    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        throw new NotFoundError(`Review not found: ${reviewId}`);
      }

      const data = snap.data() as ReviewDocument;
      const voters = data.helpfulVoterIds ?? [];
      const current = data.helpfulCount ?? 0;

      if (voters.includes(userId)) {
        return { counted: false, helpfulCount: current };
      }

      const next = current + 1;
      tx.update(ref, {
        helpfulCount: next,
        helpfulVoterIds: [...voters, userId],
        updatedAt: new Date(),
      });
      return { counted: true, helpfulCount: next };
    });
  }

  async incrementReportCount(reviewId: string): Promise<void> {
    const review = await this.findById(reviewId);
    if (review) {
      await this.update(reviewId, {
        reportCount: review.reportCount + 1,
      });
    }
  }

  /**
   * Approved-review count, average and per-star distribution for one product.
   *
   * Built from Firestore *aggregation* queries (one `count()` per star bucket, run in
   * parallel) rather than reading the documents. Ratings are `z.number().int().min(1).max(5)`
   * at the write path, so the five buckets are exhaustive and the average derived from them
   * is exact. This replaces an unbounded `findApprovedByProduct()` scan that used to sit on
   * the hot path of every product render and every `/api/reviews?productId=` call (Rule #6).
   */
  async getApprovedRatingSummary(productId: string): Promise<{
    total: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
  }> {
    const base = this.getCollection()
      .where(REVIEW_FIELDS.PRODUCT_ID, "==", productId)
      .where(REVIEW_FIELDS.STATUS, "==", "approved");

    const buckets: number[] = [];
    for (let r = REVIEW_MIN_RATING; r <= REVIEW_MAX_RATING; r++) buckets.push(r);

    const counts = await Promise.all(
      buckets.map((rating) => getFirestoreCount(base.where(REVIEW_FIELDS.RATING, "==", rating))),
    );

    const ratingDistribution: Record<number, number> = {};
    let total = 0;
    let weighted = 0;
    buckets.forEach((rating, i) => {
      const count = counts[i] ?? 0;
      ratingDistribution[rating] = count;
      total += count;
      weighted += count * rating;
    });

    return {
      total,
      averageRating: total > 0 ? weighted / total : 0,
      ratingDistribution,
    };
  }

  async getAverageRating(productId: string): Promise<number> {
    const { averageRating } = await this.getApprovedRatingSummary(productId);
    return averageRating;
  }

  async getRatingDistribution(
    productId: string,
  ): Promise<Record<number, number>> {
    const { ratingDistribution } = await this.getApprovedRatingSummary(productId);
    return ratingDistribution;
  }

  /**
   * Cloud Functions compatibility: approved review count + average by product.
   * Return shape is load-bearing for the Functions callers — do not change it.
   */
  async getApprovedRatingAggregate(
    productId: string,
  ): Promise<ReviewRatingAggregate> {
    const { total, averageRating } = await this.getApprovedRatingSummary(productId);
    if (total === 0) return { count: 0, avgRating: 0 };
    return { count: total, avgRating: Math.round(averageRating * 10) / 10 };
  }

  /**
   * Cloud Functions compatibility: approved review count + average by store.
   */
  async getApprovedRatingAggregateByStore(
    storeId: string,
  ): Promise<ReviewRatingAggregate> {
    // Same aggregation-query approach as getApprovedRatingSummary — no document reads.
    const base = this.getCollection()
      .where(REVIEW_FIELDS.STORE_ID, "==", storeId)
      .where(REVIEW_FIELDS.STATUS, "==", "approved");

    const buckets: number[] = [];
    for (let r = REVIEW_MIN_RATING; r <= REVIEW_MAX_RATING; r++) buckets.push(r);

    const counts = await Promise.all(
      buckets.map((rating) => getFirestoreCount(base.where(REVIEW_FIELDS.RATING, "==", rating))),
    );

    let count = 0;
    let weighted = 0;
    buckets.forEach((rating, i) => {
      count += counts[i] ?? 0;
      weighted += (counts[i] ?? 0) * rating;
    });

    if (count === 0) return { count: 0, avgRating: 0 };
    return { count, avgRating: Math.round((weighted / count) * 10) / 10 };
  }

  /** Find reviews where this user is the reviewee (seller→buyer reviews received by a buyer). */
  async findByReviewee(revieweeId: string): Promise<ReviewDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(REVIEW_FIELDS.REVIEWEE_ID, "==", revieweeId)
      .where(REVIEW_FIELDS.STATUS, "==", "approved")
      .orderBy(REVIEW_FIELDS.CREATED_AT, "desc")
      .get();
    return snapshot.docs.map((doc) => this.mapDoc<ReviewDocument>(doc));
  }

  /** Find reviews written by a user filtered by their role as reviewer. */
  async findByUserAsRole(
    userId: string,
    role: "buyer" | "seller",
  ): Promise<ReviewDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(REVIEW_FIELDS.USER_ID, "==", userId)
      .where(REVIEW_FIELDS.REVIEWER_ROLE, "==", role)
      .orderBy(REVIEW_FIELDS.CREATED_AT, "desc")
      .get();
    return snapshot.docs.map((doc) => this.mapDoc<ReviewDocument>(doc));
  }

  static readonly SIEVE_FIELDS = {
    searchTxt: { canFilter: true, canSort: false },
    id: { canFilter: true, canSort: false },
    productId: { canFilter: true, canSort: false },
    productTitle: { canFilter: true, canSort: true },
    userId: { canFilter: true, canSort: false },
    userNameIndex: { canFilter: true, canSort: false },
    userName: { canFilter: false, canSort: false },
    storeId: { canFilter: true, canSort: false },
    storeName: { canFilter: true, canSort: false },
    revieweeId: { canFilter: true, canSort: false },
    reviewerRole: { canFilter: true, canSort: false },
    status: { canFilter: true, canSort: true },
    rating: { canFilter: true, canSort: true },
    verified: { canFilter: true, canSort: false },
    // Denormalised flag that exists specifically to make `hasImages==true` queryable —
    // it was missing here, so the sieve whitelist silently dropped the clause and the
    // "with photos only" filter did nothing.
    hasImages: { canFilter: true, canSort: false },
    helpfulCount: { canFilter: true, canSort: true },
    featured: { canFilter: true, canSort: false },
    reportCount: { canFilter: true, canSort: true },
    updatedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
  };

  async listForProduct(
    productId: string,
    model: SieveModel,
  ): Promise<FirebaseSieveResult<ReviewDocument>> {
    const baseQuery = this.getCollection().where(
      REVIEW_FIELDS.PRODUCT_ID,
      "==",
      productId,
    );
    const result = await this.sieveQuery<ReviewDocument>(
      model,
      ReviewRepository.SIEVE_FIELDS,
      {
        baseQuery,
        defaultPageSize: 10,
        maxPageSize: 50,
      },
    );
    return this.decryptSieveResult(result);
  }

  async listForStore(
    storeId: string,
    model: SieveModel,
  ): Promise<FirebaseSieveResult<ReviewDocument>> {
    const baseQuery = this.getCollection().where(
      REVIEW_FIELDS.STORE_ID,
      "==",
      storeId,
    );
    const result = await this.sieveQuery<ReviewDocument>(
      model,
      ReviewRepository.SIEVE_FIELDS,
      {
        baseQuery,
        defaultPageSize: 10,
        maxPageSize: 100,
      },
    );
    return this.decryptSieveResult(result);
  }

  /**
   * Derived on every write path via `applyWriteHooks`.
   *
   * `userName` is PII and is deliberately absent from the token source — a
   * searchTxt for a person's name IS that name, re-encoded (D1).
   */
  protected override buildSearchTxtFor(
    data: Record<string, JsonValue>,
  ): string[] | null {
    return buildReviewSearchTxt(data as Partial<ReviewDocument>);
  }

  async listAll(
    model: SieveModel,
    opts?: { search?: string },
  ): Promise<FirebaseSieveResult<ReviewDocument>> {
    const plan = planSearchTxt(opts?.search);
    if (plan.empty) return emptySearchResult<ReviewDocument>();

    let baseQuery = this.getCollection();
    if (plan.head) {
      baseQuery = baseQuery.where(
        REVIEW_FIELDS.SEARCH_TXT,
        "array-contains",
        plan.head,
      ) as typeof baseQuery;
    }

    const result = await this.sieveQuery<ReviewDocument>(
      model,
      ReviewRepository.SIEVE_FIELDS,
      {
        baseQuery,
        defaultPageSize: 50,
        maxPageSize: 200,
      },
    );
    // Refine BEFORE decrypting: the refine reads `searchTxt`, which is never
    // encrypted, and decrypting rows that are about to be dropped is waste.
    return this.decryptSieveResult(refineSearchTxt(result, plan.rest));
  }
}

const reviewRepository = new ReviewRepository();

export { ReviewRepository, reviewRepository };
