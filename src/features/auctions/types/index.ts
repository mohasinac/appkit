// ─── Auction product item ─────────────────────────────────────────────────────

export interface AuctionItem {
  id: string;
  title: string;
  description?: string;
  slug?: string;
  mainImage?: string;
  images?: string[];
  currency: string;
  /** Reserve / buy-now price */
  price: number;
  startingBid: number;
  currentBid?: number;
  bidCount: number;
  auctionEndDate: string;
  status: "published" | "draft" | "archived" | "sold";
  sellerId: string;
  storeId?: string;
  storeSlug?: string;
  featured: boolean;
  isAuction: true;
  video?: { url: string; thumbnailUrl?: string };
  createdAt: string;
  updatedAt: string;
}

// ─── Bid record ───────────────────────────────────────────────────────────────

export interface BidRecord {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderDisplayName?: string;
  amount: number;
  currency: string;
  placedAt: string;
  isWinning: boolean;
}

// ─── List response ────────────────────────────────────────────────────────────

export interface AuctionListResponse {
  items: AuctionItem[];
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

// ─── Input ────────────────────────────────────────────────────────────────────

export interface PlaceBidInput {
  auctionId: string;
  amount: number;
  currency: string;
}

export interface AuctionListParams {
  storeSlug?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  filters?: string;
}
