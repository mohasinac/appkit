export const AUCTIONS_PAGE_SIZE = 20;
export const AUCTIONS_ACTIVE_LIMIT = 50;
export const AUCTIONS_SITEMAP_LIMIT = 5000;
export const AUCTION_DEFAULT_EXTENSION_MINUTES = 5;
export const AUCTION_MIN_BID_INCREMENT = 1; // ₹1 — last-resort fallback when bidIncrementTiers is empty/missing
export const AUCTION_SNIPING_WINDOW_SECONDS = 300; // 5 minutes — triggers auto-extend

export interface BidIncrementTier {
  /** Upper bound (inclusive) of this band's current-bid range. `null` = open-ended ("and above"), must be the last tier. */
  upTo: number | null;
  increment: number;
}

/** Seed/fallback tier table — single source of truth reused by both DEFAULT_SITE_SETTINGS_DATA and the admin editor's initial state. */
export const DEFAULT_AUCTION_BID_INCREMENT_TIERS: BidIncrementTier[] = [
  { upTo: 100, increment: 10 },
  { upTo: 1000, increment: 100 },
  { upTo: 5000, increment: 200 },
  { upTo: 10000, increment: 500 },
  { upTo: null, increment: 1000 },
];

/**
 * Resolve the tiered minimum bid increment for a given current bid amount.
 * Tier lookup is inclusive of each band's upper bound — e.g. with the
 * default tiers, a current bid of exactly 1000 resolves to the 100
 * increment (the 100-1000 tier), not the 200 increment of the next band.
 */
export function resolveTieredBidIncrement(
  currentBidAmount: number,
  tiers: BidIncrementTier[],
): number {
  for (const tier of tiers) {
    if (tier.upTo === null || currentBidAmount <= tier.upTo) return tier.increment;
  }
  return tiers[tiers.length - 1]?.increment ?? AUCTION_MIN_BID_INCREMENT;
}

/**
 * Effective minimum bid increment = max(admin tier floor, per-listing
 * override). A seller's per-listing "Minimum Bid Increment" can require
 * MORE than the platform tier, but can never undercut it.
 */
export function resolveMinBidIncrement(
  currentBidAmount: number,
  tiers: BidIncrementTier[],
  override?: number | null,
): number {
  const tierValue = resolveTieredBidIncrement(currentBidAmount, tiers);
  return typeof override === "number" && override > tierValue ? override : tierValue;
}
