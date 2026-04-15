import type {
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";
import {
  BaseRepository,
  prepareForFirestore,
} from "../../../providers/db-firebase";
import {
  addPiiIndices,
  decryptPiiFields,
  encryptPiiFields,
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

const REVIEW_FIELDS = {
  PRODUCT_ID: "productId",
  USER_ID: "userId",
  SELLER_ID: "sellerId",
  STATUS: "status",
  FEATURED: "featured",
  CREATED_AT: "createdAt",
} as const;

class ReviewRepository extends BaseRepository<ReviewDocument> {
  constructor() {
    super(REVIEW_COLLECTION);
  }

  private encryptReviewData<T extends Record<string, unknown>>(data: T): T {
    let encrypted = encryptPiiFields(data, [...REVIEW_PII_FIELDS]);
    encrypted = addPiiIndices(data, REVIEW_PII_INDEX_MAP) as unknown as T;
    encrypted = {
      ...encryptPiiFields(data, [...REVIEW_PII_FIELDS]),
      ...encrypted,
    };
    return encrypted;
  }

  protected override mapDoc<D = ReviewDocument>(
    snap: import("firebase-admin/firestore").DocumentSnapshot,
  ): D {
    const raw = super.mapDoc<ReviewDocument>(snap);
    return decryptPiiFields(raw as unknown as Record<string, unknown>, [
      ...REVIEW_PII_FIELDS,
    ]) as unknown as D;
  }

  async create(input: ReviewCreateInput): Promise<ReviewDocument> {
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
      reviewData as unknown as Record<string, unknown>,
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
      data as unknown as Record<string, unknown>,
    );
    return super.update(reviewId, encrypted as Partial<ReviewDocument>);
  }

  async findByProduct(productId: string): Promise<ReviewDocument[]> {
    return this.findBy(REVIEW_FIELDS.PRODUCT_ID, productId);
  }

  async findApprovedByProduct(productId: string): Promise<ReviewDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(REVIEW_FIELDS.PRODUCT_ID, "==", productId)
      .where(REVIEW_FIELDS.STATUS, "==", "approved")
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc) => this.mapDoc<ReviewDocument>(doc));
  }

  async findByUser(userId: string): Promise<ReviewDocument[]> {
    return this.findBy(REVIEW_FIELDS.USER_ID, userId);
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

  async incrementHelpful(reviewId: string): Promise<void> {
    const review = await this.findById(reviewId);
    if (review) {
      await this.update(reviewId, {
        helpfulCount: review.helpfulCount + 1,
      });
    }
  }

  async incrementReportCount(reviewId: string): Promise<void> {
    const review = await this.findById(reviewId);
    if (review) {
      await this.update(reviewId, {
        reportCount: review.reportCount + 1,
      });
    }
  }

  async getAverageRating(productId: string): Promise<number> {
    const reviews = await this.findApprovedByProduct(productId);
    if (reviews.length === 0) return 0;

    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / reviews.length;
  }

  async getRatingDistribution(
    productId: string,
  ): Promise<Record<number, number>> {
    const reviews = await this.findApprovedByProduct(productId);
    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    reviews.forEach((review) => {
      distribution[review.rating]++;
    });

    return distribution;
  }

  static readonly SIEVE_FIELDS = {
    id: { canFilter: true, canSort: false },
    productId: { canFilter: true, canSort: false },
    productTitle: { canFilter: true, canSort: true },
    userId: { canFilter: true, canSort: false },
    userNameIndex: { canFilter: true, canSort: false },
    userName: { canFilter: false, canSort: false },
    sellerId: { canFilter: true, canSort: false },
    status: { canFilter: true, canSort: true },
    rating: { canFilter: true, canSort: true },
    verified: { canFilter: true, canSort: false },
    helpfulCount: { canFilter: true, canSort: true },
    featured: { canFilter: true, canSort: false },
    reportCount: { canFilter: true, canSort: true },
    updatedAt: { canFilter: true, canSort: true },
    createdAt: { canFilter: true, canSort: true },
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
    return this.sieveQuery<ReviewDocument>(
      model,
      ReviewRepository.SIEVE_FIELDS,
      {
        baseQuery,
        defaultPageSize: 10,
        maxPageSize: 50,
      },
    );
  }

  async listForSeller(
    sellerId: string,
    model: SieveModel,
  ): Promise<FirebaseSieveResult<ReviewDocument>> {
    const baseQuery = this.getCollection().where(
      REVIEW_FIELDS.SELLER_ID,
      "==",
      sellerId,
    );
    return this.sieveQuery<ReviewDocument>(
      model,
      ReviewRepository.SIEVE_FIELDS,
      {
        baseQuery,
        defaultPageSize: 10,
        maxPageSize: 100,
      },
    );
  }

  async listAll(
    model: SieveModel,
  ): Promise<FirebaseSieveResult<ReviewDocument>> {
    return this.sieveQuery<ReviewDocument>(
      model,
      ReviewRepository.SIEVE_FIELDS,
      {
        defaultPageSize: 50,
        maxPageSize: 200,
      },
    );
  }
}

const reviewRepository = new ReviewRepository();

export { ReviewRepository, reviewRepository };
export { ReviewRepository as ReviewsRepository };
