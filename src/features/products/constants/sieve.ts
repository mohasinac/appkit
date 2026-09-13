import { sortBy } from "../../../constants/sort";
import { PRODUCT_FIELDS } from "../../../constants/field-names";

const LABEL_PRICE_HIGH = "Price: High to Low";
const LABEL_PRICE_LOW = "Price: Low to High";
const LABEL_NEWEST = "Newest First";
const LABEL_OLDEST = "Oldest First";

export type SortOption = { readonly value: string; readonly label: string };

// ---------------------------------------------------------------------------
// W2-6 — Base sort options shared by standard / pre-order / bundle / prize-draw.
// Auctions get their own base (auctionEndDate primary) because the "Ending Soon"
// dimension dominates browse intent.
// ---------------------------------------------------------------------------

const BASE_TIME_SORTS = [
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT), label: LABEL_NEWEST },
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT, "ASC"), label: LABEL_OLDEST },
] as const satisfies readonly SortOption[];

const BASE_PRICE_SORTS = [
  { value: sortBy(PRODUCT_FIELDS.PRICE, "ASC"), label: LABEL_PRICE_LOW },
  { value: sortBy(PRODUCT_FIELDS.PRICE), label: LABEL_PRICE_HIGH },
] as const satisfies readonly SortOption[];

/** Time + price sorts, the common subset across most listing-type pickers. */
export const BASE_SORT_OPTIONS = [...BASE_TIME_SORTS, ...BASE_PRICE_SORTS] as const satisfies readonly SortOption[];

/**
 * Drop the price sorts when the viewer may not see prices.
 *
 * Ordering a list by price discloses the ranking of every hidden amount, and
 * with paging that is most of the way to a price list — so the option is not
 * offered to signed-out visitors, matching the hidden price-range facet.
 *
 * 🛑 This removes the CONTROL, not the capability. A hand-written
 * `?sort=price:asc` still sorts, exactly as `?f=price>N` still filters — both
 * are the documented, accepted residue of gating the render rather than
 * withholding the field (see CLAUDE.md § "Public Data Projections"). What it
 * buys is that no casual visitor is handed the lever.
 */
export function withoutPriceSorts(
  options: readonly SortOption[],
  canSeePrices: boolean,
): readonly SortOption[] {
  if (canSeePrices) return options;
  // Exact match on the field, both directions. `sortBy()` encodes direction as
  // a leading "-", so stripping it yields the bare field name — substring
  // matching would catch an unrelated `pricePerEntry` sort by accident.
  return options.filter(
    (o) => !MONEY_SORT_FIELDS.includes(o.value.replace(/^-/, "") as never),
  );
}

/**
 * Every sort field that orders by an AMOUNT, matched as a substring of the
 * sort value (`sortBy()` emits `field` / `-field`, so one entry covers both
 * directions).
 *
 * `currentBid`, `startingBid` and `buyNowPrice` are here for the same reason
 * `price` is: "Highest Current Bid" ranks every hidden bid on the page, which
 * is the disclosure the gate exists to prevent. `bidCount` is deliberately
 * ABSENT — the number of bids is not an amount, it is already displayed
 * ungated beside every auction, and hiding it would remove a real signal for
 * no gain.
 */
const MONEY_SORT_FIELDS = [
  PRODUCT_FIELDS.PRICE,
  PRODUCT_FIELDS.CURRENT_BID,
  PRODUCT_FIELDS.STARTING_BID,
  PRODUCT_FIELDS.BUY_NOW_PRICE,
] as const;

// ---------------------------------------------------------------------------
// Standard Products
// ---------------------------------------------------------------------------

export const STANDARD_SORT_OPTIONS = [
  ...BASE_SORT_OPTIONS,
  { value: sortBy(PRODUCT_FIELDS.TITLE, "ASC"), label: "Name: A–Z" },
  { value: sortBy(PRODUCT_FIELDS.TITLE), label: "Name: Z–A" },
  { value: sortBy(PRODUCT_FIELDS.FEATURED), label: "Featured First" },
  { value: sortBy(PRODUCT_FIELDS.IS_PROMOTED), label: "Promoted First" },
  { value: sortBy(PRODUCT_FIELDS.UPDATED_AT), label: "Recently Updated" },
  { value: sortBy(PRODUCT_FIELDS.VIEW_COUNT), label: "Most Viewed" },
] as const satisfies readonly SortOption[];

export const STANDARD_PUBLIC_SORT_OPTIONS = [
  STANDARD_SORT_OPTIONS[0],
  STANDARD_SORT_OPTIONS[1],
  STANDARD_SORT_OPTIONS[2],
  STANDARD_SORT_OPTIONS[3],
  STANDARD_SORT_OPTIONS[4],
  STANDARD_SORT_OPTIONS[5],
  STANDARD_SORT_OPTIONS[9],
] as const satisfies readonly SortOption[];

// ---------------------------------------------------------------------------
// Auctions — auction-specific base puts auctionEndDate primary
// ---------------------------------------------------------------------------

