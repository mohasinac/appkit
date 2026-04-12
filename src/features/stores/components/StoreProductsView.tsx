"use client";

import React from "react";
import { Div, Heading, Row, Text } from "@mohasinac/ui";
import type { StoreProductItem } from "../types";

export interface StoreProductsViewProps {
  storeSlug: string;
  labels?: {
    title?: string;
    emptyTitle?: string;
    emptyDescription?: string;
  };
  /** Render the products (grid / list) */
  renderProducts: (
    items: StoreProductItem[],
    isLoading: boolean,
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
  /** Render filter panel */
  renderFilters?: () => React.ReactNode;
  /** Render active filter chips */
  renderActiveFilters?: () => React.ReactNode;
  /** Render view mode toggle */
  renderViewToggle?: (
    mode: string,
    onToggle: (m: string) => void,
  ) => React.ReactNode;
  /** Render pagination */
  renderPagination?: (total: number) => React.ReactNode;
  /** Raw product data — use this when you handle fetching externally */
  items?: StoreProductItem[];
  total?: number;
  isLoading?: boolean;
  className?: string;
}

export function StoreProductsView({
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
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("-createdAt");
  const [viewMode, setViewMode] = React.useState("grid");

  return (
    <Div className={`py-4 ${className}`}>
      {labels.title && (
        <Heading level={2} className="text-xl font-semibold mb-4">
          {labels.title}
        </Heading>
      )}

      {/* Toolbar */}
      <Row wrap gap="3" className="mb-4">
        {renderSearch?.(search, setSearch)}
        {renderSort?.(sort, setSort)}
        {renderFilters?.()}
        {renderViewToggle?.(viewMode, setViewMode)}
      </Row>

      {/* Active filters */}
      {renderActiveFilters?.()}

      {/* Products */}
      {renderProducts(items, isLoading)}

      {/* Pagination */}
      {renderPagination?.(total)}
    </Div>
  );
}
