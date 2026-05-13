"use client";
import React, { useState } from "react";
import { CategoryProductsListing } from "./CategoryProductsListing";
import { AuctionsIndexListing } from "../../products/components/AuctionsIndexListing";
import { PreOrdersIndexListing } from "../../pre-orders/components/PreOrdersIndexListing";
import { PrizeDrawsIndexListing } from "../../products/components/PrizeDrawsIndexListing";
import { BundlesByCategoryListing } from "../../bundles/components/BundlesByCategoryListing";
import { CATEGORY_PAGE_TABS, type CategoryTabId } from "../../products/constants/listing-tabs";
import type { BundleDocument } from "../../bundles/schemas/firestore";

function tabLabel(label: string, count?: number) {
  if (!count) return label;
  return `${label} (${count.toLocaleString()})`;
}

export interface BrandDetailTabsProps {
  brandName: string;
  initialProductsData?: any;
  initialBundles?: BundleDocument[];
  counts?: {
    products?: number;
    auctions?: number;
    preOrders?: number;
    prizeDraws?: number;
    bundles?: number;
  };
}

export function BrandDetailTabs({
  brandName,
  initialProductsData,
  initialBundles = [],
  counts,
}: BrandDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<CategoryTabId>("products");

  const countFor = (id: CategoryTabId): number | undefined => {
    switch (id) {
      case "products":
        return counts?.products;
      case "auctions":
        return counts?.auctions;
      case "pre-orders":
        return counts?.preOrders;
      case "prize-draws":
        return counts?.prizeDraws;
      case "bundles":
        return counts?.bundles;
      default:
        return undefined;
    }
  };

  return (
    <div>
      <div className="flex border-b border-zinc-200 dark:border-slate-700 mb-6 overflow-x-auto">
        {CATEGORY_PAGE_TABS.map((t) => (
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
      </div>

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
        <BundlesByCategoryListing
          initialBundles={initialBundles}
          brandName={brandName}
        />
      )}
    </div>
  );
}
