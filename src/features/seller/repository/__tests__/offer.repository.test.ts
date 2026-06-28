import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap, makeQuerySnap } from "../../../../../tests/helpers/mock-firestore";

const { db, mockDocRef, mockCollection, mockQuery, mockBatch } = makeMockDb();

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
  OFFER_PII_FIELDS: ["buyerName", "buyerEmail"],
}));

vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

import { OfferRepository } from "../offer.repository";

const repo = new OfferRepository();

function makeOfferDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "offer-product-charizard-user-ravi-20260627-abc123",
    productId: "product-charizard-psa9",
    storeId: "store-pokemon-palace",
    buyerUid: "user-ravi",
    buyerName: "Ravi Kumar",
    buyerEmail: "ravi@test.com",
    offerAmount: 450_00, // paise
    status: "pending" as const,
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.collection.mockReturnValue(mockCollection);
  mockCollection.doc.mockReturnValue(mockDocRef);
  mockCollection.where.mockReturnValue(mockQuery);
  mockQuery.where.mockReturnValue(mockQuery);
  mockQuery.orderBy.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);
  mockQuery.select = vi.fn().mockReturnValue(mockQuery);
  mockQuery.get.mockResolvedValue(makeQuerySnap([]));
  const offerDoc = makeOfferDoc();
  mockDocRef.get.mockResolvedValue(makeSnap(offerDoc, offerDoc.id as string));
  mockDocRef.set.mockResolvedValue(undefined);
  mockDocRef.update.mockResolvedValue(undefined);
  db.batch.mockReturnValue(mockBatch);
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------
describe("OfferRepository.create", () => {
  it("sets status: pending on creation", async () => {
    await repo.create({
      productId: "product-charizard-psa9",
      storeId: "store-pokemon-palace",
      buyerUid: "user-ravi",
      buyerName: "Ravi Kumar",
      buyerEmail: "ravi@test.com",
      offerAmount: 450_00,
    } as never);
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.status).toBe("pending");
  });

  it("sets expiresAt to approximately 48 hours from now", async () => {
    const before = Date.now();
    await repo.create({
      productId: "product-1",
      storeId: "store-1",
      buyerUid: "user-1",
      buyerName: "Buyer",
      buyerEmail: "b@test.com",
      offerAmount: 100_00,
    } as never);
    const after = Date.now();
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    const expiresAt = (setArg.expiresAt as Date).getTime();
    const expectedMs = 48 * 60 * 60 * 1000;
    expect(expiresAt).toBeGreaterThanOrEqual(before + expectedMs - 100);
    expect(expiresAt).toBeLessThanOrEqual(after + expectedMs + 100);
  });

  it("persists to Firestore via doc.set", async () => {
    await repo.create({
      productId: "p-1",
      storeId: "s-1",
      buyerUid: "u-1",
      buyerName: "Buyer",
      buyerEmail: "b@test.com",
      offerAmount: 200_00,
    } as never);
    expect(mockDocRef.set).toHaveBeenCalledOnce();
  });

  it("returns plaintext document (not encrypted) to caller", async () => {
    const result = await repo.create({
      productId: "p-1",
      storeId: "s-1",
      buyerUid: "u-1",
      buyerName: "Ravi Kumar",
      buyerEmail: "ravi@test.com",
      offerAmount: 100_00,
    } as never);
    // Passthrough mock means plaintext === encrypted; verify field is accessible
    expect(result.buyerName).toBe("Ravi Kumar");
  });

  it("sets createdAt and updatedAt timestamps", async () => {
    const result = await repo.create({
      productId: "p-1",
      storeId: "s-1",
      buyerUid: "u-1",
      buyerName: "Buyer",
      buyerEmail: "b@test.com",
      offerAmount: 50_00,
    } as never);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// hasActiveOffer
// ---------------------------------------------------------------------------
describe("OfferRepository.hasActiveOffer", () => {
  it("returns true when a pending offer exists for buyer + product", async () => {
    const offer = makeOfferDoc({ status: "pending" });
    mockQuery.get.mockResolvedValue({
      empty: false,
      size: 1,
      docs: [makeSnap(offer, offer.id as string)],
    });
    const result = await repo.hasActiveOffer("user-ravi", "product-charizard-psa9");
    expect(result).toBe(true);
  });

  it("returns true when a countered offer exists for buyer + product", async () => {
    const offer = makeOfferDoc({ status: "countered" });
    mockQuery.get.mockResolvedValue({
      empty: false,
      size: 1,
      docs: [makeSnap(offer, offer.id as string)],
    });
    const result = await repo.hasActiveOffer("user-ravi", "product-charizard-psa9");
    expect(result).toBe(true);
  });

  it("returns false when only expired/declined offers exist", async () => {
    mockQuery.get.mockResolvedValue({ empty: true, size: 0, docs: [] });
    const result = await repo.hasActiveOffer("user-ravi", "product-1");
    expect(result).toBe(false);
  });

  it("returns false when no offers exist at all", async () => {
    mockQuery.get.mockResolvedValue({ empty: true, size: 0, docs: [] });
    const result = await repo.hasActiveOffer("user-nobody", "product-1");
    expect(result).toBe(false);
  });

  it("queries by buyerUid, productId, and status in [pending, countered]", async () => {
    mockQuery.get.mockResolvedValue({ empty: true, size: 0, docs: [] });
    await repo.hasActiveOffer("user-xyz", "product-abc");
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("buyerUid"),
      "==",
      "user-xyz",
    );
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("productId"),
      "==",
      "product-abc",
    );
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("status"),
      "in",
      ["pending", "countered"],
    );
  });

  it("uses select() stub read for minimal Firestore cost", async () => {
    mockQuery.get.mockResolvedValue({ empty: false, size: 1, docs: [] });
    await repo.hasActiveOffer("user-ravi", "product-1");
    expect(mockQuery.select).toHaveBeenCalled();
  });

  it("uses limit(1) to avoid scanning all offers", async () => {
    mockQuery.get.mockResolvedValue({ empty: true, size: 0, docs: [] });
    await repo.hasActiveOffer("user-ravi", "product-1");
    expect(mockQuery.limit).toHaveBeenCalledWith(1);
  });
});

