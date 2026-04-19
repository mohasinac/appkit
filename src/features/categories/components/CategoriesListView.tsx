"use client";

import React from "react";
import { Container, Div, Heading, Text } from "../../../ui";
import type { CategoryItem } from "../types";
import type { UrlTable } from "../../filters/FilterPanel";
import { CategoryFilters } from "./CategoryFilters";
import type { CategoryFilterVariant } from "./CategoryFilters";
import { CategorySortSelect } from "./CategorySortSelect";

export interface CategoriesListViewProps {
  initialData?: CategoryItem[];
  labels?: {
    title?: string;
    subtitle?: string;
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
  renderSearch?: (
    value: string,
    onChange: (v: string) => void,
  ) => React.ReactNode;
  renderSort?: (
    value: string,
    onChange: (v: string) => void,
  ) => React.ReactNode;
  renderFilters?: () => React.ReactNode;
  renderCategories: (
    items: CategoryItem[],
    isLoading: boolean,
  ) => React.ReactNode;
  renderPagination?: (total: number) => React.ReactNode;
  items?: CategoryItem[];
  total?: number;
  isLoading?: boolean;
  className?: string;
}

export function CategoriesListView({
  labels = {},
  table,
  filterVariant = "public",
  sortValue,
  onSortChange,
  renderSearch,
  renderSort,
  renderFilters,
  renderCategories,
  renderPagination,
  items = [],
  total = 0,
  isLoading = false,
  className = "",
}: CategoriesListViewProps) {
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("order");

  const resolvedSort = sortValue ?? table?.get("sorts") ?? sort;

  const handleSortChange = (next: string) => {
    onSortChange?.(next);
    if (!sortValue) {
      setSort(next);
    }
    table?.set("sorts", next);
  };

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        (c.name ?? "").toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  return (
    <Div className={`min-h-screen ${className}`}>
      <Container size="full" className="py-8">
        {(labels.title || labels.subtitle) && (
          <Div className="mb-6">
            {labels.title && (
              <Heading level={1} className="text-2xl font-bold">
                {labels.title}
              </Heading>
            )}
            {labels.subtitle && (
              <Text variant="secondary" className="mt-1">
                {labels.subtitle}
              </Text>
            )}
          </Div>
        )}

        {renderSearch?.(search, setSearch)}

        {renderSort ? (
          renderSort(resolvedSort, handleSortChange)
        ) : (
          <CategorySortSelect
            value={resolvedSort}
            onChange={handleSortChange}
            variant={filterVariant}
          />
        )}

        {renderFilters?.() ??
          (table ? (
            <CategoryFilters table={table} variant={filterVariant} />
          ) : null)}

        {renderCategories(filtered, isLoading)}
        {renderPagination?.(total)}
      </Container>
    </Div>
  );
}
