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

vi.mock("../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

import { ClaimedCouponsRepository } from "../claimed-coupons.repository";
import { createClaimedCouponId } from "../../schemas";

const repo = new ClaimedCouponsRepository();

function makeClaimInput(overrides: Record<string, unknown> = {}) {
  return {
    userId: "user-yugi",
    couponId: "coupon-welcome10",
    couponCode: "welcome10",
    source: "manual" as const,
    couponSnapshot: { label: "10% off", discountValue: 10, type: "percentage" },
    expiresAt: null,
    ...overrides,
  };
}

function makeClaimDoc(userId = "user-yugi", code = "WELCOME10") {
  return {
    id: createClaimedCouponId(userId, code),
    userId,
    couponId: "coupon-welcome10",
    couponCode: code,
    source: "manual",
    status: "active",
    expiresAt: null,
    claimedAt: new Date(),
    updatedAt: new Date(),
    couponSnapshot: {},
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.collection.mockReturnValue(mockCollection);
  mockCollection.doc.mockReturnValue(mockDocRef);
  mockCollection.where.mockReturnValue(mockQuery);
  mockQuery.where.mockReturnValue(mockQuery);
  mockQuery.get.mockResolvedValue(makeQuerySnap([]));
  mockDocRef.get.mockResolvedValue(makeSnap(null));
  mockDocRef.set.mockResolvedValue(undefined);
  mockDocRef.update.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// findByUserAndCode
// ---------------------------------------------------------------------------
describe("ClaimedCouponsRepository.findByUserAndCode", () => {
  it("existing claim → returns document", async () => {
    const doc = makeClaimDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(doc, doc.id));
    const result = await repo.findByUserAndCode("user-yugi", "WELCOME10");
    expect(result).not.toBeNull();
    expect(result!.couponCode).toBe("WELCOME10");
  });

  it("no claim → returns null", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const result = await repo.findByUserAndCode("user-yugi", "NOTFOUND");
    expect(result).toBeNull();
  });

  it("uses deterministic ID based on userId + couponCode", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    await repo.findByUserAndCode("user-yugi", "WELCOME10");
    const expectedId = createClaimedCouponId("user-yugi", "WELCOME10");
    expect(mockCollection.doc).toHaveBeenCalledWith(expectedId);
  });
});

// ---------------------------------------------------------------------------
// claim
// ---------------------------------------------------------------------------
describe("ClaimedCouponsRepository.claim", () => {
  it("first call → creates record with status: active", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const result = await repo.claim(makeClaimInput());
    expect(result.status).toBe("active");
    expect(mockDocRef.set).toHaveBeenCalledOnce();
  });

  it("second call for same user + code → returns existing record (idempotent)", async () => {
    const existingDoc = makeClaimDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(existingDoc, existingDoc.id));
    const result = await repo.claim(makeClaimInput());
    expect(mockDocRef.set).not.toHaveBeenCalled();
    expect(result.id).toBe(existingDoc.id);
  });

  it("couponCode normalized to uppercase on create", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const result = await repo.claim(makeClaimInput({ couponCode: "welcome10" }));
    expect(result.couponCode).toBe("WELCOME10");
  });

  it("expiresAt stored as provided (null case)", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const result = await repo.claim(makeClaimInput({ expiresAt: null }));
    expect(result.expiresAt).toBeNull();
  });

  it("expiresAt stored as provided (date case)", async () => {
    const exp = new Date(Date.now() + 86400_000);
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const result = await repo.claim(makeClaimInput({ expiresAt: exp }));
    expect(result.expiresAt).toEqual(exp);
  });

  it("uses createClaimedCouponId for the document ID", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    await repo.claim(makeClaimInput({ userId: "user-yugi", couponCode: "SAVE20" }));
    const expectedId = createClaimedCouponId("user-yugi", "SAVE20");
    expect(mockCollection.doc).toHaveBeenCalledWith(expectedId);
  });
});

