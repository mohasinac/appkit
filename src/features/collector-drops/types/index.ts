import type { MediaField } from "../../media/types/index";

// --- Collector Drop product item -----------------------------------------------------

export interface CollectorDropItem {
  id: string;
  title: string;
  description?: string;
  slug?: string;
  mainImage?: string;
  images?: string[];
  media?: MediaField[];
  currency: string;
  /** Reserve / buy-now price */
  price: number;
  startingBid: number;
  currentBid?: number;
  bidCount: number;
  collectorDropEndDate: string;
  status: "published" | "draft" | "in_review" | "archived";
  sellerId: string;
  storeId?: string;
  storeSlug?: string;
  featured: boolean;
  /** Canonical listing-kind discriminator — always "collector-drop" for CollectorDropItem. */
  listingType: "collector-drop";
  video?: { url: string; thumbnailUrl?: string };
  createdAt: string;
  updatedAt: string;
}

// --- Bid record ---------------------------------------------------------------

export interface BidRecord {
  id: string;
  collectorDropId: string;
  bidderId: string;
  bidderDisplayName?: string;
  amount: number;
  currency: string;
  placedAt: string;
  isWinning: boolean;
}

// --- List response ------------------------------------------------------------

export interface CollectorDropListResponse {
  items: CollectorDropItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface BidListResponse {
  items: BidRecord[];
  total: number;
  hasMore: boolean;
}

export interface CollectorDropListParams {
  storeSlug?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  filters?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface PublicBid {
  id: string;
  productId: string;
  productTitle: string;
  userId: string;
  userName: string;
  bidAmount: number;
  currency: string;
  status: string;
  isWinning: boolean;
  bidDate: Date | string;
  autoMaxBid?: number;
}
