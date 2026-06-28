import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetWinningBid,
  mockMarkWinning,
  mockMarkOutbid,
  mockIncrementBidCount,
  mockBatchCommit,
  mockBatchUpdate,
  mockSendNotification,
  mockRtdbPush,
  mockDecryptPii,
} = vi.hoisted(() => ({
  mockGetWinningBid: vi.fn(),
  mockMarkWinning: vi.fn(),
  mockMarkOutbid: vi.fn(),
  mockIncrementBidCount: vi.fn(),
  mockBatchCommit: vi.fn().mockResolvedValue(undefined),
  mockBatchUpdate: vi.fn(),
  mockSendNotification: vi.fn().mockResolvedValue(undefined),
  mockRtdbPush: vi.fn().mockResolvedValue(undefined),
  mockDecryptPii: vi.fn((v: string) => v),
}));

vi.mock("../../../../../repositories", () => ({
  bidRepository: {
    getWinningBid: mockGetWinningBid,
    markWinning: mockMarkWinning,
    markOutbid: mockMarkOutbid,
  },
  productRepository: {
    incrementBidCountInBatch: mockIncrementBidCount,
  },
}));

vi.mock("../../../../../features/admin/actions/notification-actions", () => ({
  sendNotification: mockSendNotification,
}));

vi.mock("../../../../../providers/db-firebase", () => ({
  getAdminRealtimeDb: vi.fn(() => ({
    ref: vi.fn(() => ({ push: mockRtdbPush })),
  })),
}));

vi.mock("../../../../../security/index", () => ({
  decryptPii: mockDecryptPii,
}));

