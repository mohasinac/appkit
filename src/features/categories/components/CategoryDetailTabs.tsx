"use client";
import React, { useState } from "react";
import { EmptyState } from "../../../ui/components/EmptyState";
import { Tabs, TabsList, TabsTrigger } from "../../../ui/components/Tabs";
import { AvailabilityScopeHint } from "../../products/components/AvailabilityScopeHint";
import type { ListingType } from "../../products/types/index";
import { CategoryProductsListing } from "./CategoryProductsListing";
import { AuctionsIndexListing } from "../../products/components/AuctionsIndexListing";
import { PreOrdersIndexListing } from "../../pre-orders/components/PreOrdersIndexListing";
import { PrizeDrawsIndexListing } from "../../products/components/PrizeDrawsIndexListing";
import { CategoryBundlesListing } from "./CategoryBundlesListing";
import { CategoryStoresListing } from "./CategoryStoresListing";
import {
  CATEGORY_PAGE_TABS,
  ART_STICKERS_LISTING_TYPES,
  type CategoryTabId,
} from "../../products/constants/listing-tabs";
import { ALL_LISTING_TYPES } from "../../../_internal/shared/listing-types/feature-flags";
import { pluginFor } from "../../../_internal/shared/listing-types/_registry";
import type { CategoryDocument } from "../schemas";
import type { StoreListItem } from "../../stores/types";

/**
 * Maps CATEGORY_PAGE_TABS id (a `tabSlug`) → listing type / category type key
 * for feature-flag filtering.
 *
 * The listing-type half is DERIVED (2026-08-21). It used to be hand-written
 * and covered only 6 of the 10 tabs — `classifieds`, `digital-codes`, `live`
 * and `art` had no entry, so they skipped the flag check entirely AND (worse)
 * had no render branch below, meaning all four rendered a tab you could click
 * that showed an empty page.
 */
const TAB_TYPE_MAP: Record<string, { kind: "listing" | "category" | "entity"; type: string }> = {
  ...Object.fromEntries(
    ALL_LISTING_TYPES.map((type) => [
      pluginFor(type).tabSlug,
      { kind: "listing" as const, type },
    ]),
  ),
  bundles: { kind: "category", type: "bundle" },
  stores: { kind: "entity", type: "stores" },
};

/**
 * The listing types a tab spans, for the availability-scope hint.
 *
 * Derived from `TAB_TYPE_MAP` rather than hand-written: that map is already
 * built from `ALL_LISTING_TYPES`, so a tenth type is covered without a second
 * enumeration (Root Cause #61). The combined Art & Stickers tab is the one
 * entry that spans two, and `GENERIC_TAB_LISTING_TYPES` already says so.
 */
function typesForTab(id: string): ListingType[] {
  const generic = GENERIC_TAB_LISTING_TYPES[id];
  if (generic) return generic as ListingType[];
  const mapping = TAB_TYPE_MAP[id];
  return mapping?.kind === "listing" ? [mapping.type as ListingType] : [];
}

/** Listing types rendered by the shared products listing rather than a dedicated one. */
const GENERIC_TAB_LISTING_TYPES: Record<string, readonly string[]> = {
  [pluginFor("standard").tabSlug]: ["standard"],
  [pluginFor("classified").tabSlug]: ["classified"],
  [pluginFor("digital-code").tabSlug]: ["digital-code"],
  [pluginFor("live").tabSlug]: ["live"],
  // The combined Art & Stickers tab spans both types under the `art` slug.
  [pluginFor("art").tabSlug]: ART_STICKERS_LISTING_TYPES,
  /*
   * Spares render generically — there is nothing type-specific to show beyond
   * a product grid, unlike an auction (countdown, bid history) or a prize draw
   * (entries remaining).
   *
   * 🛑 This map is hand-written and a missing entry is a tab you can CLICK that
   * renders an empty panel. It is covered — `audit-tab-body-coverage` exists
   * for precisely this, after `CategoryDetailTabs` showed a blank panel for
   * four types while `BrandDetailTabs` silently dropped the same four — so the
   * eleventh type will be caught rather than discovered.
   */
  [pluginFor("spares").tabSlug]: ["spares"],
};

