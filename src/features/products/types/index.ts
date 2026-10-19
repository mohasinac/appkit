import type { MediaField } from "../../media/types/index";
import type { AvailabilityFilter } from "../../../constants/field-names";
import type { CustomField, CustomSection, ProductPrintMeta } from "../schemas/firestore";
export type { CustomField, CustomSection, ProductPrintMeta } from "../schemas/firestore";

export type ProductStatus =
  | "draft"
  | "published"
  | "in_review"
  | "archived";
export type ProductCondition =
  | "new"
  | "like_new"
  | "good"
  | "fair"
  | "poor"
  | "used"
  | "refurbished"
  | "broken"
  | "graded";
/**
 * Canonical listing-kind discriminator (SB1-G Phase 4).
 *
 * Set on every `ProductDocument` / `ProductItem` at creation. The Sieve adapter
 * accepts legacy alias tokens (`preorder` → `pre-order`, `product` → `standard`)
 * but stored values are always one of these five.
 */
// SB-UNI-D — "bundle" dropped from the ListingType union; bundles are now
// a categoryType discriminator on CategoryDocument. Cart/order/product
// records no longer carry a "bundle" listingType value.
// SB-UNI-F 2026-05-13 — additive extension: classified | digital-code | live.
// Capability registry decides whether cart accepts each type. Classified is
// chat-only (canAddToCart=false). Digital-code skips shipping address +
// instant-fulfills. Live requires vendor verification + jurisdiction check.
// EMI/art-stickers session — additive extension: art | stickers. Both are
// printed-only physical goods (standard-like cart/checkout behavior).
// Part Two 2026-10-19 — additive extension: spares. A single component off a
// disassembled Beyblade (an attack ring, a spin gear, a weight disk), sold on
// its own. Standard-like cart/checkout behaviour, but kept OUT of the general
// catalogue and given its own `/spares` page: a catalogue full of loose parts
// buries the complete items, and a buyer hunting one part wants a page where
// everything is a part. It is also the archetypal haggled item, so
// `canMakeOffer` is true.
//
// 🛑 Adding a member here is 21 named sites and only 11 are compile-checked.
// CLAUDE.md's "5-place change, TypeScript catches three" is stale — the live
// list is in the Part Two plan, and two of the unchecked sites were ALREADY
// drifted when it was written (`AdminSiteSettingsView.LISTING_TYPE_KEYS` was
// missing art+stickers and still carried a dead `bundle`;
// `productItemSchema.listingType` carried 7 of 9). Start here and let `tsc`
// enumerate what it can, then work the unchecked list deliberately.
export type ListingType =
  | "standard"
  | "auction"
  | "pre-order"
  | "prize-draw"
  | "classified"
  | "digital-code"
  | "live"
  | "art"
  | "stickers"
  | "spares";

export interface ProductImage {
  url: string;
  thumbnailUrl?: string;
  alt?: string;
  order?: number;
}

export interface ProductSeo {
  title?: string;
  description?: string;
  keywords?: string[];
}

export interface ProductItem {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  mainImage?: string;
  images?: string[];
  media?: MediaField[];
  video?: { url: string; thumbnailUrl?: string };
  featured?: boolean;
  isPromoted?: boolean;
  allowShipBeforeEmiComplete?: boolean;
  /** P-8 GST — buyer-facing tax rate on this product (%). Unset/0 = exempt. */
  gstRate?: 0 | 5 | 12 | 18 | 28;
  /** P-8 GST — Harmonized System of Nomenclature code for GST-compliant invoices. */
  hsnCode?: string;
  printMeta?: ProductPrintMeta;
  currentBid?: number;
  availableQuantity?: number;
  /** @deprecated Use categorySlugs[0] */
  category?: string;
  /** @deprecated Use categoryNames[0] */
  categoryName?: string;
  categorySlugs?: string[];
  categoryNames?: string[];
  categorySlug?: string;
  sellerAvatar?: string;
  status: ProductStatus;
  condition?: ProductCondition;
  /** Canonical listing-kind discriminator (SB1-G Phase 4 — booleans removed). */
  listingType?: ListingType;
  /** Reverse refs maintained by the bundles repository (SB3) — IDs of every
   * bundle whose `bundleItems[]` includes this product. Powers the "In bundle"
   * badge on cards (SB7-A) + detail pages (SB7-B). */
  partOfBundleIds?: string[];
  /** Parallel array of titles — same length + index as `partOfBundleIds`. */
  partOfBundleTitles?: string[];
  sublistingCategoryId?: string;
  groupId?: string;
  isGroupParent?: boolean;
  groupParentSlug?: string;
  groupChildSlugs?: string[];
  groupTitle?: string;
  /** W1-45 — icon shown as a card overlay; emoji or `/media/<slug>`. */
  groupIcon?: string;
  /** W1-45 — denormalized icon from the sublisting category. */
  sublistingIcon?: string;
  isOnSale?: boolean;
  isSold?: boolean;
  /**
   * Printed or built when ordered, so stock does not gate it. Per-LISTING, not
   * implied by `listingType` — a seller can hold a finite run of pre-cut sheets
   * and also offer a print-on-demand one.
   *
   * On the client this drives three things: the PDP says "made to order"
   * instead of a stock line, the group picker uncaps that member's stepper, and
   * `baseAvailable` keeps the row in the default scope at quantity 0.
   */
  madeToOrder?: boolean;
  inStock?: boolean;
  stockCount?: number;
  rating?: number;
  reviewCount?: number;
  tags?: string[];
  attributes?: Record<string, string>;
  seo?: ProductSeo;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;

