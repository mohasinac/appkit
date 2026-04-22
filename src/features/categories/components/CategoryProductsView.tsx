"use client"
import React from "react";
import {
  Div,
  Heading,
  Input,
  SlottedListingView,
  Text,
} from "../../../ui";
import type { CategoryItem } from "../types";
import type { UrlTable } from "../../filters/FilterPanel";
import { CategoryFilters } from "./CategoryFilters";
import { CategorySortSelect } from "./CategorySortSelect";
import type { CategoryFilterVariant } from "./CategoryFilters";

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
  /** Optional UrlTable-compatible state source for shared filter/sort controls */
  table?: UrlTable;
  /** Filter/sort preset for admin/seller/public listing behavior */
  filterVariant?: CategoryFilterVariant;
  /** Controlled sort value override */
  sortValue?: string;
  /** Controlled sort change callback */
  onSortChange?: (value: string) => void;
  /** Render breadcrumb trail */
  renderBreadcrumbs?: (category: CategoryItem | null) => React.ReactNode;
  /** Render child category chips/tabs */
  renderChildCategories?: (children: CategoryItem[]) => React.ReactNode;
  /** Render filter panel */
  renderFilters?: () => React.ReactNode;
  /** Render active filter chips */
  renderActiveFilters?: () => React.ReactNode;
  /** Render search */
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
  table,
  filterVariant = "public",
  sortValue,
  onSortChange,
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

  const resolvedSort = sortValue ?? table?.get("sorts") ?? sort;

  const handleSortChange = (next: string) => {
    onSortChange?.(next);
    if (!sortValue) {
      setSort(next);
    }
    table?.set("sorts", next);
  };

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
              <Text className="text-neutral-500 mt-1">
                {category.description}
              </Text>
            )}
          </Div>
        )}

        {/* Child categories */}
        {childCategories.length > 0 && renderChildCategories?.(childCategories)}

        <SlottedListingView
          portal="public"
          inlineToolbar
          className="space-y-4"
          renderSearch={() =>
            renderSearch?.(search, setSearch) ?? (
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search in category"
                className="max-w-sm"
              />
            )
          }
          renderSort={() =>
            renderSort ? (
              renderSort(resolvedSort, handleSortChange)
            ) : (
              <CategorySortSelect
                value={resolvedSort}
                onChange={handleSortChange}
                variant={filterVariant}
              />
            )
          }
          renderFilters={() =>
            renderFilters?.() ??
            (table ? <CategoryFilters table={table} variant={filterVariant} /> : null)
          }
          renderActiveFilters={renderActiveFilters}
          renderBulkActions={() => renderViewToggle?.(viewMode, setViewMode) ?? null}
          renderTable={() => renderProducts(isLoading)}
          renderPagination={() => renderPagination?.(total) ?? null}
          total={total}
          isLoading={isLoading}
        />
      </Div>
    </Div>
  );
}