vi.mock("../../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

import { handleBidPlaced } from "../onBidPlaced";
import type { JobContext } from "../../runtime/types";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx() {
  const batch = {
    update: mockBatchUpdate,
    commit: mockBatchCommit,
    set: vi.fn(),
    delete: vi.fn(),
  };
  return {
    db: {
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({ id: "bid-ref-1" }),
      }),
      batch: vi.fn().mockReturnValue(batch),
    },
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

function makeInput(overrides = {}): Parameters<typeof handleBidPlaced>[0] {
  return {
    bidId: "bid-charizard-ravi-001",
    bid: {
      id: "bid-charizard-ravi-001",
      productId: "auction-charizard",
      productTitle: "Pokemon Charizard",
      userId: "user-ravi",
      userName: "Ravi Kumar",
      bidAmount: 25000,
      currency: "INR",
      ...overrides,
    },
  };
}

function makePrevWinning(userId = "user-ankit") {
  return {
    ref: { id: "bid-ref-prev" } as unknown as FirebaseFirestore.DocumentReference,
    data: { userId, bidAmount: 20000 },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockBatchCommit.mockResolvedValue(undefined);
  mockSendNotification.mockResolvedValue(undefined);
  mockRtdbPush.mockResolvedValue(undefined);
  mockDecryptPii.mockImplementation((v: string) => v);
  mockGetWinningBid.mockResolvedValue(null);
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("handleBidPlaced — marks new bid as winning", () => {
  it("calls bidRepository.markWinning with new bid ref", async () => {
    const ctx = makeCtx();
    await handleBidPlaced(makeInput(), ctx);
    expect(mockMarkWinning).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
  });

  it("calls productRepository.incrementBidCountInBatch with correct args", async () => {
    const ctx = makeCtx();
    await handleBidPlaced(makeInput(), ctx);
    expect(mockIncrementBidCount).toHaveBeenCalledWith(
      expect.any(Object),
      "auction-charizard",
      25000,
      "user-ravi",
    );
  });

  it("commits the batch", async () => {
    const ctx = makeCtx();
    await handleBidPlaced(makeInput(), ctx);
    expect(mockBatchCommit).toHaveBeenCalledOnce();
  });
});

describe("handleBidPlaced — first bid (no previous winner)", () => {
  it("does NOT call markOutbid when no previous winner", async () => {
    mockGetWinningBid.mockResolvedValue(null);
    const ctx = makeCtx();
    await handleBidPlaced(makeInput(), ctx);
    expect(mockMarkOutbid).not.toHaveBeenCalled();
  });

  it("does NOT send outbid notification when no previous winner", async () => {
    mockGetWinningBid.mockResolvedValue(null);
    const ctx = makeCtx();
    await handleBidPlaced(makeInput(), ctx);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("does NOT push to RTDB when no previous winner", async () => {
    mockGetWinningBid.mockResolvedValue(null);
    const ctx = makeCtx();
    await handleBidPlaced(makeInput(), ctx);
    expect(mockRtdbPush).not.toHaveBeenCalled();
  });
});

describe("handleBidPlaced — outbid notification", () => {
  it("marks previous winner as outbid when different user", async () => {
    mockGetWinningBid.mockResolvedValue(makePrevWinning("user-ankit"));
    const ctx = makeCtx();
    await handleBidPlaced(makeInput(), ctx);
    expect(mockMarkOutbid).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
  });

  it("sends bid_outbid notification to the outbid user", async () => {
    mockGetWinningBid.mockResolvedValue(makePrevWinning("user-ankit"));
    const ctx = makeCtx();
    await handleBidPlaced(makeInput(), ctx);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-ankit", type: "bid_outbid" }),
    );
  });

  it("pushes outbid event to RTDB for real-time notification", async () => {
    mockGetWinningBid.mockResolvedValue(makePrevWinning("user-ankit"));
    const ctx = makeCtx();
    await handleBidPlaced(makeInput(), ctx);
    expect(mockRtdbPush).toHaveBeenCalledWith(
      expect.objectContaining({ type: "bid_outbid" }),
    );
  });

  it("outbid notification message includes bid amount and product title", async () => {
    mockGetWinningBid.mockResolvedValue(makePrevWinning("user-ankit"));
    const ctx = makeCtx();
    await handleBidPlaced(makeInput({ productTitle: "Charizard 1st Ed", bidAmount: 30000 }), ctx);
    const notifCall = mockSendNotification.mock.calls[0][0];
    expect(notifCall.message).toMatch(/Charizard 1st Ed/);
  });

  it("does NOT outbid the same user who placed the new bid", async () => {
    // Same user re-bids (bidder is already the winner)
    mockGetWinningBid.mockResolvedValue(makePrevWinning("user-ravi")); // same as input.bid.userId
    const ctx = makeCtx();
    await handleBidPlaced(makeInput({ userId: "user-ravi" }), ctx);
    expect(mockMarkOutbid).not.toHaveBeenCalled();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});

describe("handleBidPlaced — RTDB failure is non-fatal", () => {
  it("RTDB push failure → logs but does NOT re-throw", async () => {
    mockGetWinningBid.mockResolvedValue(makePrevWinning("user-ankit"));
    mockRtdbPush.mockRejectedValue(new Error("RTDB unavailable"));

    const ctx = makeCtx();
    await expect(handleBidPlaced(makeInput(), ctx)).resolves.toBeUndefined();
    expect(ctx.logger.error).toHaveBeenCalledWith(
      expect.stringMatching(/Realtime DB/i),
      expect.any(Error),
    );
  });

  it("Firestore outbid notification still sent even if RTDB fails", async () => {
    mockGetWinningBid.mockResolvedValue(makePrevWinning("user-ankit"));
    mockRtdbPush.mockRejectedValue(new Error("RTDB unavailable"));

    const ctx = makeCtx();
    await handleBidPlaced(makeInput(), ctx);
    // sendNotification (Firestore) should still have been called before RTDB
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "bid_outbid" }),
    );
  });
});

describe("handleBidPlaced — PII decryption", () => {
  it("decrypts userName via decryptPii before use", async () => {
    mockDecryptPii.mockImplementation((v: string) => `decrypted:${v}`);
    const ctx = makeCtx();
    await handleBidPlaced(makeInput({ userName: "encrypted_name" }), ctx);
    expect(mockDecryptPii).toHaveBeenCalledWith("encrypted_name");
  });
});

describe("handleBidPlaced — error propagation", () => {
  it("Firestore batch.commit failure → re-throws", async () => {
    mockBatchCommit.mockRejectedValue(new Error("Firestore unavailable"));
    const ctx = makeCtx();
    await expect(handleBidPlaced(makeInput(), ctx)).rejects.toThrow("Firestore unavailable");
  });

  it("logs error with bidId and productId before re-throwing", async () => {
    mockBatchCommit.mockRejectedValue(new Error("Firestore unavailable"));
    const ctx = makeCtx();
    try {
      await handleBidPlaced(makeInput(), ctx);
    } catch {
      // expected
    }
    expect(ctx.logger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Error),
      expect.objectContaining({ bidId: "bid-charizard-ravi-001" }),
    );
  });
});
