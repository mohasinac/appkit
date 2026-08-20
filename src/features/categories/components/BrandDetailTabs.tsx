"use client";
import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "../../../ui";
import { CategoryProductsListing } from "./CategoryProductsListing";
import { AuctionsIndexListing } from "../../products/components/AuctionsIndexListing";
import { PreOrdersIndexListing } from "../../pre-orders/components/PreOrdersIndexListing";
import { PrizeDrawsIndexListing } from "../../products/components/PrizeDrawsIndexListing";
import { CategoryBundlesListing } from "./CategoryBundlesListing";
import { CATEGORY_PAGE_TABS, type CategoryTabId } from "../../products/constants/listing-tabs";
import type { CategoryDocument } from "../schemas";

const TAB_TYPE_MAP: Record<string, { kind: "listing" | "category"; type: string }> = {
  products: { kind: "listing", type: "standard" },
  auctions: { kind: "listing", type: "auction" },
  "pre-orders": { kind: "listing", type: "pre-order" },
  "prize-draws": { kind: "listing", type: "prize-draw" },
  bundles: { kind: "category", type: "bundle" },
};

export interface BrandDetailTabsProps {
  brandName: string;
  initialProductsData?: any;
  initialBundles?: CategoryDocument[];
  counts?: {
    products?: number;
    auctions?: number;
    preOrders?: number;
    prizeDraws?: number;
    bundles?: number;
  };
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
  enabledListingTypes,
  enabledCategoryTypes,
}: BrandDetailTabsProps) {
  const countFor = (id: CategoryTabId): number | undefined => {
    switch (id) {
      case "products": return counts?.products;
      case "auctions": return counts?.auctions;
      case "pre-orders": return counts?.preOrders;
      case "prize-draws": return counts?.prizeDraws;
      case "bundles": return counts?.bundles;
      default: return undefined;
    }
  };

  const visibleTabs = CATEGORY_PAGE_TABS.filter((t) => {
    const mapping = TAB_TYPE_MAP[t.id];
    // This view only has content renderers for the 5 tab ids in
    // TAB_TYPE_MAP (products/auctions/pre-orders/prize-draws/bundles) — any
    // other CATEGORY_PAGE_TABS id (stores, classifieds, etc.) has no case in
    // the render switch below and would show a blank tab, so exclude those
    // here rather than rely on downstream JSX to silently render nothing.
    if (!mapping) return false;
    if (mapping.kind === "listing" && enabledListingTypes) {
      if (!enabledListingTypes.includes(mapping.type)) return false;
    }
    if (mapping.kind === "category" && enabledCategoryTypes) {
      if (!enabledCategoryTypes.includes(mapping.type)) return false;
    }
    // Hide a tab only when its count is known and explicitly zero.
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
          categorySlug=""
          brandName={brandName}
          initialData={initialProductsData}
        />
      )}
      {activeTab === "auctions" && (
        <AuctionsIndexListing brandName={brandName} />
      )}
      {activeTab === "pre-orders" && (
        <PreOrdersIndexListing brandName={brandName} />
      )}
      {activeTab === "prize-draws" && (
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
