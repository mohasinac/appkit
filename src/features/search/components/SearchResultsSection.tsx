import React from "react";

import { Button, Div, Grid, Row, Select, Span, Text } from "../../../ui";
import type { SearchProductItem } from "../types";

export interface SearchResultsSectionProps {
  products: SearchProductItem[];
  total: number;
  totalPages: number;
  urlQ: string;
  urlSort: string;
  urlPage: number;
  isLoading: boolean;
  /** Called with new sort value */
  onSortChange: (sort: string) => void;
  /** Called with new page number */
  onPageChange: (page: number) => void;
  /** Slot for rendering a single product card */
  renderItem: (product: SearchProductItem) => React.ReactNode;
  /** Optional custom loading renderer. */
  renderLoading?: (opts: { skeletonCount: number }) => React.ReactNode;
  /** Optional custom empty-state renderer. */
  renderEmpty?: (opts: { query: string }) => React.ReactNode;
  /** Optional custom products renderer. */
  renderProducts?: (products: SearchProductItem[]) => React.ReactNode;
  /** Optional custom sort/count toolbar renderer. */
  renderSortBar?: (opts: {
    total: number;
    showing: number;
    urlSort: string;
    onSortChange: (sort: string) => void;
  }) => React.ReactNode;
  /** Optional custom pagination renderer. */
  renderPagination?: (opts: {
    urlPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }) => React.ReactNode;
  sortOptions?: Array<{ value: string; label: string }>;
  labels?: {
    sortLabel?: string;
    noResultsTitle?: string;
    noResultsSubtitle?: string;
    showing?: (count: number, total: number) => string;
    prevPage?: string;
    nextPage?: string;
  };
}

const PAGE_SIZE = 24;

export function SearchResultsSection({
  products,
  total,
  totalPages,
  urlQ,
  urlSort,
  urlPage,
  isLoading,
  onSortChange,
  onPageChange,
  renderItem,
  renderLoading,
  renderEmpty,
  renderProducts,
  renderSortBar,
  renderPagination,
  sortOptions = [],
  labels = {},
}: SearchResultsSectionProps) {
  const L = {
    noResultsTitle: labels.noResultsTitle ?? "No results found",
    noResultsSubtitle: labels.noResultsSubtitle,
    showing:
      labels.showing ?? ((c: number, t: number) => `Showing ${c} of ${t}`),
    prevPage: labels.prevPage ?? "Previous",
    nextPage: labels.nextPage ?? "Next",
  };

  if (isLoading) {
    if (renderLoading) {
      return <>{renderLoading({ skeletonCount: PAGE_SIZE })}</>;
    }

    return (
      <Grid cols="statTiles">
        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <Div
            key={i}
            className="aspect-square rounded-xl bg-zinc-100 dark:bg-slate-800 animate-pulse"
          />
        ))}
      </Grid>
    );
  }

  if (products.length === 0) {
    if (renderEmpty) {
      return <>{renderEmpty({ query: urlQ })}</>;
    }

    return (
      <Div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <Span className="text-5xl" aria-hidden="true">
          🔍
        </Span>
        <Text className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
          {L.noResultsTitle}
        </Text>
        {urlQ && L.noResultsSubtitle && (
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">
            {L.noResultsSubtitle}
          </Text>
        )}
      </Div>
    );
  }

  return (
    <Div className="space-y-5">
      {/* Sort + count bar */}
      {renderSortBar ? (
        renderSortBar({
          total,
          showing: products.length,
          urlSort,
          onSortChange,
        })
      ) : (
        <Row justify="between">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">
            {L.showing(products.length, total)}
          </Text>
          {sortOptions.length > 0 && (
            <Select
              value={urlSort}
              onValueChange={onSortChange}
              options={sortOptions}
              className="rounded-lg border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          )}
        </Row>
      )}

      {/* Product grid */}
      {renderProducts ? (
        renderProducts(products)
      ) : (
        <Grid cols="statTiles">
          {products.map((p) => (
            <Div key={p.id}>{renderItem(p)}</Div>
          ))}
        </Grid>
      )}

      {/* Pagination */}
      {totalPages > 1 &&
        (renderPagination ? (
          renderPagination({
            urlPage,
            totalPages,
            onPageChange,
          })
        ) : (
          <Div className="flex items-center justify-center gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(urlPage - 1)}
              disabled={urlPage <= 1}
              className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-slate-700 text-sm text-zinc-700 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
            >
              {L.prevPage}
            </Button>
            <Span className="text-sm text-zinc-600 dark:text-zinc-400 tabular-nums">
              {urlPage} / {totalPages}
            </Span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(urlPage + 1)}
              disabled={urlPage >= totalPages}
              className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-slate-700 text-sm text-zinc-700 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
            >
              {L.nextPage}
            </Button>
          </Div>
        ))}
    </Div>
  );
}
