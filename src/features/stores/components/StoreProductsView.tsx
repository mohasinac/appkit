"use client"
import { useState } from "react";
import type { ReactNode } from "react";
import { Div, Heading, Input, Select, SlottedListingView } from "../../../ui";
import type { StoreProductItem } from "../types";

export interface StoreProductsViewProps {
  storeSlug: string;
  labels?: {
    title?: string;
    emptyTitle?: string;
    emptyDescription?: string;
  };
  /** Render the products area (grid or list). */
  renderProducts: (items: StoreProductItem[], isLoading: boolean) => ReactNode;
  /** Render search input. */
  renderSearch?: (value: string, onChange: (v: string) => void) => ReactNode;
  /** Render sort dropdown. */
  renderSort?: (value: string, onChange: (v: string) => void) => ReactNode;
  /** Render filter panel. */
  renderFilters?: () => ReactNode;
  /** Render active filter chips. */
  renderActiveFilters?: () => ReactNode;
  /** Render view mode toggle. */
  renderViewToggle?: (mode: string, onToggle: (m: string) => void) => ReactNode;
  /** Render pagination controls. */
  renderPagination?: (total: number) => ReactNode;
  /** Raw product data when fetching is handled externally. */
  items?: StoreProductItem[];
  total?: number;
  isLoading?: boolean;
  className?: string;
}

export function StoreProductsView({
  storeSlug,
  labels = {},
  renderProducts,
  renderSearch,
  renderSort,
  renderFilters,
  renderActiveFilters,
  renderViewToggle,
  renderPagination,
  items = [],
  total = 0,
  isLoading = false,
  className = "",
}: StoreProductsViewProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("-createdAt");
  const [viewMode, setViewMode] = useState("grid");

  void storeSlug;

  return (
    <Div className={`py-4 ${className}`}>
      <SlottedListingView
        portal="public"
        inlineToolbar
        className="space-y-4"
        renderHeader={() =>
          labels.title ? (
            <Heading level={2} className="mb-1 text-xl font-semibold">
              {labels.title}
            </Heading>
          ) : null
        }
        renderSearch={() =>
          renderSearch?.(search, setSearch) ?? (
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search store products"
              className="max-w-sm"
            />
          )
        }
        renderSort={() =>
          renderSort?.(sort, setSort) ?? (
            <Select
              value={sort}
              onValueChange={setSort}
              options={[
                { value: "-createdAt", label: "Newest" },
                { value: "createdAt", label: "Oldest" },
                { value: "price", label: "Price: Low to High" },
                { value: "-price", label: "Price: High to Low" },
              ]}
              className="min-w-44"
            />
          )
        }
        renderFilters={renderFilters}
        renderActiveFilters={renderActiveFilters}
        renderBulkActions={() => renderViewToggle?.(viewMode, setViewMode) ?? null}
        renderTable={() => renderProducts(items, isLoading)}
        renderPagination={() => renderPagination?.(total) ?? null}
        total={total}
        isLoading={isLoading}
      />
    </Div>
  );
}
