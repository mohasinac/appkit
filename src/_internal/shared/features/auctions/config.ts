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
 * Drop malformed rows and fall back to the seed table when nothing usable is
 * left.
 *
 * An empty/missing tier array does NOT mean "this auction has no increment
 * rule" — it means the `siteSettings/global` singleton predates
 * `auctionConfig.bidIncrementTiers`, or an admin cleared every row. Every
 * caller reaches this via `settings.auctionConfig?.bidIncrementTiers ?? []`,
 * so before this guard existed that case fell through to the ₹1
 * `AUCTION_MIN_BID_INCREMENT` last-resort constant, which made the effective
 * minimum step ₹1 on every auction on the site — that is what rendered the
 * bid presets as "+₹1 / +₹5 / +₹10" instead of tier-derived steps.
 */
function usableTiers(tiers: BidIncrementTier[]): BidIncrementTier[] {
  const valid = (tiers ?? []).filter(
    (t) => t && Number.isFinite(t.increment) && t.increment > 0,
  );
  return valid.length > 0 ? valid : DEFAULT_AUCTION_BID_INCREMENT_TIERS;
}

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
  const table = usableTiers(tiers);
  for (const tier of table) {
    if (tier.upTo === null || currentBidAmount <= tier.upTo) return tier.increment;
  }
  return table[table.length - 1]?.increment ?? AUCTION_MIN_BID_INCREMENT;
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
  return typeof override === "number" && Number.isFinite(override) && override > tierValue
    ? override
    : tierValue;
}

export interface ResolveMinBidOptions {
  /**
   * Whether the auction already has at least one bid. Defaults to `true`.
   *
   * When `false` the starting bid is itself acceptable — a seller's opening
   * price is a price, not a floor that must be beaten. Requiring
   * `startingBid + increment` for the very first bid (which is what this
   * function did unconditionally before) meant a ₹100 auction could never be
   * opened at ₹100, only at ₹110, contradicting both the "Starting bid ₹100"
   * label shown next to the field and the eBay convention buyers expect.
   */
  hasBids?: boolean;
}

/**
 * The single definition of "the lowest amount this auction will accept next".
 *
 * Both the bid form and `placeBid` must agree on this exactly, or the form
 * seeds an amount the server then rejects. Deriving it in two places is the
 * drift shape Root Cause #30 describes, so both call this instead.
 *
 * `currentBidAmount` is the auction's live visible price — for an auction with
 * no bids yet, callers pass `startingBid` (mirroring `placeBid`'s `baseBid`)
 * together with `{ hasBids: false }`.
 */
export function resolveMinBid(
  currentBidAmount: number,
  tiers: BidIncrementTier[],
  override?: number | null,
  opts?: ResolveMinBidOptions,
): number {
  if (opts?.hasBids === false) return currentBidAmount;
  return currentBidAmount + resolveMinBidIncrement(currentBidAmount, tiers, override);
}

export interface BuyNowAvailabilityInput {
  buyNowPrice: number | null | undefined;
  /** The auction's live visible price. Pass the SSE value client-side. */
  currentBid: number | null | undefined;
  isEnded: boolean;
  isSold?: boolean;
}

/**
 * The single definition of "can this auction be bought outright right now".
 *
 * Written once for the same reason `resolveMinBid` is: the predicate had been
 * hand-written in five places (the bid form, three spots on the auction detail
 * page, the marketplace card) and they disagreed — the detail page advertised
 * "Buy Now: ₹5,999" from a two-condition check while the button beneath it used
 * a three-condition one, so most auctions showed a price with no button under
 * it. That is the drift shape Root Cause #30 describes.
 *
 * The old third condition was `!bidsHaveStarted` (eBay's rule: BIN vanishes the
 * moment anyone bids). It is deliberately gone. Buyout now stays available for
 * as long as it is still a better deal than the standing bid, which is the
 * condition that actually matters — a BIN price the bidding has already passed
 * is meaningless, and one it hasn't is still a real offer.
 *
 * `isSold` is optional because client callers rendering a live auction page
 * already know it isn't sold; server callers should always pass it.
 */
export function isBuyNowAvailable({
  buyNowPrice,
  currentBid,
  isEnded,
  isSold,
}: BuyNowAvailabilityInput): boolean {
  if (isEnded || isSold === true) return false;
  if (typeof buyNowPrice !== "number" || !Number.isFinite(buyNowPrice) || buyNowPrice <= 0) {
    return false;
  }
  return buyNowPrice > (currentBid ?? 0);
}

/**
 * Preset step multipliers offered by the bid form, as multiples of the
 * effective minimum increment. With a ₹100 increment this renders
 * +₹100 / +₹500 / +₹1,000; with a ₹1,000 increment, +₹1,000 / +₹5,000 /
 * +₹10,000. Never hardcode the rupee amounts at the call site — the whole
 * point is that the steps track the tier.
 */
export const BID_PRESET_MULTIPLIERS = [1, 5, 10] as const;
export type BidPresetMultiplier = (typeof BID_PRESET_MULTIPLIERS)[number];
