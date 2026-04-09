// Domain types for @mohasinac/feat-search

// ─── Product card data used in search results ─────────────────────────────────

export interface SearchProductItem {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  mainImage?: string;
  images?: string[];
  status: string;
  featured?: boolean;
  isAuction?: boolean;
  currentBid?: number;
  isPromoted?: boolean;
  slug: string;
  availableQuantity?: number;
}

// ─── Search API response ──────────────────────────────────────────────────────

export interface SearchResponse {
  items: SearchProductItem[];
  q: string;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// ─── Search query parameters ──────────────────────────────────────────────────

export interface SearchQuery {
  q?: string;
  category?: string;
  subcategory?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  isAuction?: boolean;
  isPreOrder?: boolean;
  inStock?: boolean;
  minRating?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
}

// ─── Category option for filter facets ───────────────────────────────────────

export interface SearchCategoryOption {
  id: string;
  name: string;
  slug?: string;
  tier?: number;
}
