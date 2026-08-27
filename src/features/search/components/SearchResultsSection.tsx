import React from "react";

import { Button, Div, Grid, Row, Select, Span, Stack, Text } from "../../../ui";
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
            className="aspect-square animate-pulse" surface="subtle" rounded="xl"
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
      <Stack justify="center" padding="y-5xl" className="text-left" align="start" gap="3">
        <Span aria-hidden="true" size="5xl">
          🔍
        </Span>
        <Text size="lg" weight="semibold" color="primary">
          {L.noResultsTitle}
        </Text>
        {urlQ && L.noResultsSubtitle && (
          <Text size="sm" color="muted">
            {L.noResultsSubtitle}
          </Text>
        )}
      </Stack>
    );
  }

  return (
    <Stack gap="5">
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
          <Text size="sm" color="muted">
            {L.showing(products.length, total)}
          </Text>
          {sortOptions.length > 0 && (
            <Select
              value={urlSort}
              onValueChange={onSortChange}
              options={sortOptions}
              className="rounded-lg border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-input)] px-[var(--appkit-space-3)] py-[var(--appkit-space-1-5)] text-[length:var(--appkit-text-sm)] text-[var(--appkit-color-text)] focus:outline-none"
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
          <Row align="center" justify="center" gap="sm" padding="t-md">
            <Button rounded="lg" 
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(urlPage - 1)}
              disabled={urlPage <= 1}
              className="px-[var(--appkit-space-4)] py-[var(--appkit-space-2)] border border-[var(--appkit-color-border)] text-[length:var(--appkit-text-sm)] text-[var(--appkit-color-text-muted)] disabled:opacity-40 hover:bg-surface-hover transition-colors"
            >
              {L.prevPage}
            </Button>
            <Span size="sm" className="tabular-nums" color="muted">
              {urlPage} / {totalPages}
            </Span>
            <Button rounded="lg" 
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(urlPage + 1)}
              disabled={urlPage >= totalPages}
              className="px-[var(--appkit-space-4)] py-[var(--appkit-space-2)] border border-[var(--appkit-color-border)] text-[length:var(--appkit-text-sm)] text-[var(--appkit-color-text-muted)] disabled:opacity-40 hover:bg-surface-hover transition-colors"
            >
              {L.nextPage}
            </Button>
          </Row>
        ))}
    </Stack>
  );
}
