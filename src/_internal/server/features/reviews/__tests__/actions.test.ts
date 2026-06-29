import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRequireRoleUser,
  mockReviewCreate,
  mockReviewUpdate,
  mockReviewDelete,
  mockReviewIncrementHelpful,
  mockProductFindById,
  mockUserFindById,
  mockAssertNotDuplicateReview,
  mockAssertReviewOwnership,
  mockGetReviewOrThrow,
  mockIsAdminUser,
} = vi.hoisted(() => ({
  mockRequireRoleUser: vi.fn(),
  mockReviewCreate: vi.fn(),
  mockReviewUpdate: vi.fn(),
  mockReviewDelete: vi.fn(),
  mockReviewIncrementHelpful: vi.fn(),
  mockProductFindById: vi.fn(),
  mockUserFindById: vi.fn(),
  mockAssertNotDuplicateReview: vi.fn(),
  mockAssertReviewOwnership: vi.fn(),
  mockGetReviewOrThrow: vi.fn(),
  mockIsAdminUser: vi.fn(),
}));

vi.mock("@mohasinac/appkit/server", () => ({
  wrapAction: async (fn: () => Promise<unknown>) => {
    try {
      return { ok: true, data: await fn() };
    } catch (e: unknown) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
}));

vi.mock("../../../../repositories", () => ({
  reviewRepository: {
    create: mockReviewCreate,
    update: mockReviewUpdate,
    delete: mockReviewDelete,
    incrementHelpful: mockReviewIncrementHelpful,
  },
  productRepository: {
    findById: mockProductFindById,
  },
  userRepository: {
    findById: mockUserFindById,
  },
}));

vi.mock("../../../../providers/auth-firebase/helpers", () => ({
  requireRoleUser: mockRequireRoleUser,
}));

vi.mock("./service", () => ({
  assertNotDuplicateReview: mockAssertNotDuplicateReview,
  assertReviewOwnership: mockAssertReviewOwnership,
  getReviewOrThrow: mockGetReviewOrThrow,
}));

vi.mock("../../../../features/auth/role-predicates", () => ({
  isAdminUser: mockIsAdminUser,
}));

import {
  createReviewAction,
  replyToReviewAction,
  deleteReviewAction,
  markReviewHelpfulAction,
} from "../actions";

function makeBuyerUser(overrides: Record<string, unknown> = {}) {
  return { uid: "user-buyer-1", email: "buyer@test.com", name: "Buyer One", ...overrides };
}

function makeSellerUser(overrides: Record<string, unknown> = {}) {
  return { uid: "store-seller-1", email: "seller@test.com", name: "Seller One", ...overrides };
}

function makeReview(overrides: Record<string, unknown> = {}) {
  return {
    id: "review-charizard-ravi-20260629",
    productId: "product-charizard-psa9",
    userId: "user-buyer-1",
    rating: 5,
    status: "pending",
    ...overrides,
  };
}

function makeCreateInput(overrides: Record<string, unknown> = {}) {
  return {
    productId: "product-charizard-psa9",
    storeId: "store-pokemon-palace",
    rating: 5,
    title: "Amazing card!",
    body: "This Charizard PSA 9 is absolutely stunning. Great packaging.",
    images: [],
    ...overrides,
  };
}

describe("createReviewAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeBuyerUser());
    mockIsAdminUser.mockReturnValue(false);
    mockAssertNotDuplicateReview.mockResolvedValue(undefined);
    mockProductFindById.mockResolvedValue({ id: "product-charizard-psa9", title: "Charizard PSA 9", storeId: "store-pokemon-palace" });
    mockUserFindById.mockResolvedValue({ displayName: "Buyer One", photoURL: "" });
    mockReviewCreate.mockResolvedValue(makeReview());
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await createReviewAction(makeCreateInput());
    expect(result.ok).toBe(false);
  });

  it("missing productId → { ok: false }", async () => {
    const { productId: _p, ...input } = makeCreateInput();
    const result = await createReviewAction(input);
    expect(result.ok).toBe(false);
  });

  it("rating not in 1-5 (rating = 0) → { ok: false }", async () => {
    const result = await createReviewAction(makeCreateInput({ rating: 0 }));
    expect(result.ok).toBe(false);
  });

  it("rating > 5 → { ok: false }", async () => {
    const result = await createReviewAction(makeCreateInput({ rating: 6 }));
    expect(result.ok).toBe(false);
  });

  it("body < 10 chars → { ok: false }", async () => {
    const result = await createReviewAction(makeCreateInput({ body: "Short" }));
    expect(result.ok).toBe(false);
  });

  it("duplicate review (assertNotDuplicateReview throws) → { ok: false }", async () => {
    mockAssertNotDuplicateReview.mockRejectedValue(new Error("Already reviewed this product"));
    const result = await createReviewAction(makeCreateInput());
    expect(result.ok).toBe(false);
  });

  it("valid → reviewRepository.create called with status: pending", async () => {
    await createReviewAction(makeCreateInput());
    expect(mockReviewCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "product-charizard-psa9",
        userId: "user-buyer-1",
        status: "pending",
      }),
    );
  });

  it("success → { ok: true, data: review }", async () => {
    const review = makeReview();
    mockReviewCreate.mockResolvedValue(review);
    const result = await createReviewAction(makeCreateInput());
    expect(result.ok).toBe(true);
    expect((result as { data: unknown }).data).toEqual(review);
  });
});

