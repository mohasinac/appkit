import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap, makeQuerySnap } from "../../../../../tests/helpers/mock-firestore";

const { db, mockDocRef, mockCollection, mockQuery } = makeMockDb();

vi.mock("../../../../providers/db-firebase/admin", () => ({
  getAdminDb: () => db,
}));

vi.mock("../../../../providers/db-firebase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../providers/db-firebase")>();
  return {
    ...actual,
    prepareForFirestore: (d: Record<string, unknown>) => d,
  };
});

vi.mock("../../../../security", () => ({
  encryptPiiFields: (d: Record<string, unknown>) => d,
  decryptPiiFields: (d: Record<string, unknown>) => d,
  addPiiIndices: (d: Record<string, unknown>) => d,
  REVIEW_PII_FIELDS: ["userName", "userEmail"],
  REVIEW_PII_INDEX_MAP: {},
}));

vi.mock("../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

import { ReviewRepository } from "../reviews.repository";

const repo = new ReviewRepository();

function makeReviewDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "review-charizard-ravi-20260101",
    productId: "product-charizard",
    productTitle: "Charizard PSA9",
    userId: "user-ravi",
    userName: "Ravi Kumar",
    storeId: "store-pokemon-palace",
    rating: 5,
    title: "Amazing card!",
    body: "Pristine condition.",
    status: "approved",
    helpfulCount: 0,
    reportCount: 0,
    verified: true,
    featured: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeQueryDocSnaps(ratings: number[], statusOverride = "approved") {
  return ratings.map((rating, i) => ({
    id: `review-${i}`,
    data: makeReviewDoc({ id: `review-${i}`, rating, status: statusOverride }),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  db.collection.mockReturnValue(mockCollection);
  mockCollection.doc.mockReturnValue(mockDocRef);
  mockCollection.where.mockReturnValue(mockQuery);
  mockQuery.where.mockReturnValue(mockQuery);
  mockQuery.orderBy.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);
  mockQuery.get.mockResolvedValue(makeQuerySnap([]));
  mockDocRef.get.mockResolvedValue(makeSnap(null));
  mockDocRef.set.mockResolvedValue(undefined);
  mockDocRef.update.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------
describe("ReviewRepository.create", () => {
  it("creates review with status: pending", async () => {
    const input = {
      productId: "product-charizard",
      productTitle: "Charizard PSA9",
      userId: "user-ravi",
      userName: "Ravi Kumar",
      storeId: "store-pokemon",
      rating: 5,
      title: "Great!",
      body: "Excellent.",
      images: [],
    };
    const result = await repo.create(input as never);
    expect(result.status).toBe("pending");
  });

  it("starts helpfulCount at 0 and reportCount at 0", async () => {
    const result = await repo.create({
      productId: "p-1",
      productTitle: "Hot Wheels",
      userId: "user-1",
      userName: "Arun",
      storeId: "store-1",
      rating: 4,
      title: "Good",
      body: "Nice toy",
      images: [],
    } as never);
    expect(result.helpfulCount).toBe(0);
    expect(result.reportCount).toBe(0);
  });

  it("sets verified: false by default", async () => {
    const result = await repo.create({
      productId: "p-1",
      productTitle: "T",
      userId: "u-1",
      userName: "User",
      storeId: "s-1",
      rating: 3,
      title: "T",
      body: "B",
      images: [],
    } as never);
    expect(result.verified).toBe(false);
  });

  it("persists the review to Firestore", async () => {
    await repo.create({
      productId: "p-1",
      productTitle: "Product",
      userId: "u-1",
      userName: "User",
      storeId: "s-1",
      rating: 5,
      title: "T",
      body: "B",
      images: [],
    } as never);
    expect(mockDocRef.set).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// approve
// ---------------------------------------------------------------------------
describe("ReviewRepository.approve", () => {
  it("sets status: approved", async () => {
    const review = makeReviewDoc({ status: "pending" });
    mockDocRef.get.mockResolvedValue(makeSnap(review, review.id as string));
    await repo.approve("review-1", "mod-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved" }),
    );
  });

  it("stores moderatorId on the review", async () => {
    const review = makeReviewDoc({ status: "pending" });
    mockDocRef.get.mockResolvedValue(makeSnap(review, review.id as string));
    await repo.approve("review-1", "mod-admin-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ moderatorId: "mod-admin-1" }),
    );
  });

  it("sets approvedAt timestamp", async () => {
    const review = makeReviewDoc({ status: "pending" });
    mockDocRef.get.mockResolvedValue(makeSnap(review, review.id as string));
    await repo.approve("review-1", "mod-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ approvedAt: expect.any(Date) }),
    );
  });

  it("stores optional moderatorNote when provided", async () => {
    const review = makeReviewDoc({ status: "pending" });
    mockDocRef.get.mockResolvedValue(makeSnap(review, review.id as string));
    await repo.approve("review-1", "mod-1", "Looks good");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ moderatorNote: "Looks good" }),
    );
  });
});

// ---------------------------------------------------------------------------
// reject
// ---------------------------------------------------------------------------
describe("ReviewRepository.reject", () => {
  it("sets status: rejected", async () => {
    const review = makeReviewDoc({ status: "pending" });
    mockDocRef.get.mockResolvedValue(makeSnap(review, review.id as string));
    await repo.reject("review-1", "mod-1", "Spam content");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "rejected" }),
    );
  });

  it("stores rejectionReason", async () => {
    const review = makeReviewDoc({ status: "pending" });
    mockDocRef.get.mockResolvedValue(makeSnap(review, review.id as string));
    await repo.reject("review-1", "mod-1", "Inappropriate language");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ rejectionReason: "Inappropriate language" }),
    );
  });

  it("sets rejectedAt timestamp", async () => {
    const review = makeReviewDoc({ status: "pending" });
    mockDocRef.get.mockResolvedValue(makeSnap(review, review.id as string));
    await repo.reject("review-1", "mod-1", "reason");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ rejectedAt: expect.any(Date) }),
    );
  });
});

