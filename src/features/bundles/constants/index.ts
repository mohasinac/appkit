/**
 * Bundles — shared constants.
 *
 * Centralises tunables that the form, picker, listing view, API routes,
 * and Zod validation all need to agree on. Single source of truth so the
 * UI cap and the server-side check never drift apart.
 */

import type { SelectOption } from "../../../ui";
import type {
  BundleItemListingType,
  BundleStatus,
} from "../schemas/firestore";

export const BUNDLE_VALIDATION = {
  MIN_ITEMS: 3,
  MAX_ITEMS: 16,
  MAX_COVER_IMAGES: 5,
  MAX_ITEM_IMAGES: 2,
  MAX_RESULTS_PER_PAGE: 24,
  MAX_PICKER_RESULTS: 50,
} as const;

export const BUNDLES_CURRENCY = "INR" as const;

export const BUNDLE_STATUS_OPTIONS: SelectOption<BundleStatus>[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "archived", label: "Archived" },
];

export const BUNDLE_ITEM_TYPE_LABEL: Record<BundleItemListingType, string> = {
  standard: "Standard",
  "pre-order": "Pre-order",
};

export const BUNDLE_ITEM_TYPE_OPTIONS: SelectOption<BundleItemListingType>[] = [
  { value: "standard", label: "Standard products" },
  { value: "pre-order", label: "Pre-orders" },
];

export const BUNDLE_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "savings-desc", label: "Biggest savings" },
  { value: "price-asc", label: "Price (low → high)" },
] as const;

export type BundleSort = (typeof BUNDLE_SORT_OPTIONS)[number]["value"];
