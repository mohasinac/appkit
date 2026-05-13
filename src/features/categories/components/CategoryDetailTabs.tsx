"use client";
import React, { useState } from "react";
import { CategoryProductsListing } from "./CategoryProductsListing";
import { AuctionsIndexListing } from "../../products/components/AuctionsIndexListing";
import { PreOrdersIndexListing } from "../../pre-orders/components/PreOrdersIndexListing";
import { PrizeDrawsIndexListing } from "../../products/components/PrizeDrawsIndexListing";

type TabId = "products" | "auctions" | "pre-orders" | "prize-draws";

function tabLabel(label: string, count?: number) {
  if (!count) return label;
  return `${label} (${count.toLocaleString()})`;
}

export interface CategoryDetailTabsProps {
  categorySlug: string;
  categoryId?: string;
  initialProductsData?: any;
  counts?: {
    products?: number;
    auctions?: number;
    preOrders?: number;
    prizeDraws?: number;
  };
}

export function CategoryDetailTabs({ categorySlug, categoryId, initialProductsData, counts }: CategoryDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("products");

  const TABS: { id: TabId; label: string }[] = [
    { id: "products", label: tabLabel("Products", counts?.products) },
    { id: "auctions", label: tabLabel("Auctions", counts?.auctions) },
    { id: "pre-orders", label: tabLabel("Pre-Orders", counts?.preOrders) },
    { id: "prize-draws", label: tabLabel("Prize Draws", counts?.prizeDraws) },
  ];

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
      {activeTab === "prize-draws" && (
        <PrizeDrawsIndexListing categorySlug={categorySlug} />
      )}
    </div>
  );
}