export const AUCTION_SORT_OPTIONS = [
  { value: sortBy(PRODUCT_FIELDS.AUCTION_END_DATE, "ASC"), label: "Ending Soon" },
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT), label: "Just Started" },
  { value: sortBy(PRODUCT_FIELDS.CURRENT_BID, "ASC"), label: "Lowest Current Bid" },
  { value: sortBy(PRODUCT_FIELDS.CURRENT_BID), label: "Highest Current Bid" },
  { value: sortBy(PRODUCT_FIELDS.STARTING_BID, "ASC"), label: "Lowest Starting Bid" },
  { value: sortBy(PRODUCT_FIELDS.BID_COUNT), label: "Most Bids" },
  { value: sortBy(PRODUCT_FIELDS.BID_COUNT, "ASC"), label: "Fewest Bids" },
  { value: sortBy(PRODUCT_FIELDS.BUY_NOW_PRICE, "ASC"), label: "Buy It Now: Low–High" },
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT, "ASC"), label: "Oldest Listed" },
] as const satisfies readonly SortOption[];

export const AUCTION_PUBLIC_SORT_OPTIONS = [
  AUCTION_SORT_OPTIONS[0],
  AUCTION_SORT_OPTIONS[1],
  AUCTION_SORT_OPTIONS[2],
  AUCTION_SORT_OPTIONS[3],
  AUCTION_SORT_OPTIONS[5],
  AUCTION_SORT_OPTIONS[7],
] as const satisfies readonly SortOption[];

// ---------------------------------------------------------------------------
// Pre-Orders
// ---------------------------------------------------------------------------

export const PREORDER_SORT_OPTIONS = [
  { value: sortBy(PRODUCT_FIELDS.PRE_ORDER_DELIVERY_DATE, "ASC"), label: "Earliest Delivery" },
  { value: sortBy(PRODUCT_FIELDS.PRE_ORDER_DELIVERY_DATE), label: "Latest Delivery" },
  ...BASE_TIME_SORTS.slice(0, 1), // Newest First
  ...BASE_PRICE_SORTS,
  { value: sortBy(PRODUCT_FIELDS.PRE_ORDER_CURRENT_COUNT), label: "Fewest Slots Left" },
  { value: sortBy(PRODUCT_FIELDS.PRE_ORDER_DEPOSIT_AMOUNT, "ASC"), label: "Lowest Deposit First" },
] as const satisfies readonly SortOption[];

/**
 * Public pre-order browse subset. Drops "Lowest Deposit First" — deposit
 * amount is a seller-side pricing lever buyers don't shop by — but keeps
 * both delivery-date directions, which are the primary browse intent.
 */
export const PREORDER_PUBLIC_SORT_OPTIONS = [
  PREORDER_SORT_OPTIONS[0],
  PREORDER_SORT_OPTIONS[1],
  PREORDER_SORT_OPTIONS[2],
  PREORDER_SORT_OPTIONS[3],
  PREORDER_SORT_OPTIONS[4],
  PREORDER_SORT_OPTIONS[5],
] as const satisfies readonly SortOption[];

// ---------------------------------------------------------------------------
// Bundles
// ---------------------------------------------------------------------------

// "Most Savings" / "Most Items" sorts were removed (2026-08-17) — they
// referenced `savingsAmount`/`bundleItemCount`, fields that were never added
// to ProductDocument, so the sorts silently no-opped. Re-add once those
// fields are computed and written at bundle create/update time.
export const BUNDLE_SORT_OPTIONS = [
  ...BASE_TIME_SORTS.slice(0, 1), // Newest First
  ...BASE_PRICE_SORTS,
] as const satisfies readonly SortOption[];

// ---------------------------------------------------------------------------
// Prize Draws
// ---------------------------------------------------------------------------

export const PRIZE_DRAW_SORT_OPTIONS = [
  ...BASE_TIME_SORTS,
  { value: sortBy(PRODUCT_FIELDS.PRIZE_REVEAL_WINDOW_START, "ASC"), label: "Reveal: Soonest" },
  { value: sortBy(PRODUCT_FIELDS.PRIZE_REVEAL_WINDOW_START), label: "Reveal: Furthest" },
  { value: sortBy(PRODUCT_FIELDS.PRICE, "ASC"), label: "Entry: Low to High" },
  { value: sortBy(PRODUCT_FIELDS.PRICE), label: "Entry: High to Low" },
] as const satisfies readonly SortOption[];

/** Public prize-draw browse subset — every option is buyer-meaningful. */
export const PRIZE_DRAW_PUBLIC_SORT_OPTIONS = PRIZE_DRAW_SORT_OPTIONS;

// ---------------------------------------------------------------------------
// Lookup by listing type
// ---------------------------------------------------------------------------
//
// The per-type lookup used to live here as a hand-written map keyed on plain
// strings. It carried a `bundle` key long after SB-UNI-D stopped bundles from
// being a listingType, and had no entry at all for classified / digital-code /
// live / art / stickers — five of nine types. It is now DERIVED from the
// listing-type plugin registry (`sortOptionsFor()` in
// `_internal/shared/listing-types/_registry.ts`), so a type can never be
// missing from it again.
//
// `BUNDLE_SORT_OPTIONS` above stays a standalone export on purpose — bundles
// are a `categoryType` on the `categories` collection, not a listingType, so
// they must not be reachable through a ListingType-keyed lookup.
