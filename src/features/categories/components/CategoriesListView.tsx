"use client";

import React from "react";
import { Container, Div, Heading, Text } from "../../../ui";
import type { CategoryItem } from "../types";

export interface CategoriesListViewProps {
  initialData?: CategoryItem[];
  labels?: {
    title?: string;
    subtitle?: string;
    emptyTitle?: string;
    emptyDescription?: string;
  };
  renderSearch?: (
    value: string,
    onChange: (v: string) => void,
  ) => React.ReactNode;
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
  renderSearch,
  renderCategories,
  renderPagination,
  items = [],
  total = 0,
  isLoading = false,
  className = "",
}: CategoriesListViewProps) {
  const [search, setSearch] = React.useState("");

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

        {renderCategories(filtered, isLoading)}
        {renderPagination?.(total)}
      </Container>
    </Div>
  );
}
