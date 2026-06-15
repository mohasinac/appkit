"use client"
import { sortBy } from "@mohasinac/appkit";
import React from "react";
import { Div, Heading, Row, Text } from "../../../ui";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useWishlist } from "../hooks/useWishlist";
import type { WishlistItem, WishlistResponse } from "../types";

export type WishlistTab = "products" | "auctions" | "categories" | "stores";

export interface WishlistViewProps {
  userId?: string;
  initialData?: WishlistResponse;
  labels?: {
    title?: string;
    subtitle?: string;
    emptyTitle?: string;
    emptyDescription?: string;
  };
  renderTabs?: (
    activeTab: WishlistTab,
    onTabChange: (tab: WishlistTab) => void,
  ) => React.ReactNode;
  renderSearch?: (
    value: string,
    onChange: (v: string) => void,
  ) => React.ReactNode;
  renderSort?: (
    value: string,
    onChange: (v: string) => void,
  ) => React.ReactNode;
  renderViewToggle?: (
    mode: string,
    onToggle: (m: string) => void,
  ) => React.ReactNode;
  renderProducts?: (
    items: WishlistItem[],
    isLoading: boolean,
  ) => React.ReactNode;
  renderTabPlaceholder?: (tab: WishlistTab) => React.ReactNode;
  renderBulkActions?: (
    selectedIds: string[],
    onClearSelection: () => void,
  ) => React.ReactNode;
  renderPagination?: (total: number) => React.ReactNode;
  className?: string;
}

const WISHLIST_SORT_OPTIONS = [
  { value: sortBy("addedAt", "DESC"), label: "Newest first" },
  { value: "addedAt", label: "Oldest first" },
  { value: sortBy("price", "DESC"), label: "Price: high → low" },
  { value: sortBy("price", "ASC"), label: "Price: low → high" },
];

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
  const table = useUrlTable({ defaults: { sort: "-addedAt", view: "card" } });
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const activeTab = (table.get("tab") as WishlistTab) || "products";
  const search = table.get("q");
  const sort = table.get("sort") || "-addedAt";
  const viewMode = table.get("view") || "card";

  const { items, total, isLoading } = useWishlist(userId ?? "", { initialData });

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
      <Div className="px-4 max-w-screen-xl mx-auto" padding="y-xl">
        {/* Header */}
        <Heading level={1} className="mb-1" size="2xl" weight="bold">
          {labels.title ?? "My Wishlist"}
        </Heading>
        {total > 0 && (
          <Text variant="secondary" className="mb-4">
            {labels.subtitle ?? `${total} saved items`}
          </Text>
        )}

        {/* Tabs */}
        {renderTabs?.(activeTab, (tab) => table.set("tab", tab))}

        {/* Toolbar: search + sort + view toggle */}
        {activeTab === "products" && (
          <Row wrap gap="3" className="mb-4">
            {renderSearch?.(search, (v) => table.set("q", v))}
            {renderSort?.(sort, (v) => table.set("sort", v))}
            {renderViewToggle?.(viewMode, (m) => table.set("view", m))}
          </Row>
        )}

        {/* Bulk actions */}
        {selectedIds.length > 0 &&
          renderBulkActions?.(selectedIds, () => setSelectedIds([]))}

        {/* Content */}
        {activeTab === "products"
          ? renderProducts?.(displayedItems, isLoading)
          : (renderTabPlaceholder?.(activeTab) ?? (
              <Div className="text-center" padding="y-4xl">
                <Text variant="secondary">Coming soon</Text>
              </Div>
            ))}

        {/* Pagination */}
        {renderPagination?.(total)}
      </Div>
    </Div>
  );
}