export interface CategoryDetailTabsProps {
  categorySlug: string;
  categoryId?: string;
  initialProductsData?: any;
  initialBundles?: CategoryDocument[];
  initialStores?: StoreListItem[];
  /**
   * tabSlug -> row count. `undefined` means the count could not be resolved,
   * NOT zero — such a tab stays visible so a failed query can never hide real
   * inventory (Root Cause #59).
   *
   * Keyed by tab id rather than by hand-named properties: the previous shape
   * named only 6 of the 10 tabs, so classifieds / digital-codes / live / art
   * were structurally uncountable and could never hide (Root Cause #61).
   */
  counts?: Record<string, number | undefined>;
  /**
   * Every published row per tab, all availability scopes. Drives hide-at-zero
   * and the "N ended — show all" hint; see `ListingTabCountResult`. Omitted,
   * it falls back to `counts`, i.e. the pre-split behaviour.
   */
  totals?: Record<string, number | undefined>;
  /** Enabled listing types (e.g. ["standard","auction","pre-order"]). When omitted, all tabs shown. */
  enabledListingTypes?: string[];
  /** Enabled category types (e.g. ["category","brand","bundle"]). When omitted, all tabs shown. */
  enabledCategoryTypes?: string[];
}

export function CategoryDetailTabs({
  categorySlug,
  categoryId,
  initialProductsData,
  initialBundles = [],
  initialStores = [],
  counts,
  totals,
  enabledListingTypes,
  enabledCategoryTypes,
}: CategoryDetailTabsProps) {
  const countFor = (id: CategoryTabId): number | undefined => counts?.[id];
  // Falls back to the badge when no totals map is supplied, so a caller that
  // has not been migrated keeps today's hide behaviour rather than hiding
  // everything.
  const totalFor = (id: CategoryTabId): number | undefined =>
    totals?.[id] ?? counts?.[id];

  const visibleTabs = CATEGORY_PAGE_TABS.filter((t) => {
    const mapping = TAB_TYPE_MAP[t.id];
    if (mapping) {
      if (mapping.kind === "listing" && enabledListingTypes) {
        if (!enabledListingTypes.includes(mapping.type)) return false;
      }
      if (mapping.kind === "category" && enabledCategoryTypes) {
        if (!enabledCategoryTypes.includes(mapping.type)) return false;
      }
    }
    // 🛑 TOTAL, not the badge. The badge counts what the default (available)
    // scope renders, and a tab whose rows have all ended badges 0 while still
    // holding a browsable archive behind the Ended/All scopes — hiding it
    // would strand that archive. `undefined` still means the count query
    // FAILED, so the tab stays visible: an empty tab is a far smaller error
    // than hiding a tab that holds real listings (Root Cause #59).
    const count = totalFor(t.id as CategoryTabId);
    return count === undefined || count > 0;
  });

  const firstTabId = (visibleTabs[0]?.id ?? "products") as CategoryTabId;
  const [activeTab, setActiveTab] = useState<CategoryTabId>(firstTabId);

  // Every tab counted zero — render the empty state rather than an empty tab
  // strip with no body beneath it.
  if (visibleTabs.length === 0) {
    return (
      <EmptyState
        title="Nothing listed here yet"
        description="This category has no active listings right now. Check back soon."
      />
    );
  }

  return (
    <>
      <Tabs value={activeTab} onChange={(v) => setActiveTab(v as CategoryTabId)} className="mb-6">
        <TabsList>
          {visibleTabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id} badge={countFor(t.id as CategoryTabId)}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* One line above whichever panel is open, naming the rows the Available
          scope is withholding. Rendered HERE rather than inside each of the
          four panel components, because only this level holds both numbers —
          and four copies of the rule is how they drift (Root Cause #75). */}
      <AvailabilityScopeHint
        total={totalFor(activeTab)}
        available={countFor(activeTab)}
        types={typesForTab(activeTab)}
      />

      {/* Types with a dedicated listing component (bid ladder, delivery-date
          sorts, entry counters) get it; every other type renders through the
          shared products listing, narrowed by `listingTypes`. */}
      {GENERIC_TAB_LISTING_TYPES[activeTab] && (
        <CategoryProductsListing
          categorySlug={categorySlug}
          categoryId={categoryId}
          listingTypes={GENERIC_TAB_LISTING_TYPES[activeTab]}
          initialData={activeTab === pluginFor("standard").tabSlug ? initialProductsData : undefined}
        />
      )}
      {activeTab === pluginFor("auction").tabSlug && (
        <AuctionsIndexListing categorySlug={categorySlug} />
      )}
      {activeTab === pluginFor("pre-order").tabSlug && (
        <PreOrdersIndexListing categorySlug={categorySlug} />
      )}
      {activeTab === pluginFor("prize-draw").tabSlug && (
        <PrizeDrawsIndexListing categorySlug={categorySlug} />
      )}
      {activeTab === "bundles" && (
        <CategoryBundlesListing initialBundles={initialBundles} />
      )}
      {activeTab === "stores" && (
        <CategoryStoresListing stores={initialStores} />
      )}
    </>
  );
}
