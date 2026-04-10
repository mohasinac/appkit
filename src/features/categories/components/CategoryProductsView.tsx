"use client";

import React from "react";
import { Div, Heading, Text } from "@mohasinac/ui";
import type { CategoryItem } from "../types";

export interface CategoryProductsViewProps {
  /** Category slug */
  slug: string;
  /** Initial SSR category data */
  initialCategory?: CategoryItem;
  /** Initial SSR child categories */
  initialChildren?: CategoryItem[];
  labels?: {
    emptyTitle?: string;
    emptyDescription?: string;
  };
  /** Render breadcrumb trail */
  renderBreadcrumbs?: (category: CategoryItem | null) => React.ReactNode;
  /** Render child category chips/tabs */
  renderChildCategories?: (children: CategoryItem[]) => React.ReactNode;
  /** Render filter panel */
  renderFilters?: () => React.ReactNode;
  /** Render active filter chips */
  renderActiveFilters?: () => React.ReactNode;
  /** Render search */
  renderSearch?: (value: string, onChange: (v: string) => void) => React.ReactNode;
  /** Render sort dropdown */
  renderSort?: (value: string, onChange: (v: string) => void) => React.ReactNode;
  /** Render view mode toggle */
  renderViewToggle?: (mode: string, onToggle: (m: string) => void) => React.ReactNode;
  /** Render the products grid */
  renderProducts: (isLoading: boolean) => React.ReactNode;
  /** Render pagination */
  renderPagination?: (total: number) => React.ReactNode;
  /** Provide category (when fetched externally / SSR) */
  category?: CategoryItem | null;
  children?: CategoryItem[];
  total?: number;
  isLoading?: boolean;
  className?: string;
}

export function CategoryProductsView({
  labels = {},
  renderBreadcrumbs,
  renderChildCategories,
  renderFilters,
  renderActiveFilters,
  renderSearch,
  renderSort,
  renderViewToggle,
  renderProducts,
  renderPagination,
  category = null,
  children: childCategories = [],
  total = 0,
  isLoading = false,
  className = "",
}: CategoryProductsViewProps) {
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("-createdAt");
  const [viewMode, setViewMode] = React.useState("grid");

  return (
    <Div className={`min-h-screen ${className}`}>
      <Div className="py-6 px-4 max-w-screen-xl mx-auto space-y-4">
        {/* Breadcrumbs */}
        {category && renderBreadcrumbs?.(category)}

        {/* Category title */}
        {category && (
          <Div>
            <Heading level={1} className="text-2xl font-bold">
              {category.name}
            </Heading>
            {category.description && (
              <Text className="text-neutral-500 mt-1">{category.description}</Text>
            )}
          </Div>
        )}

        {/* Child categories */}
        {childCategories.length > 0 && renderChildCategories?.(childCategories)}

        {/* Toolbar */}
        <Div className="flex flex-wrap items-center gap-3">
          {renderSearch?.(search, setSearch)}
          {renderSort?.(sort, setSort)}
          {renderFilters?.()}
          {renderViewToggle?.(viewMode, setViewMode)}
        </Div>

        {/* Active filters */}
        {renderActiveFilters?.()}

        {/* Products */}
        {renderProducts(isLoading)}

        {/* Pagination */}
        {renderPagination?.(total)}
      </Div>
    </Div>
  );
}
