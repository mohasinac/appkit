import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap, makeQuerySnap } from "../../../../../tests/helpers/mock-firestore";

const { db, mockDocRef, mockCollection, mockQuery, mockBatch } = makeMockDb();

const { mockGetFirestoreCount } = vi.hoisted(() => ({
  mockGetFirestoreCount: vi.fn().mockResolvedValue(0),
}));

vi.mock("../../../../providers/db-firebase/admin", () => ({
  getAdminDb: () => db,
}));

vi.mock("../../../../providers/db-firebase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../providers/db-firebase")>();
  return {
    ...actual,
    prepareForFirestore: (d: Record<string, unknown>) => d,
    getFirestoreCount: mockGetFirestoreCount,
  };
});

vi.mock("../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

vi.mock("../../../../security", () => ({
  encryptPiiFields: (d: Record<string, unknown>) => d,
  decryptPiiFields: (d: Record<string, unknown>) => d,
  BID_PII_FIELDS: [],
}));

import { BidRepository } from "../bid.repository";

const repo = new BidRepository();

function makeBidDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "bid-1",
    productId: "auction-x",
    bidderId: "user-1",
    userId: "user-1",
    userName: "Ravi",
    userEmail: "ravi@test.com",
    bidAmount: 5000,
    status: "active",
    isWinning: false,
    bidDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeFakeRef(id = "bid-1") {
  return { id };
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
  db.batch.mockReturnValue(mockBatch);
  mockGetFirestoreCount.mockResolvedValue(0);
});

// ---------------------------------------------------------------------------
// markWon / markLost / markOutbid / markWinning (batch helpers)
// ---------------------------------------------------------------------------
describe("BidRepository.markWon", () => {
  it("stages status=won, isWinning=true in caller batch", () => {
    const ref = makeFakeRef();
    repo.markWon(mockBatch as never, ref as never);
    expect(mockBatch.update).toHaveBeenCalledWith(
      ref,
      expect.objectContaining({ status: "won", isWinning: true }),
    );
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });
});

describe("BidRepository.markLost", () => {
  it("stages status=lost, isWinning=false in caller batch", () => {
    const ref = makeFakeRef();
    repo.markLost(mockBatch as never, ref as never);
    expect(mockBatch.update).toHaveBeenCalledWith(
      ref,
      expect.objectContaining({ status: "lost", isWinning: false }),
    );
  });
});

describe("BidRepository.markOutbid", () => {
  it("stages status=outbid, isWinning=false in caller batch", () => {
    const ref = makeFakeRef();
    repo.markOutbid(mockBatch as never, ref as never);
    expect(mockBatch.update).toHaveBeenCalledWith(
      ref,
      expect.objectContaining({ status: "outbid", isWinning: false }),
    );
  });
});

describe("BidRepository.markWinning", () => {
  it("stages isWinning=true (does not change status) in caller batch", () => {
    const ref = makeFakeRef();
    repo.markWinning(mockBatch as never, ref as never);
    expect(mockBatch.update).toHaveBeenCalledWith(
      ref,
      expect.objectContaining({ isWinning: true }),
    );
  });
});

// ---------------------------------------------------------------------------
// getWinningBid
// ---------------------------------------------------------------------------
describe("BidRepository.getWinningBid", () => {
  it("returns {ref, data} for the winning active bid", async () => {
    const bid = makeBidDoc({ isWinning: true, status: "active" });
    const snap = makeSnap(bid, bid.id as string);
    mockQuery.get.mockResolvedValue({ ...makeQuerySnap([{ id: bid.id as string, data: bid }]), docs: [snap], empty: false });
    const result = await repo.getWinningBid("auction-x");
    expect(result).not.toBeNull();
    expect(result!.data).toBeDefined();
  });

  it("returns null when no winning bid", async () => {
    mockQuery.get.mockResolvedValue({ ...makeQuerySnap([]), empty: true, docs: [] });
    const result = await repo.getWinningBid("auction-x");
    expect(result).toBeNull();
  });

  it("queries by isWinning=true AND status=active", async () => {
    mockQuery.get.mockResolvedValue({ docs: [], empty: true });
    await repo.getWinningBid("auction-x");
    expect(mockQuery.where).toHaveBeenCalledWith("isWinning", "==", true);
    expect(mockQuery.where).toHaveBeenCalledWith("status", "==", "active");
  });
});

