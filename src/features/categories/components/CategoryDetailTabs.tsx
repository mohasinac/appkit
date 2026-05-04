"use client";
import React, { useState } from "react";
import { CategoryProductsListing } from "./CategoryProductsListing";
import { AuctionsIndexListing } from "../../products/components/AuctionsIndexListing";
import { PreOrdersIndexListing } from "../../pre-orders/components/PreOrdersIndexListing";

type TabId = "products" | "auctions" | "pre-orders";

const TABS: { id: TabId; label: string }[] = [
  { id: "products", label: "Products" },
  { id: "auctions", label: "Auctions" },
  { id: "pre-orders", label: "Pre-Orders" },
];

export interface CategoryDetailTabsProps {
  categorySlug: string;
  categoryId?: string;
  initialProductsData?: any;
}

export function CategoryDetailTabs({ categorySlug, categoryId, initialProductsData }: CategoryDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("products");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-zinc-200 dark:border-slate-700 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2 ${
              activeTab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab panels — unmount/remount on tab switch keeps URL state isolated */}
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
    </div>
  );
}
