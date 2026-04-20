"use client"
import { useState } from "react";
import type { ReactNode } from "react";
import { Div, Heading, Row } from "../../../ui";
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
      {labels.title && (
        <Heading level={2} className="mb-4 text-xl font-semibold">
          {labels.title}
        </Heading>
      )}

      <Row wrap gap="3" className="mb-4">
        {renderSearch?.(search, setSearch)}
        {renderSort?.(sort, setSort)}
        {renderFilters?.()}
        {renderViewToggle?.(viewMode, setViewMode)}
      </Row>

      {renderActiveFilters?.()}
      {renderProducts(items, isLoading)}
      {renderPagination?.(total)}
    </Div>
  );
}
