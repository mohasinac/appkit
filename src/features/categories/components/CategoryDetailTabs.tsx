"use client";
import React, { useState } from "react";
import { Div } from "../../../ui";
import { CategoryProductsListing } from "./CategoryProductsListing";
import { AuctionsIndexListing } from "../../products/components/AuctionsIndexListing";
import { PreOrdersIndexListing } from "../../pre-orders/components/PreOrdersIndexListing";
import { PrizeDrawsIndexListing } from "../../products/components/PrizeDrawsIndexListing";
import { CategoryBundlesListing } from "./CategoryBundlesListing";
import { CategoryStoresListing } from "./CategoryStoresListing";
import { CATEGORY_PAGE_TABS, type CategoryTabId } from "../../products/constants/listing-tabs";
import type { CategoryDocument } from "../schemas";
import type { StoreListItem } from "../../stores/types";

function tabLabel(label: string, count?: number) {
  if (!count) return label;
  return `${label} (${count.toLocaleString()})`;
}

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
  const visibleTabs = CATEGORY_PAGE_TABS.filter((t) => {
    const mapping = TAB_TYPE_MAP[t.id];
    if (!mapping) return true;
    if (mapping.kind === "listing" && enabledListingTypes) {
      return enabledListingTypes.includes(mapping.type);
    }
    if (mapping.kind === "category" && enabledCategoryTypes) {
      return enabledCategoryTypes.includes(mapping.type);
    }
    if (mapping.kind === "entity") return true;
    return true;
  });

  const firstTabId = (visibleTabs[0]?.id ?? "products") as CategoryTabId;
  const [activeTab, setActiveTab] = useState<CategoryTabId>(firstTabId);

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

  return (
    <>
      <Div className="flex border-b border-zinc-200 dark:border-slate-700 mb-6 overflow-x-auto">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as CategoryTabId)}
            className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors -mb-px border-b-2 ${
              activeTab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            {tabLabel(t.label, countFor(t.id as CategoryTabId))}
          </button>
        ))}
      </Div>

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