// ---------------------------------------------------------------------------
// listForUser
// ---------------------------------------------------------------------------
describe("ClaimedCouponsRepository.listForUser", () => {
  it("queries by userId field", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.listForUser("user-yugi");
    expect(mockCollection.where).toHaveBeenCalledWith("userId", "==", "user-yugi");
  });

  it("valid coupon (not expired) → returned without mutation", async () => {
    const futureDate = new Date(Date.now() + 86400_000);
    const doc = { ...makeClaimDoc(), status: "active", expiresAt: futureDate };
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: doc.id, data: doc }]));
    const results = await repo.listForUser("user-yugi");
    expect(results[0].status).toBe("active");
    expect(mockDocRef.update).not.toHaveBeenCalled();
  });

  it("active coupon with no expiresAt → not lazily expired", async () => {
    const doc = { ...makeClaimDoc(), status: "active", expiresAt: null };
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: doc.id, data: doc }]));
    const results = await repo.listForUser("user-yugi");
    expect(results[0].status).toBe("active");
    expect(mockDocRef.update).not.toHaveBeenCalled();
  });

  it("expired coupon found on read → lazy-flips status to expired in returned item", async () => {
    const pastDate = new Date(Date.now() - 86400_000);
    const doc = { ...makeClaimDoc(), status: "active", expiresAt: pastDate };
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: doc.id, data: doc }]));
    const results = await repo.listForUser("user-yugi");
    expect(results[0].status).toBe("expired");
  });

  it("expired coupon → best-effort write-back update called (fire-and-forget)", async () => {
    const pastDate = new Date(Date.now() - 86400_000);
    const doc = { ...makeClaimDoc(), status: "active", expiresAt: pastDate };
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: doc.id, data: doc }]));
    await repo.listForUser("user-yugi");
    // Allow the fire-and-forget to complete
    await new Promise((r) => setTimeout(r, 10));
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "expired" }),
    );
  });

  it("already-expired coupon → no write-back (only active transitions)", async () => {
    const pastDate = new Date(Date.now() - 86400_000);
    const doc = { ...makeClaimDoc(), status: "expired", expiresAt: pastDate };
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: doc.id, data: doc }]));
    await repo.listForUser("user-yugi");
    await new Promise((r) => setTimeout(r, 10));
    expect(mockDocRef.update).not.toHaveBeenCalled();
  });

  it("empty list → returns []", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const results = await repo.listForUser("user-nobody");
    expect(results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// markUsed
// ---------------------------------------------------------------------------
describe("ClaimedCouponsRepository.markUsed", () => {
  it("sets status: used on the claim document", async () => {
    await repo.markUsed("user-yugi", "WELCOME10", "order-1-20260101-abc");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "used" }),
    );
  });

  it("stores usedOrderId on the claim", async () => {
    await repo.markUsed("user-yugi", "WELCOME10", "order-1-20260101-abc");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ usedOrderId: "order-1-20260101-abc" }),
    );
  });

  it("sets usedAt timestamp", async () => {
    await repo.markUsed("user-yugi", "WELCOME10", "order-x");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ usedAt: expect.any(Date) }),
    );
  });

  it("uses the correct document ID (userId + code)", async () => {
    await repo.markUsed("user-yugi", "WELCOME10", "order-x");
    const expectedId = createClaimedCouponId("user-yugi", "WELCOME10");
    expect(mockCollection.doc).toHaveBeenCalledWith(expectedId);
  });
});

// ---------------------------------------------------------------------------
// softRemove
// ---------------------------------------------------------------------------
describe("ClaimedCouponsRepository.softRemove", () => {
  it("sets status: expired (audit trail preserved, no delete)", async () => {
    await repo.softRemove("user-yugi", "WELCOME10");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "expired" }),
    );
    expect(mockDocRef.delete).not.toHaveBeenCalled();
  });

  it("does NOT call delete on the document", async () => {
    await repo.softRemove("user-yugi", "SAVE20");
    expect(mockDocRef.delete).not.toHaveBeenCalled();
  });

  it("uses the correct document ID (userId + code)", async () => {
    await repo.softRemove("user-yugi", "SAVE20");
    const expectedId = createClaimedCouponId("user-yugi", "SAVE20");
    expect(mockCollection.doc).toHaveBeenCalledWith(expectedId);
  });
});