// ---------------------------------------------------------------------------
// findWinningBid
// ---------------------------------------------------------------------------
describe("BidRepository.findWinningBid", () => {
  it("returns BidDocument for winning bid", async () => {
    const bid = makeBidDoc({ isWinning: true });
    const snap = makeSnap(bid, bid.id as string);
    mockQuery.get.mockResolvedValue({ docs: [snap], empty: false });
    const result = await repo.findWinningBid("auction-x");
    expect(result).not.toBeNull();
  });

  it("returns null when no winning bid", async () => {
    mockQuery.get.mockResolvedValue({ docs: [], empty: true });
    const result = await repo.findWinningBid("auction-x");
    expect(result).toBeNull();
  });

  it("queries by isWinning=true (no status filter unlike getWinningBid)", async () => {
    mockQuery.get.mockResolvedValue({ docs: [], empty: true });
    await repo.findWinningBid("auction-x");
    expect(mockQuery.where).toHaveBeenCalledWith("isWinning", "==", true);
    // findWinningBid does NOT filter by status — that's the distinction from getWinningBid
    const statusFilterCalls = (mockQuery.where.mock.calls as [string, string, unknown][]).filter(
      (call) => call[0] === "status"
    );
    expect(statusFilterCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// findHighestBid
// ---------------------------------------------------------------------------
describe("BidRepository.findHighestBid", () => {
  it("returns highest bidAmount from active bids", async () => {
    const bid = makeBidDoc({ bidAmount: 8000, status: "active" });
    const snap = makeSnap(bid, bid.id as string);
    mockQuery.get.mockResolvedValue({ docs: [snap], empty: false });
    const result = await repo.findHighestBid("auction-x");
    expect(result).toBe(8000);
  });

  it("returns 0 when no bids exist", async () => {
    mockQuery.get.mockResolvedValue({ docs: [], empty: true });
    const result = await repo.findHighestBid("auction-x");
    expect(result).toBe(0);
  });

  it("queries by status=active, ordered by bidAmount desc", async () => {
    mockQuery.get.mockResolvedValue({ docs: [], empty: true });
    await repo.findHighestBid("auction-x");
    expect(mockQuery.where).toHaveBeenCalledWith("status", "==", "active");
    expect(mockQuery.orderBy).toHaveBeenCalledWith("bidAmount", "desc");
  });
});

// ---------------------------------------------------------------------------
// setWinningBid
// ---------------------------------------------------------------------------
describe("BidRepository.setWinningBid", () => {
  it("sets all other bids for product to outbid", async () => {
    const bid1 = makeBidDoc({ id: "bid-1", isWinning: false });
    const bid2 = makeBidDoc({ id: "bid-2", isWinning: false });
    const snap1 = makeSnap(bid1, "bid-1");
    const snap2 = makeSnap(bid2, "bid-2");
    mockQuery.get.mockResolvedValue({ docs: [snap1, snap2], empty: false });
    await repo.setWinningBid("bid-1", "auction-x");
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "outbid" }),
    );
  });

  it("sets the winning bid to status=active, isWinning=true", async () => {
    const bid = makeBidDoc({ id: "bid-winner" });
    const snap = makeSnap(bid, "bid-winner");
    mockQuery.get.mockResolvedValue({ docs: [snap], empty: false });
    await repo.setWinningBid("bid-winner", "auction-x");
    // The winning bid ref is updated separately with isWinning=true
    const updateCalls = mockBatch.update.mock.calls as [unknown, Record<string, unknown>][];
    const winningCall = updateCalls.find((c) => c[1].isWinning === true);
    expect(winningCall).toBeDefined();
    expect(winningCall![1].status).toBe("active");
  });

  it("commits the batch", async () => {
    mockQuery.get.mockResolvedValue({ docs: [], empty: true });
    await repo.setWinningBid("bid-1", "auction-x");
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// endAuction
// ---------------------------------------------------------------------------
describe("BidRepository.endAuction", () => {
  it("isWinning bid → status=won", async () => {
    const winBid = makeBidDoc({ id: "bid-win", isWinning: true });
    const snap = makeSnap(winBid, "bid-win");
    mockQuery.get.mockResolvedValue({ docs: [snap], empty: false });
    await repo.endAuction("auction-x");
    expect(mockBatch.update).toHaveBeenCalledWith(
      snap.ref,
      expect.objectContaining({ status: "won" }),
    );
  });

  it("non-winning bids → status=lost", async () => {
    const loseBid = makeBidDoc({ id: "bid-lose", isWinning: false });
    const snap = makeSnap(loseBid, "bid-lose");
    mockQuery.get.mockResolvedValue({ docs: [snap], empty: false });
    await repo.endAuction("auction-x");
    expect(mockBatch.update).toHaveBeenCalledWith(
      snap.ref,
      expect.objectContaining({ status: "lost" }),
    );
  });

  it("commits the batch", async () => {
    mockQuery.get.mockResolvedValue({ docs: [], empty: true });
    await repo.endAuction("auction-x");
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// cancelProductBids
// ---------------------------------------------------------------------------
describe("BidRepository.cancelProductBids", () => {
  it("sets all bids to status=cancelled", async () => {
    const bid = makeBidDoc({ id: "bid-1" });
    const snap = makeSnap(bid, "bid-1");
    mockQuery.get.mockResolvedValue({ docs: [snap], empty: false });
    await repo.cancelProductBids("auction-x");
    expect(mockBatch.update).toHaveBeenCalledWith(
      snap.ref,
      expect.objectContaining({ status: "cancelled", isWinning: false }),
    );
  });

  it("commits the batch", async () => {
    mockQuery.get.mockResolvedValue({ docs: [], empty: true });
    await repo.cancelProductBids("auction-x");
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// countByProduct / countByUser
// ---------------------------------------------------------------------------
describe("BidRepository.countByProduct", () => {
  it("returns count from getFirestoreCount", async () => {
    mockGetFirestoreCount.mockResolvedValue(7);
    const count = await repo.countByProduct("auction-x");
    expect(count).toBe(7);
  });

  it("queries by productId", async () => {
    await repo.countByProduct("auction-x");
    expect(mockCollection.where).toHaveBeenCalledWith("productId", "==", "auction-x");
  });
});

describe("BidRepository.countByUser", () => {
  it("returns count from getFirestoreCount", async () => {
    mockGetFirestoreCount.mockResolvedValue(3);
    const count = await repo.countByUser("user-1");
    expect(count).toBe(3);
  });

  it("queries by userId", async () => {
    await repo.countByUser("user-1");
    expect(mockCollection.where).toHaveBeenCalledWith("userId", "==", "user-1");
  });
});

// ---------------------------------------------------------------------------
// findOneByProductAndUser
// ---------------------------------------------------------------------------
describe("BidRepository.findOneByProductAndUser", () => {
  it("returns matching bid", async () => {
    const bid = makeBidDoc({ productId: "auction-x", userId: "user-1", status: "active" });
    const snap = makeSnap(bid, bid.id as string);
    mockQuery.get.mockResolvedValue({ docs: [snap], empty: false });
    const result = await repo.findOneByProductAndUser("auction-x", "user-1");
    expect(result).not.toBeNull();
  });

  it("returns null when not found", async () => {
    mockQuery.get.mockResolvedValue({ docs: [], empty: true });
    const result = await repo.findOneByProductAndUser("auction-x", "user-2");
    expect(result).toBeNull();
  });

  it("defaults status to 'active'", async () => {
    mockQuery.get.mockResolvedValue({ docs: [], empty: true });
    await repo.findOneByProductAndUser("auction-x", "user-1");
    expect(mockQuery.where).toHaveBeenCalledWith("status", "==", "active");
  });

  it("queries by all three conditions: productId, userId, status", async () => {
    mockQuery.get.mockResolvedValue({ docs: [], empty: true });
    await repo.findOneByProductAndUser("auction-x", "user-1", "outbid");
    expect(mockQuery.where).toHaveBeenCalledWith("productId", "==", "auction-x");
    expect(mockQuery.where).toHaveBeenCalledWith("userId", "==", "user-1");
    expect(mockQuery.where).toHaveBeenCalledWith("status", "==", "outbid");
  });
});
