/**
 * Shared constants for productFeatures editors, selectors, and renderers (FI1–FI6).
 *
 * Centralising these here keeps the admin/store editor (AdminFeatureEditorView),
 * the product-form selector (ProductFeaturesSelector), and the badge renderer
 * (FeatureBadge) in lockstep when a new category/icon/colour token is added.
 */

import type { SelectOption } from "../../../ui/components/Select";
import type {
  ProductFeatureCategory,
  ProductFeatureProductType,
  ProductFeatureScope,
} from "../schemas/product-features";

// ---------------------------------------------------------------------------
// Option lists (Select / pill-checkbox UIs)
// ---------------------------------------------------------------------------

export const PRODUCT_FEATURE_CATEGORY_OPTIONS: SelectOption<ProductFeatureCategory>[] =
  [
    { value: "shipping", label: "Shipping" },
    { value: "seller", label: "Seller" },
    { value: "condition", label: "Condition" },
    { value: "platform", label: "Platform" },
    { value: "auction", label: "Auction" },
    { value: "preorder", label: "Pre-order" },
    { value: "custom", label: "Custom" },
  ];

export const PRODUCT_FEATURE_PRODUCT_TYPE_OPTIONS: SelectOption<ProductFeatureProductType>[] =
  [
    { value: "all", label: "All listing types" },
    { value: "product", label: "Standard product" },
    { value: "auction", label: "Auction" },
    { value: "preorder", label: "Pre-order" },
    { value: "prize-draw", label: "Prize draw" },
    { value: "classified", label: "Classified" },
    { value: "digital-code", label: "Digital code" },
    { value: "live", label: "Live item" },
  ];

export const PRODUCT_FEATURE_SCOPE_OPTIONS: SelectOption<ProductFeatureScope>[] =
  [
    { value: "platform", label: "Platform (all stores)" },
    { value: "store", label: "Store-specific" },
  ];

export const PRODUCT_FEATURE_ICON_COLOR_OPTIONS: SelectOption[] = [
  { value: "", label: "Neutral (default)" },
  { value: "--appkit-color-primary", label: "Primary" },
  { value: "--appkit-color-secondary", label: "Secondary" },
];

// ---------------------------------------------------------------------------
// Defaults + UX tuning knobs
// ---------------------------------------------------------------------------

/** Default displayOrder for newly created features. */
export const PRODUCT_FEATURE_DEFAULT_DISPLAY_ORDER = 100;

/** Maximum badges rendered inline on a ProductCard before the "+N more" pill. */
export const PRODUCT_FEATURE_CARD_MAX_VISIBLE = 3;

/** React Query staleTime for the platform/store feature lookups. */
export const PRODUCT_FEATURE_QUERY_STALE_MS = 60_000;

// ---------------------------------------------------------------------------
// Filter / tab labels
// ---------------------------------------------------------------------------

export const PRODUCT_FEATURE_SCOPE_TABS: Array<{
  value: ProductFeatureScope;
  label: string;
}> = [
  { value: "platform", label: "Platform" },
  { value: "store", label: "Store Custom" },
];
