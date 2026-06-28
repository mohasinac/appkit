import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetExpiredAuctions,
  mockGetActiveByProduct,
  mockUpdateStatusInBatch,
  mockMarkWon,
  mockMarkLost,
  mockCreateFromAuction,
  mockBatchUpdate,
  mockBatchCommit,
  mockSendNotification,
} = vi.hoisted(() => ({
  mockGetExpiredAuctions: vi.fn(),
  mockGetActiveByProduct: vi.fn(),
  mockUpdateStatusInBatch: vi.fn(),
  mockMarkWon: vi.fn(),
  mockMarkLost: vi.fn(),
  mockCreateFromAuction: vi.fn(),
  mockBatchUpdate: vi.fn(),
  mockBatchCommit: vi.fn().mockResolvedValue(undefined),
  mockSendNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../../../repositories", () => ({
  productRepository: {
    getExpiredAuctions: mockGetExpiredAuctions,
    updateStatusInBatch: mockUpdateStatusInBatch,
  },
  bidRepository: {
    getActiveByProduct: mockGetActiveByProduct,
    markWon: mockMarkWon,
    markLost: mockMarkLost,
  },
  orderRepository: {
    createFromAuction: mockCreateFromAuction,
  },
}));

vi.mock("../../../../../features/admin/actions/notification-actions", () => ({
  sendNotification: mockSendNotification,
}));

import { runAuctionSettlement } from "../auctionSettlement";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx(overrides = {}) {
  const mockDoc = vi.fn().mockReturnValue({ id: "products/auction-1" });
  const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc });
  const batch = {
    update: mockBatchUpdate,
    commit: mockBatchCommit,
    set: vi.fn(),
    delete: vi.fn(),
  };
  return {
    db: {
      collection: mockCollection,
      batch: vi.fn().mockReturnValue(batch),
    },
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ...overrides,
  } as unknown as Parameters<typeof runAuctionSettlement>[0];
}

function makeAuction(overrides = {}) {
  return {
    id: "auction-pokemon-charizard",
    title: "Pokemon Charizard",
    storeId: "store-A",
    listingType: "auction",
    availableQuantity: 1,
    ...overrides,
  };
}

function makeBid(overrides = {}) {
  return {
    ref: { id: "bid-ref-1" } as unknown as FirebaseFirestore.DocumentReference,
    data: {
      userId: "user-ravi",
      userName: "Ravi Kumar",
      userEmail: "ravi@example.com",
      bidAmount: 25000,
      currency: "INR",
      ...overrides,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockBatchCommit.mockResolvedValue(undefined);
  mockSendNotification.mockResolvedValue(undefined);
  mockCreateFromAuction.mockReturnValue({ id: "order-1" });
});

describe("runAuctionSettlement — no expired auctions", () => {
  it("returns early when no expired auctions exist", async () => {
    mockGetExpiredAuctions.mockResolvedValue([]);
    const ctx = makeCtx();
    await runAuctionSettlement(ctx);
    expect(mockGetActiveByProduct).not.toHaveBeenCalled();
  });

  it("logs 'No expired auctions found' when list is empty", async () => {
    mockGetExpiredAuctions.mockResolvedValue([]);
    const ctx = makeCtx();
    await runAuctionSettlement(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/No expired auctions/i),
    );
  });
});

