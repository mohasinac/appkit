"use client";

import React from "react";
import { Div, Heading, Text } from "@mohasinac/ui";
import { useWishlist } from "../hooks/useWishlist";
import type { WishlistItem, WishlistResponse } from "../types";

export type WishlistTab = "products" | "auctions" | "categories" | "stores";

export interface WishlistViewProps {
  /** Authenticated user id — required to fetch wishlist */
  userId: string;
  /** Optional initial SSR data */
  initialData?: WishlistResponse;
  labels?: {
    title?: string;
    subtitle?: string;
    emptyTitle?: string;
    emptyDescription?: string;
  };
  /** Render tab bar (receives active tab and setter) */
  renderTabs?: (
    activeTab: WishlistTab,
    onTabChange: (tab: WishlistTab) => void,
  ) => React.ReactNode;
  /** Render search input */
  renderSearch?: (
    value: string,
    onChange: (v: string) => void,
  ) => React.ReactNode;
  /** Render sort dropdown */
  renderSort?: (
    value: string,
    onChange: (v: string) => void,
  ) => React.ReactNode;
  /** Render view mode toggle */
  renderViewToggle?: (
    mode: string,
    onToggle: (m: string) => void,
  ) => React.ReactNode;
  /** Render the products grid */
  renderProducts: (
    items: WishlistItem[],
    isLoading: boolean,
  ) => React.ReactNode;
  /** Render coming-soon placeholder for non-products tabs */
  renderTabPlaceholder?: (tab: WishlistTab) => React.ReactNode;
  /** Render bulk action bar */
  renderBulkActions?: (
    selectedIds: string[],
    onClearSelection: () => void,
  ) => React.ReactNode;
  /** Render pagination */
  renderPagination?: (total: number) => React.ReactNode;
  className?: string;
}

export function WishlistView({
  userId,
  initialData,
  labels = {},
  renderTabs,
  renderSearch,
  renderSort,
  renderViewToggle,
  renderProducts,
  renderTabPlaceholder,
  renderBulkActions,
  renderPagination,
  className = "",
}: WishlistViewProps) {
  const [activeTab, setActiveTab] = React.useState<WishlistTab>("products");
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("-addedAt");
  const [viewMode, setViewMode] = React.useState("card");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const { items, total, isLoading } = useWishlist(userId, { initialData });

  // Client-side filter + sort for products tab
  const displayedItems = React.useMemo(() => {
    if (activeTab !== "products") return [];
    let result = [...items];
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (i) =>
          (i.productTitle ?? "").toLowerCase().includes(q) ||
          (i.productSlug ?? "").toLowerCase().includes(q),
      );
    }
    result.sort((a, b) => {
      const desc = sort.startsWith("-");
      const field = desc ? sort.slice(1) : sort;
      if (field === "price") {
        const av = a.productPrice ?? 0;
        const bv = b.productPrice ?? 0;
        return desc ? bv - av : av - bv;
      }
      const av = new Date(a.addedAt ?? "").getTime();
      const bv = new Date(b.addedAt ?? "").getTime();
      return desc ? bv - av : av - bv;
    });
    return result;
  }, [items, activeTab, search, sort]);

  return (
    <Div className={`min-h-screen ${className}`}>
      <Div className="py-8 px-4 max-w-screen-xl mx-auto">
        {/* Header */}
        <Heading level={1} className="text-2xl font-bold mb-1">
          {labels.title ?? "My Wishlist"}
        </Heading>
        {total > 0 && (
          <Text variant="secondary" className="mb-4">
            {labels.subtitle ?? `${total} saved items`}
          </Text>
        )}

        {/* Tabs */}
        {renderTabs?.(activeTab, setActiveTab)}

        {/* Toolbar: search + sort + view toggle */}
        {activeTab === "products" && (
          <Div className="flex flex-wrap items-center gap-3 mb-4">
            {renderSearch?.(search, setSearch)}
            {renderSort?.(sort, setSort)}
            {renderViewToggle?.(viewMode, setViewMode)}
          </Div>
        )}

        {/* Bulk actions */}
        {selectedIds.length > 0 &&
          renderBulkActions?.(selectedIds, () => setSelectedIds([]))}

        {/* Content */}
        {activeTab === "products"
          ? renderProducts(displayedItems, isLoading)
          : (renderTabPlaceholder?.(activeTab) ?? (
              <Div className="py-16 text-center">
                <Text variant="secondary">Coming soon</Text>
              </Div>
            ))}

        {/* Pagination */}
        {renderPagination?.(total)}
      </Div>
    </Div>
  );
}
