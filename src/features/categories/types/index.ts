// SB-UNI B + C + D — single discriminator for categories vs sublistings vs
// brands vs bundles. Old "concern" / "collection" values were never used.
export type CategoryType = "category" | "sublisting" | "brand" | "bundle";

export interface CategorySeo {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
}

export interface CategoryDisplay {
  icon?: string;
  coverImage?: string;
  color?: string;
  showInMenu?: boolean;
}

export interface CategoryMetrics {
  productCount: number;
  auctionCount?: number;
  totalItemCount: number;
  lastUpdated?: string;
}

export interface CategoryAncestor {
  id: string;
  name: string;
  tier: number;
}

export interface CategoryItem {
  id: string;
  categoryType?: CategoryType;
  /** Sublisting/grading code, e.g. "108/120" or "PSA 10" — only set when categoryType==="sublisting". */
  itemCode?: string;
  /** Brand website — only set when categoryType==="brand". */
  brandWebsite?: string;
  /** Brand country — only set when categoryType==="brand". */
  brandCountry?: string;
  /** Brand founded year — only set when categoryType==="brand". */
  brandFounded?: number;
  name: string;
  slug: string;
  description?: string;
  rootId?: string;
  parentIds?: string[];
  childrenIds?: string[];
  tier: number;
  path?: string;
  order?: number;
  isLeaf?: boolean;
  metrics?: CategoryMetrics;
  isFeatured?: boolean;
  featuredPriority?: number;
  /** @deprecated Use categoryType === "brand" */ isBrand?: boolean;
  seo?: CategorySeo;
  display?: CategoryDisplay;
  ancestors?: CategoryAncestor[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoriesResponse {
  items: CategoryItem[];
  total: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  display?: {
    coverImage?: string;
    icon?: string;
    color?: string;
    showInMenu?: boolean;
    showInFooter?: boolean;
  };
  parentId: string | null;
  tier: number;
  order: number;
  isActive: boolean;
  showOnHomepage: boolean;
  isBrand?: boolean;
  metrics: {
    productCount: number;
    totalProductCount: number;
    auctionCount: number;
    totalAuctionCount: number;
  };
  children: Category[];
}

export type CategoryDrawerMode = "create" | "edit" | "delete" | null;

export function flattenCategories(categories: Category[]): Category[] {
  const result: Category[] = [];

  const flatten = (items: Category[]) => {
    items.forEach((item) => {
      result.push(item);
      if (item.children.length > 0) {
        flatten(item.children);
      }
    });
  };

  flatten(categories);
  return result;
}

// Concerns, collections, and brands are all categories with a type discriminator.
export type Concern = CategoryItem;
export type ConcernListResponse = CategoriesResponse;
