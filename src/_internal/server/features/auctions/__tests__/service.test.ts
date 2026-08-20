import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../../repositories", () => ({
  productRepository: {
    findByIdOrSlug: vi.fn(),
  },
  bidRepository: {
    findHighestBid: vi.fn(),
  },
}));

import {
  computeMinBid,
  assertBidAmount,
  assertNotAuctionOwner,
  shouldAutoExtend,
  computeExtendedEndDate,
} from "../service";
import { productRepository } from "../../../../../repositories";
import {
  BidTooLowError,
  BidOnOwnAuctionError,
} from "../../../../shared/features/auctions/errors";
import {
  AUCTION_MIN_BID_INCREMENT,
  AUCTION_SNIPING_WINDOW_SECONDS,
  AUCTION_DEFAULT_EXTENSION_MINUTES,
} from "../../../../shared/features/auctions/config";
import type { ProductDocument } from "../../../../shared/features/products/types";

function makeAuction(overrides: Record<string, unknown> = {}): ProductDocument {
  const future = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  return {
    id: "auction-test",
    storeId: "store-owner",
    listingType: "auction",
    status: "published",
    auctionEndDate: future,
    autoExtendable: true,
    auctionExtensionMinutes: AUCTION_DEFAULT_EXTENSION_MINUTES,
    ...overrides,
  } as unknown as ProductDocument;
}

beforeEach(() => {
  vi.clearAllMocks();
});

const NO_TIERS: import("../../../../shared/features/auctions/config").BidIncrementTier[] = [];
const TEST_TIERS: import("../../../../shared/features/auctions/config").BidIncrementTier[] = [
  { upTo: 100, increment: 10 },
  { upTo: 1000, increment: 100 },
  { upTo: 5000, increment: 200 },
  { upTo: 10000, increment: 500 },
  { upTo: null, increment: 1000 },
];

describe("computeMinBid", () => {
  it("no current bid → returns startingBid + default increment (empty tiers falls back)", () => {
    const product = makeAuction({ startingBid: 10000, currentBid: undefined });
    expect(computeMinBid(product, NO_TIERS)).toBe(10000 + AUCTION_MIN_BID_INCREMENT);
  });

  it("currentBid set → returns currentBid + default increment (empty tiers falls back)", () => {
    const product = makeAuction({ currentBid: 50000 });
    expect(computeMinBid(product, NO_TIERS)).toBe(50000 + AUCTION_MIN_BID_INCREMENT);
  });

  it("uses the product's configured minBidIncrement when it exceeds the tier (floor-raising override)", () => {
    const product = makeAuction({ currentBid: 10000, minBidIncrement: 5000 });
    expect(computeMinBid(product, TEST_TIERS)).toBe(15000);
  });

  it("ignores the product's configured minBidIncrement when it's below the tier floor", () => {
    const product = makeAuction({ currentBid: 10000, minBidIncrement: 1 });
    expect(computeMinBid(product, TEST_TIERS)).toBe(10000 + 500);
  });

  it("no currentBid and no startingBid → 0 + increment (empty tiers falls back)", () => {
    const product = makeAuction({ currentBid: undefined, startingBid: undefined });
    expect(computeMinBid(product, NO_TIERS)).toBe(AUCTION_MIN_BID_INCREMENT);
  });

  it("current bid at an exact tier boundary resolves to the lower tier (inclusive upper bound)", () => {
    const product = makeAuction({ currentBid: 1000, minBidIncrement: undefined });
    expect(computeMinBid(product, TEST_TIERS)).toBe(1000 + 100);
  });
});

describe("assertBidAmount", () => {
  it("bidAmount >= computeMinBid → no throw", () => {
    const product = makeAuction({ currentBid: 10000 });
    const min = computeMinBid(product, NO_TIERS);
    expect(() => assertBidAmount(product, min, NO_TIERS)).not.toThrow();
    expect(() => assertBidAmount(product, min + 100, NO_TIERS)).not.toThrow();
  });

  it("bidAmount < computeMinBid → throws BidTooLowError", () => {
    const product = makeAuction({ currentBid: 10000 });
    const min = computeMinBid(product, NO_TIERS);
    expect(() => assertBidAmount(product, min - 1, NO_TIERS)).toThrow(BidTooLowError);
  });

  it("BidTooLowError contains the expected minimum", () => {
    const product = makeAuction({ currentBid: 10000 });
    const min = computeMinBid(product, NO_TIERS);
    let caught: BidTooLowError | undefined;
    try { assertBidAmount(product, 0, NO_TIERS); } catch (e) { caught = e as BidTooLowError; }
    expect(caught).toBeInstanceOf(BidTooLowError);
    expect(caught?.message).toContain(String(min));
  });
});

