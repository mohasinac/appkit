import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRequireRoleUser,
  mockBidCreate,
  mockBidSetWinningBid,
  mockProductUpdate,
  mockUserFindById,
  mockAssertAuctionActive,
  mockAssertBidAmount,
  mockAssertNotAuctionOwner,
  mockShouldAutoExtend,
  mockComputeExtendedEndDate,
} = vi.hoisted(() => ({
  mockRequireRoleUser: vi.fn(),
  mockBidCreate: vi.fn(),
  mockBidSetWinningBid: vi.fn(),
  mockProductUpdate: vi.fn(),
  mockUserFindById: vi.fn(),
  mockAssertAuctionActive: vi.fn(),
  mockAssertBidAmount: vi.fn(),
  mockAssertNotAuctionOwner: vi.fn(),
  mockShouldAutoExtend: vi.fn(),
  mockComputeExtendedEndDate: vi.fn(),
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
  bidRepository: {
    create: mockBidCreate,
    setWinningBid: mockBidSetWinningBid,
  },
  productRepository: {
    update: mockProductUpdate,
  },
  userRepository: {
    findById: mockUserFindById,
  },
}));

vi.mock("../../../../providers/auth-firebase/helpers", () => ({
  requireRoleUser: mockRequireRoleUser,
}));

vi.mock("./service", () => ({
  assertAuctionActive: mockAssertAuctionActive,
  assertBidAmount: mockAssertBidAmount,
  assertNotAuctionOwner: mockAssertNotAuctionOwner,
  shouldAutoExtend: mockShouldAutoExtend,
  computeExtendedEndDate: mockComputeExtendedEndDate,
}));

import { placeBidAction } from "../actions";

function makeUser(overrides: Record<string, unknown> = {}) {
  return { uid: "user-buyer-1", email: "buyer@test.com", name: "Buyer One", ...overrides };
}

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: "auction-charizard-1",
    title: "Charizard PSA 9",
    storeId: "store-seller-1",
    listingType: "auction",
    currentBid: 100000,
    bidCount: 3,
    currency: "INR",
    auctionEndDate: new Date(Date.now() + 86400000),
    ...overrides,
  };
}

function makeInput(overrides: Record<string, unknown> = {}) {
  return { auctionId: "auction-charizard-1", amount: 150000, ...overrides };
}

function makeBid(overrides: Record<string, unknown> = {}) {
  return {
    id: "bid-charizard-buyer-20260629-abc123",
    productId: "auction-charizard-1",
    userId: "user-buyer-1",
    bidAmount: 150000,
    ...overrides,
  };
}

describe("placeBidAction — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockAssertAuctionActive.mockResolvedValue(makeProduct());
    mockAssertNotAuctionOwner.mockReturnValue(undefined);
    mockAssertBidAmount.mockReturnValue(undefined);
    mockUserFindById.mockResolvedValue({ displayName: "Buyer One" });
    mockBidSetWinningBid.mockResolvedValue(undefined);
    mockBidCreate.mockResolvedValue(makeBid());
    mockProductUpdate.mockResolvedValue(undefined);
    mockShouldAutoExtend.mockReturnValue(false);
    mockComputeExtendedEndDate.mockReturnValue(new Date(Date.now() + 172800000));
  });

  it("auctionId missing → { ok: false }", async () => {
    const result = await placeBidAction({ amount: 150000 });
    expect(result.ok).toBe(false);
  });

  it("amount missing → { ok: false }", async () => {
    const result = await placeBidAction({ auctionId: "auction-charizard-1" });
    expect(result.ok).toBe(false);
  });

  it("amount <= 0 → { ok: false }", async () => {
    const result = await placeBidAction({ auctionId: "auction-charizard-1", amount: 0 });
    expect(result.ok).toBe(false);
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await placeBidAction(makeInput());
    expect(result.ok).toBe(false);
  });

  it("auction not active (assertAuctionActive throws) → { ok: false }", async () => {
    mockAssertAuctionActive.mockRejectedValue(new Error("Auction has ended"));
    const result = await placeBidAction(makeInput());
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/ended/i);
  });

  it("bidder is auction owner (assertNotAuctionOwner throws) → { ok: false }", async () => {
    mockAssertNotAuctionOwner.mockImplementation(() => {
      throw new Error("You cannot bid on your own auction");
    });
    const result = await placeBidAction(makeInput());
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/own/i);
  });

  it("bid too low (assertBidAmount throws) → { ok: false }", async () => {
    mockAssertBidAmount.mockImplementation(() => {
      throw new Error("Bid must meet minimum increment");
    });
    const result = await placeBidAction(makeInput());
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/minimum/i);
  });
});