// ---------------------------------------------------------------------------
// countByBuyerAndProduct
// ---------------------------------------------------------------------------
describe("OfferRepository.countByBuyerAndProduct", () => {
  it("returns 0 when no offers match", async () => {
    mockQuery.get.mockResolvedValue({ empty: true, size: 0, docs: [] });
    const count = await repo.countByBuyerAndProduct(
      "user-ravi",
      "product-1",
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    );
    expect(count).toBe(0);
  });

  it("returns correct count when offers exist", async () => {
    mockQuery.get.mockResolvedValue({ empty: false, size: 3, docs: [] });
    const count = await repo.countByBuyerAndProduct("user-ravi", "product-1", new Date());
    expect(count).toBe(3);
  });

  it("queries by buyerUid, productId, and createdAt >= since", async () => {
    mockQuery.get.mockResolvedValue({ empty: false, size: 2, docs: [] });
    const since = new Date(Date.now() - 86400_000);
    await repo.countByBuyerAndProduct("user-abc", "product-xyz", since);
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("buyerUid"),
      "==",
      "user-abc",
    );
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("productId"),
      "==",
      "product-xyz",
    );
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("createdAt"),
      ">=",
      since,
    );
  });

  it("uses select() stub read for minimal Firestore cost", async () => {
    mockQuery.get.mockResolvedValue({ empty: true, size: 0, docs: [] });
    await repo.countByBuyerAndProduct("user-1", "product-1", new Date());
    expect(mockQuery.select).toHaveBeenCalled();
  });

  it("returns snap.size (not docs.length)", async () => {
    // size may differ from docs.length in real Firestore (SELECT stub reads)
    mockQuery.get.mockResolvedValue({ empty: false, size: 5, docs: [] });
    const count = await repo.countByBuyerAndProduct("user-1", "product-1", new Date());
    expect(count).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// findExpiredActive
// ---------------------------------------------------------------------------
describe("OfferRepository.findExpiredActive", () => {
  it("returns offers with status in [pending, countered] and expiresAt <= now", async () => {
    const now = new Date();
    const expiredOffer = makeOfferDoc({
      status: "pending",
      expiresAt: new Date(now.getTime() - 3600_000),
    });
    mockQuery.get.mockResolvedValue(
      makeQuerySnap([{ id: expiredOffer.id as string, data: expiredOffer }]),
    );
    const results = await repo.findExpiredActive(now);
    expect(results).toHaveLength(1);
  });

  it("queries status in [pending, countered]", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findExpiredActive(new Date());
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("status"),
      "in",
      ["pending", "countered"],
    );
  });

  it("queries expiresAt <= now", async () => {
    const now = new Date();
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findExpiredActive(now);
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("expiresAt"),
      "<=",
      now,
    );
  });

  it("applies limit(500) to avoid unbounded scans", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findExpiredActive(new Date());
    expect(mockQuery.limit).toHaveBeenCalledWith(500);
  });

  it("returns empty array when no expired active offers", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const results = await repo.findExpiredActive(new Date());
    expect(results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// expireMany
// ---------------------------------------------------------------------------
describe("OfferRepository.expireMany", () => {
  it("batch-updates each offer ID to status: expired", async () => {
    await repo.expireMany(["offer-1", "offer-2", "offer-3"]);
    expect(mockBatch.update).toHaveBeenCalledTimes(3);
    const calls = mockBatch.update.mock.calls as [unknown, Record<string, unknown>][];
    expect(calls.every((c) => c[1].status === "expired")).toBe(true);
  });

  it("sets updatedAt on every expired offer", async () => {
    await repo.expireMany(["offer-1", "offer-2"]);
    const calls = mockBatch.update.mock.calls as [unknown, Record<string, unknown>][];
    expect(calls.every((c) => c[1].updatedAt instanceof Date)).toBe(true);
  });

  it("commits the batch exactly once", async () => {
    await repo.expireMany(["offer-a", "offer-b"]);
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("empty ID list → batch.commit called, no updates staged", async () => {
    await repo.expireMany([]);
    expect(mockBatch.update).not.toHaveBeenCalled();
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("single offer → one batch.update call", async () => {
    await repo.expireMany(["offer-only"]);
    expect(mockBatch.update).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// accept
// ---------------------------------------------------------------------------
describe("OfferRepository.accept", () => {
  it("sets status: accepted", async () => {
    await repo.accept("offer-1", 400_00);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "accepted" }),
    );
  });

  it("stores lockedPrice on accept", async () => {
    await repo.accept("offer-1", 400_00);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ lockedPrice: 400_00 }),
    );
  });

  it("sets acceptedAt timestamp", async () => {
    await repo.accept("offer-1", 400_00);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ acceptedAt: expect.any(Date) }),
    );
  });

  it("sets respondedAt timestamp", async () => {
    await repo.accept("offer-1", 400_00);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ respondedAt: expect.any(Date) }),
    );
  });

  it("stores sellerNote when provided", async () => {
    await repo.accept("offer-1", 400_00, "Deal accepted!");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ sellerNote: "Deal accepted!" }),
    );
  });

  it("sets updatedAt timestamp", async () => {
    await repo.accept("offer-1", 400_00);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ updatedAt: expect.any(Date) }),
    );
  });
});