describe("runAuctionSettlement — auction with no bids", () => {
  it("archives product when no active bids", async () => {
    const auction = makeAuction();
    mockGetExpiredAuctions.mockResolvedValue([{ data: auction }]);
    mockGetActiveByProduct.mockResolvedValue([]);

    const ctx = makeCtx();
    await runAuctionSettlement(ctx);

    expect(mockUpdateStatusInBatch).toHaveBeenCalledWith(
      expect.any(Object), // batch
      auction.id,
      "archived",
    );
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it("does NOT call createFromAuction when no bids", async () => {
    mockGetExpiredAuctions.mockResolvedValue([{ data: makeAuction() }]);
    mockGetActiveByProduct.mockResolvedValue([]);

    await runAuctionSettlement(makeCtx());
    expect(mockCreateFromAuction).not.toHaveBeenCalled();
  });

  it("does NOT send win/loss notifications when no bids", async () => {
    mockGetExpiredAuctions.mockResolvedValue([{ data: makeAuction() }]);
    mockGetActiveByProduct.mockResolvedValue([]);

    await runAuctionSettlement(makeCtx());
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});

describe("runAuctionSettlement — auction with bids", () => {
  it("marks the highest bid as won", async () => {
    const winner = makeBid({ bidAmount: 30000 });
    const loser = makeBid({ bidAmount: 20000, userId: "user-ankit" });
    mockGetExpiredAuctions.mockResolvedValue([{ data: makeAuction() }]);
    mockGetActiveByProduct.mockResolvedValue([winner, loser]);

    await runAuctionSettlement(makeCtx());
    expect(mockMarkWon).toHaveBeenCalledWith(expect.any(Object), winner.ref);
  });

  it("marks all other bids as lost", async () => {
    const winner = makeBid({ bidAmount: 30000 });
    const loser1 = makeBid({ userId: "user-ankit", bidAmount: 20000 });
    const loser2 = makeBid({ userId: "user-priya", bidAmount: 15000 });
    mockGetExpiredAuctions.mockResolvedValue([{ data: makeAuction() }]);
    mockGetActiveByProduct.mockResolvedValue([winner, loser1, loser2]);

    await runAuctionSettlement(makeCtx());
    expect(mockMarkLost).toHaveBeenCalledTimes(2);
    expect(mockMarkLost).toHaveBeenCalledWith(expect.any(Object), loser1.ref);
    expect(mockMarkLost).toHaveBeenCalledWith(expect.any(Object), loser2.ref);
  });

  it("creates an order from auction data (winner becomes buyer)", async () => {
    const winner = makeBid({ bidAmount: 25000, userId: "user-ravi" });
    const auction = makeAuction({ id: "auction-1", title: "Charizard", storeId: "store-B" });
    mockGetExpiredAuctions.mockResolvedValue([{ data: auction }]);
    mockGetActiveByProduct.mockResolvedValue([winner]);

    await runAuctionSettlement(makeCtx());
    expect(mockCreateFromAuction).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        productId: "auction-1",
        productTitle: "Charizard",
        userId: "user-ravi",
        storeId: "store-B",
        amount: 25000,
      }),
    );
  });

  it("sets isSold=true and availableQuantity=0 on product", async () => {
    const winner = makeBid();
    mockGetExpiredAuctions.mockResolvedValue([{ data: makeAuction() }]);
    mockGetActiveByProduct.mockResolvedValue([winner]);

    await runAuctionSettlement(makeCtx());
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.any(Object), // doc ref
      expect.objectContaining({ isSold: true, availableQuantity: 0 }),
    );
  });

  it("commits the batch before sending notifications", async () => {
    const winner = makeBid();
    mockGetExpiredAuctions.mockResolvedValue([{ data: makeAuction() }]);
    mockGetActiveByProduct.mockResolvedValue([winner]);

    const callOrder: string[] = [];
    mockBatchCommit.mockImplementation(async () => { callOrder.push("commit"); });
    mockSendNotification.mockImplementation(async () => { callOrder.push("notify"); });

    await runAuctionSettlement(makeCtx());
    const commitIdx = callOrder.indexOf("commit");
    const notifyIdx = callOrder.indexOf("notify");
    expect(commitIdx).toBeLessThan(notifyIdx);
  });

  it("sends bid_won notification to the winning bidder", async () => {
    const winner = makeBid({ userId: "user-ravi", bidAmount: 25000, currency: "INR" });
    mockGetExpiredAuctions.mockResolvedValue([{ data: makeAuction({ title: "Charizard" }) }]);
    mockGetActiveByProduct.mockResolvedValue([winner]);

    await runAuctionSettlement(makeCtx());
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-ravi", type: "bid_won" }),
    );
  });

  it("sends bid_lost notification to each losing bidder", async () => {
    const winner = makeBid({ userId: "user-ravi" });
    const loser1 = makeBid({ userId: "user-ankit" });
    const loser2 = makeBid({ userId: "user-priya" });
    mockGetExpiredAuctions.mockResolvedValue([{ data: makeAuction() }]);
    mockGetActiveByProduct.mockResolvedValue([winner, loser1, loser2]);

    await runAuctionSettlement(makeCtx());
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-ankit", type: "bid_lost" }),
    );
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-priya", type: "bid_lost" }),
    );
  });

  it("notification failure for one loser does NOT abort others (allSettled)", async () => {
    const winner = makeBid({ userId: "user-ravi" });
    const loser1 = makeBid({ userId: "user-ankit" });
    const loser2 = makeBid({ userId: "user-priya" });
    mockGetExpiredAuctions.mockResolvedValue([{ data: makeAuction() }]);
    mockGetActiveByProduct.mockResolvedValue([winner, loser1, loser2]);

    let callCount = 0;
    mockSendNotification.mockImplementation(async ({ type, userId }) => {
      callCount++;
      if (type === "bid_lost" && userId === "user-ankit") {
        throw new Error("Notification service down");
      }
    });

    // Should not throw
    await expect(runAuctionSettlement(makeCtx())).resolves.toBeUndefined();
    // loser2 still got notified
    expect(callCount).toBeGreaterThanOrEqual(2);
  });
});

describe("runAuctionSettlement — multiple expired auctions", () => {
  it("settles each auction independently", async () => {
    const auction1 = makeAuction({ id: "auction-1" });
    const auction2 = makeAuction({ id: "auction-2" });
    mockGetExpiredAuctions.mockResolvedValue([
      { data: auction1 },
      { data: auction2 },
    ]);
    mockGetActiveByProduct.mockResolvedValue([]);

    await runAuctionSettlement(makeCtx());
    expect(mockGetActiveByProduct).toHaveBeenCalledTimes(2);
    expect(mockGetActiveByProduct).toHaveBeenCalledWith("auction-1");
    expect(mockGetActiveByProduct).toHaveBeenCalledWith("auction-2");
  });

  it("one auction error does NOT abort others (allSettled)", async () => {
    const auction1 = makeAuction({ id: "auction-1" });
    const auction2 = makeAuction({ id: "auction-2" });
    mockGetExpiredAuctions.mockResolvedValue([
      { data: auction1 },
      { data: auction2 },
    ]);
    // auction-1 throws, auction-2 succeeds
    mockGetActiveByProduct
      .mockRejectedValueOnce(new Error("Firestore query failed"))
      .mockResolvedValueOnce([]);

    await expect(runAuctionSettlement(makeCtx())).resolves.toBeUndefined();
    // auction-2 was still processed (batch committed)
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it("logs the count of failed settlements when some fail", async () => {
    mockGetExpiredAuctions.mockResolvedValue([
      { data: makeAuction({ id: "auction-1" }) },
      { data: makeAuction({ id: "auction-2" }) },
    ]);
    mockGetActiveByProduct
      .mockRejectedValueOnce(new Error("DB error"))
      .mockResolvedValueOnce([]);

    const ctx = makeCtx();
    await runAuctionSettlement(ctx);
    expect(ctx.logger.error).toHaveBeenCalledWith(
      expect.stringMatching(/1 auction\(s\) failed/i),
      expect.any(Array),
    );
  });
});
