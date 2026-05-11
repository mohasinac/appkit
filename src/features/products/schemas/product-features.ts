/**
 * Product Features — Firestore schema
 *
 * A productFeature is a reusable badge that products opt into via product.features[].
 * Two scopes:
 *   - "platform": admin-curated, available to every store
 *   - "store":    seller-owned, scoped to one storeId, capped at MAX_STORE_CUSTOM_FEATURES
 *
 * id === slug, prefix "feature-".
 *
 * The icon field accepts either:
 *   - a name key from the appkit icon set (e.g. "truck", "badge-check", "trophy"), or
 *   - a raw SVG path-d string starting with "M " (rare; for store custom icons).
 *
 * MAX_FEATURES_PER_PRODUCT — hard cap on product.features[].length, enforced by FI5 form.
 */

export const PRODUCT_FEATURES_COLLECTION = "productFeatures" as const;
export const PRODUCT_FEATURE_PREFIX = "feature-" as const;

export const MAX_STORE_CUSTOM_FEATURES = 20;
export const MAX_FEATURES_PER_PRODUCT = 10;

export type ProductFeatureScope = "platform" | "store";

export type ProductFeatureCategory =
  | "shipping"
  | "seller"
  | "condition"
  | "platform"
  | "auction"
  | "preorder"
  | "custom";

export type ProductFeatureProductType =
  | "product"
  | "auction"
  | "preorder"
  | "all";

/**
 * Either an appkit icon-set name key (e.g. "truck") or a raw SVG path-d string.
 * Path strings must start with "M " — see isFeatureIconPath().
 */
export type ProductFeatureIcon = string;

export function isFeatureIconPath(icon: string): boolean {
  return icon.trimStart().startsWith("M ") || icon.trimStart().startsWith("m ");
}

export interface ProductFeatureDocument {
  id: string;
  slug: string;
  label: string;
  description?: string;
  /** Icon-set name key OR raw SVG path-d string (see isFeatureIconPath). */
  icon: ProductFeatureIcon;
  /** CSS variable token key, e.g. "--appkit-color-primary". Optional — defaults to neutral. */
  iconColor?: string;
  category: ProductFeatureCategory;
  scope: ProductFeatureScope;
  productTypes: ProductFeatureProductType[];
  /** Required when scope === "store". */
  storeId?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductFeatureCreateInput = Omit<
  ProductFeatureDocument,
  "id" | "slug" | "createdAt" | "updatedAt"
>;

export type ProductFeatureUpdateInput = Partial<
  Pick<
    ProductFeatureDocument,
    | "label"
    | "description"
    | "icon"
    | "iconColor"
    | "category"
    | "productTypes"
    | "isActive"
    | "displayOrder"
  >
>;

export const PRODUCT_FEATURE_SIEVE_FIELDS = {
  label: { canFilter: true, canSort: true },
  slug: { canFilter: true, canSort: false },
  scope: { canFilter: true, canSort: false },
  storeId: { canFilter: true, canSort: false },
  category: { canFilter: true, canSort: false },
  isActive: { canFilter: true, canSort: false },
  displayOrder: { canFilter: false, canSort: true },
  createdAt: { canFilter: false, canSort: true },
} as const;