describe("assertNotAuctionOwner", () => {
  it("bidderId !== storeId (owner) → no throw", () => {
    const product = makeAuction({ storeId: "store-owner" });
    expect(() => assertNotAuctionOwner(product, "different-user")).not.toThrow();
  });

  it("bidderId === storeId → throws BidOnOwnAuctionError", () => {
    const product = makeAuction({ storeId: "store-owner" });
    expect(() => assertNotAuctionOwner(product, "store-owner")).toThrow(BidOnOwnAuctionError);
  });
});

describe("shouldAutoExtend", () => {
  it("bid placed within sniping window → returns true", () => {
    const nearlyEnd = new Date(Date.now() + (AUCTION_SNIPING_WINDOW_SECONDS - 30) * 1000);
    const product = makeAuction({ auctionEndDate: nearlyEnd, autoExtendable: true });
    expect(shouldAutoExtend(product)).toBe(true);
  });

  it("bid placed well outside sniping window → returns false", () => {
    const farFuture = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const product = makeAuction({ auctionEndDate: farFuture, autoExtendable: true });
    expect(shouldAutoExtend(product)).toBe(false);
  });

  it("autoExtendable=false → always returns false, even if within window", () => {
    const nearlyEnd = new Date(Date.now() + 10 * 1000); // 10 seconds
    const product = makeAuction({ auctionEndDate: nearlyEnd, autoExtendable: false });
    expect(shouldAutoExtend(product)).toBe(false);
  });
});

describe("computeExtendedEndDate", () => {
  it("returns endDate + configured extensionMinutes", () => {
    const end = new Date("2026-01-01T12:00:00Z");
    const product = makeAuction({ auctionEndDate: end, auctionExtensionMinutes: 10 });
    const result = computeExtendedEndDate(product);
    expect(result.getTime()).toBe(end.getTime() + 10 * 60 * 1000);
  });

  it("uses AUCTION_DEFAULT_EXTENSION_MINUTES when not configured", () => {
    const end = new Date("2026-01-01T12:00:00Z");
    const product = makeAuction({ auctionEndDate: end, auctionExtensionMinutes: undefined });
    const result = computeExtendedEndDate(product);
    expect(result.getTime()).toBe(end.getTime() + AUCTION_DEFAULT_EXTENSION_MINUTES * 60 * 1000);
  });
});

describe("assertAuctionActive (integration with repo mock)", async () => {
  const { assertAuctionActive } = await import("../service");

  it("auction exists + active → returns product", async () => {
    const activeAuction = makeAuction();
    (productRepository.findByIdOrSlug as ReturnType<typeof vi.fn>).mockResolvedValue(activeAuction);
    const result = await assertAuctionActive("auction-test");
    expect(result).toBeDefined();
  });

  it("product not found → throws AuctionNotFoundError", async () => {
    (productRepository.findByIdOrSlug as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { AuctionNotFoundError } = await import("../../../../shared/features/auctions/errors");
    await expect(assertAuctionActive("nonexistent")).rejects.toBeInstanceOf(AuctionNotFoundError);
  });

  it("product found but not an auction listing → throws AuctionNotFoundError", async () => {
    const standardProduct = makeAuction({ listingType: "standard" });
    (productRepository.findByIdOrSlug as ReturnType<typeof vi.fn>).mockResolvedValue(standardProduct);
    const { AuctionNotFoundError } = await import("../../../../shared/features/auctions/errors");
    await expect(assertAuctionActive("auction-test")).rejects.toBeInstanceOf(AuctionNotFoundError);
  });

  it("auction exists but endDate in past → throws AuctionEndedError", async () => {
    const expiredAuction = makeAuction({ auctionEndDate: new Date(Date.now() - 1000) });
    (productRepository.findByIdOrSlug as ReturnType<typeof vi.fn>).mockResolvedValue(expiredAuction);
    const { AuctionEndedError } = await import("../../../../shared/features/auctions/errors");
    await expect(assertAuctionActive("auction-test")).rejects.toBeInstanceOf(AuctionEndedError);
  });
});