// ---------------------------------------------------------------------------
// incrementHelpful
// ---------------------------------------------------------------------------
describe("ReviewRepository.incrementHelpful", () => {
  it("increments helpfulCount by exactly 1", async () => {
    const review = makeReviewDoc({ helpfulCount: 4 });
    mockDocRef.get.mockResolvedValue(makeSnap(review, review.id as string));
    await repo.incrementHelpful("review-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ helpfulCount: 5 }),
    );
  });

  it("no-op when review is not found", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    await repo.incrementHelpful("review-ghost");
    expect(mockDocRef.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getAverageRating
// ---------------------------------------------------------------------------
describe("ReviewRepository.getAverageRating", () => {
  it("computes average from approved reviews", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap(makeQueryDocSnaps([5, 3, 4])));
    const avg = await repo.getAverageRating("product-charizard");
    expect(avg).toBeCloseTo(4.0, 5);
  });

  it("single review → returns that rating exactly", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap(makeQueryDocSnaps([3])));
    const avg = await repo.getAverageRating("product-1");
    expect(avg).toBe(3);
  });

  it("no reviews → returns 0", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const avg = await repo.getAverageRating("product-empty");
    expect(avg).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getRatingDistribution
// ---------------------------------------------------------------------------
describe("ReviewRepository.getRatingDistribution", () => {
  it("counts each rating bucket correctly", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap(makeQueryDocSnaps([5, 5, 3])));
    const dist = await repo.getRatingDistribution("product-1");
    expect(dist[5]).toBe(2);
    expect(dist[3]).toBe(1);
  });

  it("returns zeros for buckets with no reviews", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap(makeQueryDocSnaps([5, 5, 3])));
    const dist = await repo.getRatingDistribution("product-1");
    expect(dist[1]).toBe(0);
    expect(dist[2]).toBe(0);
    expect(dist[4]).toBe(0);
  });

  it("all 5 ratings present", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap(makeQueryDocSnaps([1, 2, 3, 4, 5])));
    const dist = await repo.getRatingDistribution("product-1");
    expect(dist[1]).toBe(1);
    expect(dist[2]).toBe(1);
    expect(dist[3]).toBe(1);
    expect(dist[4]).toBe(1);
    expect(dist[5]).toBe(1);
  });

  it("no reviews → all buckets are 0", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const dist = await repo.getRatingDistribution("product-empty");
    expect(Object.values(dist).every((v) => v === 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getApprovedRatingAggregate
// ---------------------------------------------------------------------------
describe("ReviewRepository.getApprovedRatingAggregate", () => {
  it("returns count and avgRating rounded to 1 decimal", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap(makeQueryDocSnaps([5, 4, 3])));
    const agg = await repo.getApprovedRatingAggregate("product-1");
    expect(agg.count).toBe(3);
    expect(agg.avgRating).toBe(4.0);
  });

  it("avgRating correctly rounds to 1 decimal (3.333... → 3.3)", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap(makeQueryDocSnaps([4, 3, 3])));
    const agg = await repo.getApprovedRatingAggregate("product-1");
    expect(agg.avgRating).toBe(3.3);
  });

  it("no reviews → count=0, avgRating=0", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const agg = await repo.getApprovedRatingAggregate("product-none");
    expect(agg).toEqual({ count: 0, avgRating: 0 });
  });
});

// ---------------------------------------------------------------------------
// findApprovedByProduct
// ---------------------------------------------------------------------------
describe("ReviewRepository.findApprovedByProduct", () => {
  it("queries by productId AND status=approved", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findApprovedByProduct("product-1");
    expect(mockCollection.where).toHaveBeenCalledWith("productId", "==", "product-1");
    expect(mockQuery.where).toHaveBeenCalledWith("status", "==", "approved");
  });

  it("orders results by createdAt descending", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findApprovedByProduct("product-1");
    expect(mockQuery.orderBy).toHaveBeenCalledWith("createdAt", "desc");
  });

  it("does NOT return pending reviews", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const results = await repo.findApprovedByProduct("product-1");
    expect(results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// findPending
// ---------------------------------------------------------------------------
describe("ReviewRepository.findPending", () => {
  it("queries by status=pending", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findPending();
    expect(mockCollection.where).toHaveBeenCalledWith("status", "==", "pending");
  });

  it("returns only pending reviews", async () => {
    const pending = makeReviewDoc({ status: "pending" });
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: pending.id as string, data: pending }]));
    const results = await repo.findPending();
    expect(results).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// findFeatured
// ---------------------------------------------------------------------------
describe("ReviewRepository.findFeatured", () => {
  it("queries by featured=true AND status=approved", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findFeatured();
    expect(mockCollection.where).toHaveBeenCalledWith("featured", "==", true);
    expect(mockQuery.where).toHaveBeenCalledWith("status", "==", "approved");
  });

  it("applies default limit of 18", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findFeatured();
    expect(mockQuery.limit).toHaveBeenCalledWith(18);
  });

  it("applies custom limit when provided", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findFeatured(6);
    expect(mockQuery.limit).toHaveBeenCalledWith(6);
  });
});
