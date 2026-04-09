export interface CollectionItem {
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  bannerImage?: string;
  brandSlug?: string;
  franchiseSlug?: string;
  manualProductIds?: string[];
  productCount?: number;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionListItem {
  slug: string;
  title: string;
  subtitle?: string;
  image?: string;
  productCount?: number;
  sortOrder: number;
  active: boolean;
}
