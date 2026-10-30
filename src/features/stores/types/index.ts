import type { ListingType } from "../../products/types";
import type {
  SellerTier,
  SellerStandingCriterion,
} from "../../../_internal/shared/features/seller-standing/config";

// --- Store list item (public-facing, safe to send to client) -----------------

export interface StoreListItem {
  id: string;
  storeSlug: string;
  ownerId: string;
  storeName: string;
  storeDescription?: string;
  storeCategory?: string;
  storeLogoURL?: string;
  storeBannerURL?: string;
  status: string;
  isPublic: boolean;
  totalProducts?: number;
  itemsSold?: number;
  totalReviews?: number;
  averageRating?: number;
  /**
   * Buyer protections this seller supports — C5e, tier 2 of three.
   *
   * 🛑 On the LIST item, not just the detail, because the safety badge and the
   * risk notice both belong on a store card. And NOT optional here even though
   * the document field is: the projection resolves absence to `false` so the
   * client never has to decide what `undefined` means (see `toStoreListItem`).
   */
  supportsShippingProtection: boolean;
  supportsSaleProtection: boolean;
  /**
   * S5a — this seller will split one paid order across several destinations.
   *
   * Not optional, for the same reason as the two above: the projection
   * resolves absence to `false`, so the client never decides what `undefined`
   * means.
   */
  allowSharedPurchase: boolean;
  /**
   * The two shared-purchase fees, in decimal rupees.
   *
   * 🛑 OPTIONAL here where `allowSharedPurchase` is not, and the asymmetry is
   * the point: a flag's absence means "no", but a fee's absence means "not
   * configured" — which is not ₹0. A client that defaulted these to zero would
   * quote a free arrangement from a store that has simply not priced one, and
   * the coordinator commits against that quote.
   */
  sharedPurchaseHandlingFee?: number;
  sharedPurchaseExtraShippingPerDestination?: number;
  /**
   * Seller trust, as a buyer sees it.
   *
   * 🛑 Neither is optional, for the same reason as the flags above: the
   * projection resolves absence (`?? false` / `?? "seller"`), so no client has
   * to decide what `undefined` means. A badge component testing `!== "seller"`
   * on an undefined value would render a TRUSTED badge on a store that has
   * earned nothing.
   *
   * 🛑 There is deliberately no `trustedSeller` here and there must never be.
   * That field means "we pay this store before delivery" — our risk posture,
   * not an endorsement — and it is in `PRIVATE_STORE_FIELDS` for that reason.
   */
  isVerified: boolean;
  sellerTier: SellerTier;
  /**
   * The cached standing metrics behind `sellerTier`, when they have ever been
   * computed.
   *
   * OPTIONAL, unlike the two above, and that asymmetry is the point: absent
   * means "never measured", which the seller's panel must render differently
   * from a measured zero. Defaulting it would turn "we have not looked yet"
   * into a confident "0 of 25".
   */
  standing?: SellerStandingSnapshot;
  createdAt?: string;
}

/**
 * The public half of `StoreDocument.standing` — counts and a mean, nothing
 * that identifies a buyer. The address criterion is counted from HMAC
 * fingerprints and only the count is kept.
 */
export interface SellerStandingSnapshot {
  computedAt: Date | string;
  nextComputeAt?: Date | string;
  windowDays: number;
  deliveredOrders: number;
  distinctBuyers: number;
  distinctAddresses: number;
  ratedOrders: number;
  averageRating: number;
  met: Record<SellerStandingCriterion, boolean>;
}

// --- Store detail (full public profile) --------------------------------------

export interface StoreDetail extends StoreListItem {
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
  returnPolicy?: string;
  shippingPolicy?: string;
  isVacationMode?: boolean;
  vacationMessage?: string;
}

// --- Store product / collector drop items (minimal shape for display) ---------------

export interface StoreProductItem {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  mainImage?: string;
  images?: string[];
  status: string;
  featured: boolean;
  /** Canonical listing-kind discriminator (SB1-G Phase 4). */
  listingType: ListingType;
  currentBid?: number;
  isPromoted?: boolean;
  slug: string;
  availableQuantity?: number;
}

export interface StoreCollectorDropItem extends Omit<StoreProductItem, "listingType"> {
  listingType: "collector-drop";
  collectorDropEndDate: string;
  startingBid: number;
  bidCount: number;
}

// --- List responses -----------------------------------------------------------

export interface StoreListResponse {
  items: StoreListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface StoreProductsResponse {
  items: StoreProductItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface StoreListParams {
  q?: string;
  category?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  filters?: string;
  /** Minimum average rating, pipe-joined when several chips are ticked. Refined in memory server-side. */
  rating?: string;
}

// --- Store collector drops response --------------------------------------------------

export interface StoreCollectorDropsResponse {
  items: StoreCollectorDropItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// --- Store reviews ------------------------------------------------------------

export interface StoreReview {
  id: string;
  productId: string;
  productTitle?: string;
  productMainImage?: string | null;
  userId: string;
  userName?: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface StoreReviewsData {
  reviews: StoreReview[];
  averageRating: number;
  totalReviews: number;
  totalFiltered: number;
  totalPages: number;
  ratingDistribution: Record<number, number>;
}
