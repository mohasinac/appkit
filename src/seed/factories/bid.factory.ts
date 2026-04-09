// appkit/src/seed/factories/bid.factory.ts
let _seq = 1;

export interface SeedBidDocument {
  id: string;
  auctionId: string;
  userId: string;
  amount: number;
  timestamp: Date;
  isWinning?: boolean;
  retracted?: boolean;
}

export function makeBid(
  overrides: Partial<SeedBidDocument> = {},
): SeedBidDocument {
  const n = _seq++;
  return {
    id: overrides.id ?? `bid-${n}`,
    auctionId: overrides.auctionId ?? "auction-1",
    userId: overrides.userId ?? `user-${n}`,
    amount: overrides.amount ?? n * 100,
    timestamp: overrides.timestamp ?? new Date(),
    isWinning: overrides.isWinning ?? false,
    retracted: overrides.retracted ?? false,
    ...overrides,
  };
}

export function makeWinningBid(
  overrides: Partial<SeedBidDocument> = {},
): SeedBidDocument {
  return makeBid({ isWinning: true, ...overrides });
}

export const BID_FIXTURES = {
  winning: makeWinningBid({
    id: "bid-winner-1",
    auctionId: "auction-1",
    userId: "buyer-user-1",
    amount: 5000,
  }),
  outbid: makeBid({
    id: "bid-outbid-1",
    auctionId: "auction-1",
    userId: "buyer-user-1",
    amount: 4500,
    isWinning: false,
  }),
};