describe("replyToReviewAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeSellerUser());
    mockGetReviewOrThrow.mockResolvedValue(makeReview());
    mockReviewUpdate.mockResolvedValue(makeReview({ sellerReply: "Thank you for your review!" }));
  });

  it("buyer role → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Insufficient role"));
    const result = await replyToReviewAction({ reviewId: "review-charizard-ravi-20260629", reply: "Thanks!" });
    expect(result.ok).toBe(false);
  });

  it("review not found (getReviewOrThrow throws) → { ok: false }", async () => {
    mockGetReviewOrThrow.mockRejectedValue(new Error("Review not found"));
    const result = await replyToReviewAction({ reviewId: "review-missing", reply: "Thanks!" });
    expect(result.ok).toBe(false);
  });

  it("missing reviewId → { ok: false }", async () => {
    const result = await replyToReviewAction({ reply: "Thanks!" });
    expect(result.ok).toBe(false);
  });

  it("valid → reviewRepository.update called with sellerReply", async () => {
    await replyToReviewAction({ reviewId: "review-charizard-ravi-20260629", reply: "Thank you for your review!" });
    expect(mockReviewUpdate).toHaveBeenCalledWith(
      "review-charizard-ravi-20260629",
      expect.objectContaining({ sellerReply: "Thank you for your review!" }),
    );
  });
});

describe("deleteReviewAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeBuyerUser());
    mockIsAdminUser.mockReturnValue(false);
    mockAssertReviewOwnership.mockResolvedValue(undefined);
    mockGetReviewOrThrow.mockResolvedValue(makeReview());
    mockReviewDelete.mockResolvedValue(undefined);
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await deleteReviewAction({ reviewId: "review-charizard-ravi-20260629" });
    expect(result.ok).toBe(false);
  });

  it("non-owner (assertReviewOwnership throws) → { ok: false }", async () => {
    mockAssertReviewOwnership.mockRejectedValue(new Error("Not your review"));
    const result = await deleteReviewAction({ reviewId: "review-charizard-ravi-20260629" });
    expect(result.ok).toBe(false);
  });

  it("admin bypass ownership check → uses getReviewOrThrow instead", async () => {
    mockIsAdminUser.mockReturnValue(true);
    mockRequireRoleUser.mockResolvedValue({ uid: "user-admin-1", email: "admin@test.com" });
    await deleteReviewAction({ reviewId: "review-charizard-ravi-20260629" });
    expect(mockAssertReviewOwnership).not.toHaveBeenCalled();
    expect(mockGetReviewOrThrow).toHaveBeenCalledWith("review-charizard-ravi-20260629");
  });

  it("valid → reviewRepository.delete called", async () => {
    await deleteReviewAction({ reviewId: "review-charizard-ravi-20260629" });
    expect(mockReviewDelete).toHaveBeenCalledWith("review-charizard-ravi-20260629");
  });
});

describe("markReviewHelpfulAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeBuyerUser());
    mockGetReviewOrThrow.mockResolvedValue(makeReview());
    mockReviewIncrementHelpful.mockResolvedValue(undefined);
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await markReviewHelpfulAction("review-charizard-ravi-20260629");
    expect(result.ok).toBe(false);
  });

  it("review not found → { ok: false }", async () => {
    mockGetReviewOrThrow.mockRejectedValue(new Error("Review not found"));
    const result = await markReviewHelpfulAction("review-missing");
    expect(result.ok).toBe(false);
  });

  it("valid → reviewRepository.incrementHelpful called", async () => {
    await markReviewHelpfulAction("review-charizard-ravi-20260629");
    expect(mockReviewIncrementHelpful).toHaveBeenCalledWith("review-charizard-ravi-20260629");
  });

  it("success → { ok: true }", async () => {
    const result = await markReviewHelpfulAction("review-charizard-ravi-20260629");
    expect(result.ok).toBe(true);
  });
});
