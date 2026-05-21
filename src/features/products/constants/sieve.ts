import { sortBy } from "../../../constants/sort";
import { PRODUCT_FIELDS } from "../../../constants/field-names";

const LABEL_PRICE_HIGH = "Price: High to Low";
const LABEL_PRICE_LOW = "Price: Low to High";
const LABEL_NEWEST = "Newest First";
const LABEL_OLDEST = "Oldest First";

export type SortOption = { readonly value: string; readonly label: string };

// ---------------------------------------------------------------------------
// Standard Products
// ---------------------------------------------------------------------------

export const STANDARD_SORT_OPTIONS = [
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT), label: LABEL_NEWEST },
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT, "ASC"), label: LABEL_OLDEST },
  { value: sortBy(PRODUCT_FIELDS.PRICE, "ASC"), label: LABEL_PRICE_LOW },
  { value: sortBy(PRODUCT_FIELDS.PRICE), label: LABEL_PRICE_HIGH },
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
// Auctions
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
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT), label: LABEL_NEWEST },
  { value: sortBy(PRODUCT_FIELDS.PRICE, "ASC"), label: LABEL_PRICE_LOW },
  { value: sortBy(PRODUCT_FIELDS.PRICE), label: LABEL_PRICE_HIGH },
  { value: sortBy(PRODUCT_FIELDS.PRE_ORDER_CURRENT_COUNT), label: "Fewest Slots Left" },
  { value: sortBy(PRODUCT_FIELDS.PRE_ORDER_DEPOSIT_AMOUNT, "ASC"), label: "Lowest Deposit First" },
] as const satisfies readonly SortOption[];

// ---------------------------------------------------------------------------
// Bundles
// ---------------------------------------------------------------------------

export const BUNDLE_SORT_OPTIONS = [
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT), label: LABEL_NEWEST },
  { value: sortBy(PRODUCT_FIELDS.PRICE, "ASC"), label: LABEL_PRICE_LOW },
  { value: sortBy(PRODUCT_FIELDS.PRICE), label: LABEL_PRICE_HIGH },
  { value: "-savingsAmount", label: "Most Savings" },
  { value: "-bundleItemCount", label: "Most Items" },
] as const satisfies readonly SortOption[];

// ---------------------------------------------------------------------------
// Prize Draws
// ---------------------------------------------------------------------------

export const PRIZE_DRAW_SORT_OPTIONS = [
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT), label: LABEL_NEWEST },
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT, "ASC"), label: LABEL_OLDEST },
  { value: sortBy(PRODUCT_FIELDS.PRIZE_REVEAL_WINDOW_START, "ASC"), label: "Reveal: Soonest" },
  { value: sortBy(PRODUCT_FIELDS.PRIZE_REVEAL_WINDOW_START), label: "Reveal: Furthest" },
  { value: sortBy(PRODUCT_FIELDS.PRICE, "ASC"), label: "Entry: Low to High" },
  { value: sortBy(PRODUCT_FIELDS.PRICE), label: "Entry: High to Low" },
] as const satisfies readonly SortOption[];

// ---------------------------------------------------------------------------
// Lookup by listing type
// ---------------------------------------------------------------------------

export const SORT_OPTIONS_BY_LISTING_TYPE: Record<string, readonly SortOption[]> = {
  standard: STANDARD_SORT_OPTIONS,
  auction: AUCTION_SORT_OPTIONS,
  "pre-order": PREORDER_SORT_OPTIONS,
  bundle: BUNDLE_SORT_OPTIONS,
  "prize-draw": PRIZE_DRAW_SORT_OPTIONS,
} as const;
