/**
 * Listing-type / category-type feature flag helpers — SB-UNI-X4 2026-05-13.
 *
 * Reads from `siteSettings.featureFlags.{listingTypes,categoryTypes}` and
 * collapses missing fields to a "type is enabled" default. The capability
 * registry decides what each type CAN do; these flags decide whether the
 * site exposes the type at all.
 *
 * Consumer pattern:
 *   const settings = await siteSettingsRepository.findById("global");
 *   if (!isListingTypeEnabled("classified", settings)) return null;
 *
 * Future-expansion Pattern 5. Slots with Phase 7 (CTA registry consults the
 * same flag to hide actions for disabled types).
 */

import type { ListingType } from "../../../features/products/types/index";
import type { CategoryType } from "../../../features/categories/types/index";

interface FeatureFlagSnapshot {
  featureFlags?: {
    listingTypes?: Partial<Record<ListingType, boolean>>;
    categoryTypes?: Partial<Record<CategoryType, boolean>>;
  };
}

/**
 * `true` when the type is missing from the flag map OR explicitly enabled.
 * Defaulting to enabled keeps legacy data working — a flag has to be
 * EXPLICITLY set to `false` to disable a type.
 */
export function isListingTypeEnabled(
  type: ListingType,
  settings: FeatureFlagSnapshot | null | undefined,
): boolean {
  const flag = settings?.featureFlags?.listingTypes?.[type];
  return flag !== false;
}

export function isCategoryTypeEnabled(
  type: CategoryType,
  settings: FeatureFlagSnapshot | null | undefined,
): boolean {
  const flag = settings?.featureFlags?.categoryTypes?.[type];
  return flag !== false;
}

/**
 * Every listing type, in canonical iteration order.
 *
 * Declared as `Record<ListingType, true>` rather than a plain array on purpose:
 * adding a member to the `ListingType` union without adding it here is then a
 * COMPILE error, not a silent omission. `art` / `stickers` were missing from
 * the old hand-written array for exactly that reason, which meant
 * `/api/products`' "strip disabled types" post-filter dropped every art and
 * sticker row from any call that didn't name a listingType explicitly
 * (homepage, search, related-items).
 */
const ALL_LISTING_TYPES_MAP: Record<ListingType, true> = {
  standard: true,
  auction: true,
  "pre-order": true,
  "prize-draw": true,
  classified: true,
  "digital-code": true,
  live: true,
  art: true,
  stickers: true,
};

export const ALL_LISTING_TYPES = Object.keys(
  ALL_LISTING_TYPES_MAP,
) as ListingType[];

/** Pull the full list of enabled listing types in canonical iteration order. */
export function enabledListingTypes(
  settings: FeatureFlagSnapshot | null | undefined,
): ListingType[] {
  return ALL_LISTING_TYPES.filter((t) => isListingTypeEnabled(t, settings));
}

export function enabledCategoryTypes(
  settings: FeatureFlagSnapshot | null | undefined,
): CategoryType[] {
  const all: CategoryType[] = ["category", "sublisting", "brand", "bundle"];
  return all.filter((t) => isCategoryTypeEnabled(t, settings));
}