describe("placeBidAction — success path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockAssertAuctionActive.mockResolvedValue(makeProduct());
    mockAssertNotAuctionOwner.mockReturnValue(undefined);
    mockAssertBidAmount.mockReturnValue(undefined);
    mockUserFindById.mockResolvedValue({ displayName: "Buyer One" });
    mockBidSetWinningBid.mockResolvedValue(undefined);
    mockBidCreate.mockResolvedValue(makeBid());
    mockProductUpdate.mockResolvedValue(undefined);
    mockShouldAutoExtend.mockReturnValue(false);
    mockComputeExtendedEndDate.mockReturnValue(new Date(Date.now() + 172800000));
  });

  it("valid bid → bidRepository.create called with correct productId, bidderId, amount", async () => {
    await placeBidAction(makeInput());
    expect(mockBidCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "auction-charizard-1",
        userId: "user-buyer-1",
        bidAmount: 150000,
      }),
    );
  });

  it("valid bid → bidRepository.setWinningBid called twice (outbid then set winner)", async () => {
    const bid = makeBid();
    mockBidCreate.mockResolvedValue(bid);
    await placeBidAction(makeInput());
    expect(mockBidSetWinningBid).toHaveBeenCalledTimes(2);
    expect(mockBidSetWinningBid).toHaveBeenNthCalledWith(1, "__placeholder__", "auction-charizard-1");
    expect(mockBidSetWinningBid).toHaveBeenNthCalledWith(2, bid.id, "auction-charizard-1");
  });

  it("valid bid → productRepository.update called with currentBid and bidCount incremented", async () => {
    const product = makeProduct({ bidCount: 3 });
    mockAssertAuctionActive.mockResolvedValue(product);
    await placeBidAction(makeInput({ amount: 150000 }));
    expect(mockProductUpdate).toHaveBeenCalledWith(
      "auction-charizard-1",
      expect.objectContaining({ currentBid: 150000, bidCount: 4 }),
    );
  });

  it("bid outside auto-extend window → endDate unchanged in update", async () => {
    mockShouldAutoExtend.mockReturnValue(false);
    await placeBidAction(makeInput());
    const updateCall = mockProductUpdate.mock.calls[0][1];
    expect(updateCall).not.toHaveProperty("auctionEndDate");
  });

  it("bid within auto-extend window → product endDate extended", async () => {
    const extendedDate = new Date(Date.now() + 172800000);
    mockShouldAutoExtend.mockReturnValue(true);
    mockComputeExtendedEndDate.mockReturnValue(extendedDate);
    await placeBidAction(makeInput());
    expect(mockProductUpdate).toHaveBeenCalledWith(
      "auction-charizard-1",
      expect.objectContaining({ auctionEndDate: extendedDate }),
    );
  });

  it("success → returns { ok: true, data: bid }", async () => {
    const bid = makeBid();
    mockBidCreate.mockResolvedValue(bid);
    const result = await placeBidAction(makeInput());
    expect(result.ok).toBe(true);
    expect((result as { data: unknown }).data).toEqual(bid);
  });

  it("setWinningBid failure is non-fatal (fire-and-forget)", async () => {
    mockBidSetWinningBid.mockRejectedValueOnce(new Error("Firestore timeout"));
    const result = await placeBidAction(makeInput());
    expect(result.ok).toBe(true);
  });
});
