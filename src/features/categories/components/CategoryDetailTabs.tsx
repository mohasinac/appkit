"use client";
import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "../../../ui";
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

/** Listing types rendered by the shared products listing rather than a dedicated one. */
const GENERIC_TAB_LISTING_TYPES: Record<string, readonly string[]> = {
  [pluginFor("standard").tabSlug]: ["standard"],
  [pluginFor("classified").tabSlug]: ["classified"],
  [pluginFor("digital-code").tabSlug]: ["digital-code"],
  [pluginFor("live").tabSlug]: ["live"],
  // The combined Art & Stickers tab spans both types under the `art` slug.
  [pluginFor("art").tabSlug]: ART_STICKERS_LISTING_TYPES,
};

export interface CategoryDetailTabsProps {
  categorySlug: string;
  categoryId?: string;
  initialProductsData?: any;
  initialBundles?: CategoryDocument[];
  initialStores?: StoreListItem[];
  counts?: {
    products?: number;
    auctions?: number;
    preOrders?: number;
    prizeDraws?: number;
    bundles?: number;
    stores?: number;
  };
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
  enabledListingTypes,
  enabledCategoryTypes,
}: CategoryDetailTabsProps) {
  const countFor = (id: CategoryTabId): number | undefined => {
    switch (id) {
      case "products": return counts?.products;
      case "auctions": return counts?.auctions;
      case "pre-orders": return counts?.preOrders;
      case "prize-draws": return counts?.prizeDraws;
      case "bundles": return counts?.bundles;
      case "stores": return counts?.stores;
      default: return undefined;
    }
  };

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
    // Hide a tab only when its count is known and explicitly zero — a tab
    // whose count was never fetched (undefined) stays visible so we don't
    // silently hide a listing type this page hasn't wired count-tracking
    // for yet.
    const count = countFor(t.id as CategoryTabId);
    return count === undefined || count > 0;
  });

  const firstTabId = (visibleTabs[0]?.id ?? "products") as CategoryTabId;
  const [activeTab, setActiveTab] = useState<CategoryTabId>(firstTabId);

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
