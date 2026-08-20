"use client";
import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "../../../ui";
import { CategoryProductsListing } from "./CategoryProductsListing";
import { AuctionsIndexListing } from "../../products/components/AuctionsIndexListing";
import { PreOrdersIndexListing } from "../../pre-orders/components/PreOrdersIndexListing";
import { PrizeDrawsIndexListing } from "../../products/components/PrizeDrawsIndexListing";
import { CategoryBundlesListing } from "./CategoryBundlesListing";
import { CategoryStoresListing } from "./CategoryStoresListing";
import { CATEGORY_PAGE_TABS, type CategoryTabId } from "../../products/constants/listing-tabs";
import type { CategoryDocument } from "../schemas";
import type { StoreListItem } from "../../stores/types";

/** Maps CATEGORY_PAGE_TABS id → listing type / category type key for flag filtering. */
const TAB_TYPE_MAP: Record<string, { kind: "listing" | "category" | "entity"; type: string }> = {
  products: { kind: "listing", type: "standard" },
  auctions: { kind: "listing", type: "auction" },
  "pre-orders": { kind: "listing", type: "pre-order" },
  "prize-draws": { kind: "listing", type: "prize-draw" },
  bundles: { kind: "category", type: "bundle" },
  stores: { kind: "entity", type: "stores" },
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

      {activeTab === "products" && (
        <CategoryProductsListing
          categorySlug={categorySlug}
          categoryId={categoryId}
          initialData={initialProductsData}
        />
      )}
      {activeTab === "auctions" && (
        <AuctionsIndexListing categorySlug={categorySlug} />
      )}
      {activeTab === "pre-orders" && (
        <PreOrdersIndexListing categorySlug={categorySlug} />
      )}
      {activeTab === "prize-draws" && (
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
