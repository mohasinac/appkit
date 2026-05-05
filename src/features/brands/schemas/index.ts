export const BRANDS_COLLECTION = "brands" as const;

export interface BrandDocument {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoURL?: string;
  bannerURL?: string;
  website?: string;
  isActive: boolean;
  displayOrder?: number;
  productCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type BrandCreateInput = Omit<BrandDocument, "id" | "createdAt" | "updatedAt" | "productCount">;
export type BrandUpdateInput = Partial<BrandCreateInput>;

export const BRAND_FIELDS = {
  ID: "id",
  NAME: "name",
  SLUG: "slug",
  DESCRIPTION: "description",
  LOGO_URL: "logoURL",
  BANNER_URL: "bannerURL",
  WEBSITE: "website",
  IS_ACTIVE: "isActive",
  DISPLAY_ORDER: "displayOrder",
  PRODUCT_COUNT: "productCount",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;