// ---------------------------------------------------------------------------
// decline
// ---------------------------------------------------------------------------
describe("OfferRepository.decline", () => {
  it("sets status: declined", async () => {
    await repo.decline("offer-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "declined" }),
    );
  });

  it("sets respondedAt timestamp", async () => {
    await repo.decline("offer-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ respondedAt: expect.any(Date) }),
    );
  });

  it("stores sellerNote when provided", async () => {
    await repo.decline("offer-1", "Not interested");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ sellerNote: "Not interested" }),
    );
  });

  it("does NOT set lockedPrice on decline", async () => {
    await repo.decline("offer-1");
    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(updateArg)).not.toContain("lockedPrice");
  });
});

// ---------------------------------------------------------------------------
// counter
// ---------------------------------------------------------------------------
describe("OfferRepository.counter", () => {
  it("sets status: countered", async () => {
    await repo.counter("offer-1", 380_00);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "countered" }),
    );
  });

  it("stores counterAmount", async () => {
    await repo.counter("offer-1", 380_00);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ counterAmount: 380_00 }),
    );
  });

  it("sets respondedAt timestamp", async () => {
    await repo.counter("offer-1", 380_00);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ respondedAt: expect.any(Date) }),
    );
  });

  it("stores sellerNote when provided", async () => {
    await repo.counter("offer-1", 380_00, "Best I can do");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ sellerNote: "Best I can do" }),
    );
  });
});