  // Detail fields
  stockQuantity?: number;
  subcategory?: string;
  brand?: string;
  brandSlug?: string;
  /** "single" = one brand, "unbranded" = no brand (filter won't match), "mixed" = multiple brands */
  brandMode?: "single" | "unbranded" | "mixed";
  /** Brand names for mixed-brand items */
  brands?: string[];
  storeId?: string;
  storeName?: string;
  /** Denormalized store slug — lets a card name its seller with no second read. */
  storeSlug?: string;
  specifications?: { name: string; value: string; unit?: string }[];
  features?: string[];
  shippingInfo?: string;
  returnPolicy?: string;
  /** Absent means final sale — read via `isFinalSale()`, never directly. */
  finalSale?: boolean;
  ingredients?: string[];
  howToUse?: string[];
  allowOffers?: boolean;
  minOfferPercent?: number;
  bulkDiscounts?: { quantity: number; discountPercent: number }[];

  // Auction detail fields
  startingBid?: number;
  bidCount?: number;
  auctionEndDate?: string | Date;
  reservePrice?: number;
  buyNowPrice?: number;
  minBidIncrement?: number;
  autoExtendable?: boolean;
  auctionExtensionMinutes?: number;
  auctionShippingPaidBy?: "seller" | "winner";

  // Pre-order detail fields
  preOrderDeliveryDate?: string | Date;
  preOrderDepositPercent?: number;
  preOrderDepositAmount?: number;
  preOrderMaxQuantity?: number;
  preOrderCurrentCount?: number;
  preOrderProductionStatus?: "upcoming" | "in_production" | "ready_to_ship";
  preOrderCancellable?: boolean;

  // Prize-draw detail fields (SB4)
  prizeDrawItems?: import("../schemas/firestore").PrizeDrawItem[];
  pricePerEntry?: number;
  prizeMaxEntries?: number;
  prizeCurrentEntries?: number;
  prizeRevealWindowStart?: string | Date;
  prizeRevealWindowEnd?: string | Date;
  prizeRevealStatus?: "pending" | "open" | "closed";
  prizeDrawDurationDays?: number;
  prizeRevealMode?: "instant" | "scheduled";
  prizeGithubFileUrl?: string;

  // SB1-B — hard cap on units a single user may purchase (bundle / prize-draw / pre-order)
  maxPerUser?: number;

  /** Winner's display name for ended auctions — shown masked in public UI */
  winnerDisplayName?: string;

  // Analytics
  viewCount?: number;
  avgRating?: number;

  // Shipping
  shippingPaidBy?: "seller" | "buyer";
  pickupAddressId?: string;
  insurance?: boolean;
  insuranceCost?: number;

  // Custom fields & sections (L1–L3)
  customFields?: CustomField[];
  customSections?: CustomSection[];

  /** Physical storage location set in the Print & Label Center. */
  physicalLocation?: {
    zone: string;
    shelf: string;
    bin: string;
  };
  /** Scannable barcode ID linking this listing to a physical stickered item. */
  barcodeId?: string;
}

export interface ProductListResponse {
  items: ProductItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  /** Set when the query fell back to an empty result due to a DB error (index missing, permission denied). */
  warning?: string;
  /**
   * A bounded fetch saturated its ceiling, so `total` is a FLOOR. Render it as
   * "50+", never as an exact count, and never derive a final page number from
   * it — `totalPages` is deliberately `page + 1` while this is set, so the
   * pager offers a live Next instead of claiming a false last page.
   */
  truncated?: boolean;
}

export interface ProductListParams {
  q?: string;
  category?: string;
  categorySlug?: string;
  status?: ProductStatus;
  condition?: ProductCondition;
  minPrice?: number;
  maxPrice?: number;
  /**
   * Which availability scope to request — the three-tab bar rendered by
   * `<AvailabilityTabs>`. Browse surfaces must send this on EVERY request,
   * including the default `"available"`: the API treats an absent value as
   * "all", so omitting it makes the client refetch disagree with the SSR
   * paint, permanently (Root Cause #30).
   */
  availability?: AvailabilityFilter;
  /** Canonical listing-kind discriminator (SB1-G Phase 4). Accepts a single
   * `ListingType`, or a `|`-joined multi-value string (sievejs OR-group,
   * e.g. `"standard|classified|digital-code|live"`) for the consolidated
   * generic Products browse page. */
  listingType?: ListingType | string;
  storeId?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
  featured?: boolean;
  /** Auction-specific: current bid range */
  minBid?: number;
  maxBid?: number;
  /** Auction: end date range / Pre-order: delivery date range */
  dateFrom?: string;
  dateTo?: string;
  /** Pre-order production status */
  preOrderProductionStatus?: "upcoming" | "in_production" | "ready_to_ship";
  /** Prize-draw reveal status */
  prizeRevealStatus?: "pending" | "open" | "closed";
  /** Filter by brand name */
  brand?: string;
  /** Shipping / free shipping */
  freeShipping?: boolean;
  /**
   * Pipe-joined multi-select facets. All three were rendered by
   * `<ProductFilters>` and counted toward the active-filter badge, but no
   * caller ever put them on the wire — ticking one inflated the badge and
   * changed nothing (fixed 2026-08-21).
   */
  tags?: string;
  sublistingCategory?: string;
  features?: string;
  /**
   * Per-listing-type facets keyed by TABLE_KEY (classified city/negotiable,
   * digital-code deliveryMethod, live species/sex/jurisdiction). The server
   * resolves each to its nested Firestore path and ignores unknown keys.
   */
  typeFacets?: Record<string, string>;
}
