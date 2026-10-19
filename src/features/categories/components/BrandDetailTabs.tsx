"use client";
import React, { useState } from "react";
import { EmptyState, Tabs, TabsList, TabsTrigger } from "../../../ui";
import { AvailabilityScopeHint } from "../../products/components/AvailabilityScopeHint";
import type { ListingType } from "../../products/types/index";
import { CategoryProductsListing } from "./CategoryProductsListing";
import { AuctionsIndexListing } from "../../products/components/AuctionsIndexListing";
import { PreOrdersIndexListing } from "../../pre-orders/components/PreOrdersIndexListing";
import { PrizeDrawsIndexListing } from "../../products/components/PrizeDrawsIndexListing";
import { CategoryBundlesListing } from "./CategoryBundlesListing";
import {
  CATEGORY_PAGE_TABS,
  ART_STICKERS_LISTING_TYPES,
  type CategoryTabId,
} from "../../products/constants/listing-tabs";
import { ALL_LISTING_TYPES } from "../../../_internal/shared/listing-types/feature-flags";
import { pluginFor } from "../../../_internal/shared/listing-types/_registry";
import type { CategoryDocument } from "../schemas";

/**
 * Tab slug → listing/category type, derived (2026-08-21). The hand-written
 * version covered 5 of 10 tabs, and this view's filter did `if (!mapping)
 * return false` — so classifieds, digital codes, live items and art were
 * silently DROPPED from every brand page rather than rendering blank (the
 * failure mode its category-page twin had). Same root gap, opposite symptom.
 *
 * `stores` is intentionally absent: a brand has no store roster, which is the
 * one real difference between this component and CategoryDetailTabs (see
 * CLAUDE.md's Categories & Brands Reference on why the duplication stands).
 */
const TAB_TYPE_MAP: Record<string, { kind: "listing" | "category"; type: string }> = {
  ...Object.fromEntries(
    ALL_LISTING_TYPES.map((type) => [
      pluginFor(type).tabSlug,
      { kind: "listing" as const, type },
    ]),
  ),
  bundles: { kind: "category", type: "bundle" },
};

/**
 * The listing types a tab spans, for the availability-scope hint. Derived
 * from the same maps the tabs render from, never hand-written (Root Cause
 * #61).
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
  [pluginFor("art").tabSlug]: ART_STICKERS_LISTING_TYPES,
  /*
   * Spares render generically — a product grid is the whole story, unlike an
   * auction (countdown, bid history) or a prize draw (entries remaining).
   *
   * 🛑 Hand-written map; a missing entry is a tab you can CLICK that renders an
   * empty panel. `audit-tab-body-coverage` exists for exactly this, after this
   * file silently DROPPED four types while its `CategoryDetailTabs` twin
   * rendered them as blank panels — two spellings of one gap.
   */
  [pluginFor("spares").tabSlug]: ["spares"],
};

export interface BrandDetailTabsProps {
  brandName: string;
  initialProductsData?: any;
  initialBundles?: CategoryDocument[];
  /**
   * tabSlug -> row count. `undefined` means the count could not be resolved,
   * NOT zero — such a tab stays visible so a failed query can never hide real
   * inventory (Root Cause #59). Keyed by tab id; the previous hand-named shape
   * covered only 5 of 9 tabs (Root Cause #61).
   */
  /** Badge counts — what the default (available) scope will render. */
  counts?: Record<string, number | undefined>;
  /**
   * Every published row per tab, all availability scopes. Drives hide-at-zero
   * and the "N ended — show all" hint; see `ListingTabCountResult`.
   */
  totals?: Record<string, number | undefined>;
  /** Enabled listing types (e.g. ["standard","auction"]). When omitted, all tabs shown. */
  enabledListingTypes?: string[];
  /** Enabled category types (e.g. ["category","brand","bundle"]). When omitted, all tabs shown. */
  enabledCategoryTypes?: string[];
}

export function BrandDetailTabs({
  brandName,
  initialProductsData,
  initialBundles = [],
  counts,
  totals,
  enabledListingTypes,
  enabledCategoryTypes,
}: BrandDetailTabsProps) {
  const countFor = (id: CategoryTabId): number | undefined => counts?.[id];
  const totalFor = (id: CategoryTabId): number | undefined =>
    totals?.[id] ?? counts?.[id];

  const visibleTabs = CATEGORY_PAGE_TABS.filter((t) => {
    const mapping = TAB_TYPE_MAP[t.id];
    // A tab with no mapping has no render branch below and would show a blank
    // panel, so drop it here rather than let downstream JSX render nothing.
    // Today that's only `stores` — a brand has no store roster. Every listing
    // type IS mapped now (it used to also silently drop four real types).
    if (!mapping) return false;
    if (mapping.kind === "listing" && enabledListingTypes) {
      if (!enabledListingTypes.includes(mapping.type)) return false;
    }
    if (mapping.kind === "category" && enabledCategoryTypes) {
      if (!enabledCategoryTypes.includes(mapping.type)) return false;
    }
    // Hide a tab only when its count is known and explicitly zero. `undefined`
    // now means the count query FAILED (every tab is counted), so the tab stays
    // visible rather than hiding real listings behind a swallowed error.
    // TOTAL, not the badge — see the same note in CategoryDetailTabs.
    const count = totalFor(t.id as CategoryTabId);
    return count === undefined || count > 0;
  });

  const firstTabId = (visibleTabs[0]?.id ?? "products") as CategoryTabId;
  const [activeTab, setActiveTab] = useState<CategoryTabId>(firstTabId);

  if (visibleTabs.length === 0) {
    return (
      <EmptyState
        title="Nothing listed here yet"
        description="This brand has no active listings right now. Check back soon."
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

      {/* See the note on the same element in CategoryDetailTabs — only this
          level holds both the badge and the total. */}
      <AvailabilityScopeHint
        total={totalFor(activeTab)}
        available={countFor(activeTab)}
        types={typesForTab(activeTab)}
      />

      {GENERIC_TAB_LISTING_TYPES[activeTab] && (
        <CategoryProductsListing
          categorySlug=""
          brandName={brandName}
          listingTypes={GENERIC_TAB_LISTING_TYPES[activeTab]}
          initialData={activeTab === pluginFor("standard").tabSlug ? initialProductsData : undefined}
        />
      )}
      {activeTab === pluginFor("auction").tabSlug && (
        <AuctionsIndexListing brandName={brandName} />
      )}
      {activeTab === pluginFor("pre-order").tabSlug && (
        <PreOrdersIndexListing brandName={brandName} />
      )}
      {activeTab === pluginFor("prize-draw").tabSlug && (
        <PrizeDrawsIndexListing brandName={brandName} />
      )}
      {activeTab === "bundles" && (
        <CategoryBundlesListing
          initialBundles={initialBundles}
          brandName={brandName}
        />
      )}
    </>
  );
}
