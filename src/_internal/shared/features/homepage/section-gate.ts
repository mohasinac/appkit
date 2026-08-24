/*
 * WHY: The only code in the repo that gated homepage sections on
 *      `siteSettings.featureFlags` lived inside `getHomepageInitial`, a
 *      function with ZERO call sites — the live homepage
 *      (`MarketplaceHomepageView`) reads `homepageSectionsRepository`
 *      directly. So turning off the `auctions` flag hid auctions everywhere
 *      except the homepage, which kept advertising them.
 *
 *      `getHomepageInitial` itself was deleted rather than wired up: its other
 *      unique calls, `findActiveAuctions()` / `findActivePreOrders()`, are
 *      unbounded `.get()` collection scans with no `.limit()`, which Rule #6
 *      forbids. The gate is the only part worth keeping, so it moved here.
 *
 * EXPORTS: SECTION_FEATURE_GATE, filterSectionsByFeatureFlags
 *
 * @tag domain:homepage
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:MarketplaceHomepageView
 * @tag sideEffects:none
 */

import type { SectionType } from "../../../../features/homepage/schemas/firestore";
import type { FeatureFlagKey } from "../../../../features/admin/schemas/firestore";

/** Section types that require a feature flag to be enabled to show on the homepage. */
export const SECTION_FEATURE_GATE: Partial<Record<SectionType, FeatureFlagKey>> = {
  auctions: "auctions",
  "pre-orders": "preOrders",
  events: "events",
  "event-raffles": "events",
  "prize-draws": "events",
  "blog-articles": "blog",
};

/**
 * Drop sections whose feature flag is off.
 *
 * A section type with no gate entry always passes, and a MISSING flag value
 * counts as enabled (`!== false`) — the flags map is partial, and a section
 * must not vanish just because an admin has never opened Site Settings.
 */
export function filterSectionsByFeatureFlags<T extends { type: string }>(
  sections: readonly T[],
  // Not `Partial<Record<FeatureFlagKey, boolean>>`: two of the flag keys
  // (`listingTypes`, `categoryTypes`) hold nested per-type objects rather than
  // booleans. Neither is a gate key, so the `=== false` test below simply
  // never fires for them.
  flags: Partial<Record<FeatureFlagKey, unknown>> | null | undefined,
): T[] {
  if (!flags) return [...sections];
  return sections.filter((section) => {
    const flagKey = SECTION_FEATURE_GATE[section.type as SectionType];
    return !flagKey || flags[flagKey] !== false;
  });
}