// ---------------------------------------------------------------------------
// acceptCounter
// ---------------------------------------------------------------------------
describe("OfferRepository.acceptCounter", () => {
  it("sets lockedPrice = counterAmount from existing offer", async () => {
    const offerDoc = makeOfferDoc({ status: "countered", counterAmount: 380_00 });
    mockDocRef.get.mockResolvedValue(makeSnap(offerDoc, "offer-1"));
    await repo.acceptCounter("offer-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ lockedPrice: 380_00 }),
    );
  });

  it("sets status: accepted", async () => {
    const offerDoc = makeOfferDoc({ status: "countered", counterAmount: 380_00 });
    mockDocRef.get.mockResolvedValue(makeSnap(offerDoc, "offer-1"));
    await repo.acceptCounter("offer-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "accepted" }),
    );
  });

  it("sets acceptedAt and respondedAt", async () => {
    const offerDoc = makeOfferDoc({ status: "countered", counterAmount: 380_00 });
    mockDocRef.get.mockResolvedValue(makeSnap(offerDoc, "offer-1"));
    await repo.acceptCounter("offer-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        acceptedAt: expect.any(Date),
        respondedAt: expect.any(Date),
      }),
    );
  });

  it("throws when offer not found", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    await expect(repo.acceptCounter("offer-ghost")).rejects.toThrow(
      /offer.*not found|counter.*not found/i,
    );
  });

  it("throws when offer has no counterAmount", async () => {
    const offerDoc = makeOfferDoc({ status: "pending", counterAmount: undefined });
    mockDocRef.get.mockResolvedValue(makeSnap(offerDoc, "offer-1"));
    await expect(repo.acceptCounter("offer-1")).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// withdraw
// ---------------------------------------------------------------------------
describe("OfferRepository.withdraw", () => {
  it("sets status: withdrawn", async () => {
    await repo.withdraw("offer-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "withdrawn" }),
    );
  });

  it("sets respondedAt timestamp", async () => {
    await repo.withdraw("offer-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ respondedAt: expect.any(Date) }),
    );
  });

  it("sets updatedAt timestamp", async () => {
    await repo.withdraw("offer-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ updatedAt: expect.any(Date) }),
    );
  });

  it("does NOT set lockedPrice on withdraw", async () => {
    await repo.withdraw("offer-1");
    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(updateArg)).not.toContain("lockedPrice");
  });
});

// ---------------------------------------------------------------------------
// findPendingByStore
// ---------------------------------------------------------------------------
describe("OfferRepository.findPendingByStore", () => {
  it("returns only pending offers for the given storeId", async () => {
    const offer = makeOfferDoc({ status: "pending", storeId: "store-pokemon-palace" });
    mockQuery.get.mockResolvedValue(
      makeQuerySnap([{ id: offer.id as string, data: offer }]),
    );
    const results = await repo.findPendingByStore("store-pokemon-palace");
    expect(results).toHaveLength(1);
  });

  it("queries by storeId and status == pending", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findPendingByStore("store-xyz");
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("storeId"),
      "==",
      "store-xyz",
    );
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("status"),
      "==",
      "pending",
    );
  });

  it("orders by createdAt ascending (oldest first for seller to act on)", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findPendingByStore("store-1");
    expect(mockQuery.orderBy).toHaveBeenCalledWith(
      expect.stringContaining("createdAt"),
      "asc",
    );
  });

  it("returns empty array when no pending offers", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const results = await repo.findPendingByStore("store-empty");
    expect(results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// findExpired
// ---------------------------------------------------------------------------
describe("OfferRepository.findExpired", () => {
  it("returns offers with status in [pending, countered] and expiresAt <= now", async () => {
    const expired = makeOfferDoc({
      status: "pending",
      expiresAt: new Date(Date.now() - 1000),
    });
    mockQuery.get.mockResolvedValue(
      makeQuerySnap([{ id: expired.id as string, data: expired }]),
    );
    const results = await repo.findExpired();
    expect(results).toHaveLength(1);
  });

  it("queries status in [pending, countered]", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findExpired();
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("status"),
      "in",
      ["pending", "countered"],
    );
  });

  it("queries expiresAt <= current time", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findExpired();
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("expiresAt"),
      "<=",
      expect.any(Date),
    );
  });
});
