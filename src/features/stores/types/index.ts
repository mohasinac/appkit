// ─── Store list item (public-facing, safe to send to client) ─────────────────

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
  createdAt?: string;
}

// ─── Store detail (full public profile) ──────────────────────────────────────

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

// ─── Store product / auction items (minimal shape for display) ───────────────

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
  isAuction: boolean;
  currentBid?: number;
  isPromoted?: boolean;
  slug: string;
  availableQuantity?: number;
}

export interface StoreAuctionItem extends StoreProductItem {
  isAuction: true;
  auctionEndDate: string;
  startingBid: number;
  bidCount: number;
}

// ─── List responses ───────────────────────────────────────────────────────────

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
  category?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  filters?: string;
}

// ─── Store auctions response ──────────────────────────────────────────────────

export interface StoreAuctionsResponse {
  items: StoreAuctionItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// ─── Store reviews ────────────────────────────────────────────────────────────

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
  ratingDistribution: Record<number, number>;
}
