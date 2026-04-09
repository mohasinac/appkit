"use client";

import { Button, Select, Span, Text } from "@mohasinac/ui";
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
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-xl bg-zinc-100 dark:bg-slate-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
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
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Sort + count bar */}
      <div className="flex items-center justify-between">
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">
          {L.showing(products.length, total)}
        </Text>
        {sortOptions.length > 0 && (
          <Select
            value={urlSort}
            onChange={onSortChange}
            options={sortOptions}
            className="rounded-lg border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none"
          />
        )}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
        {products.map((p) => (
          <div key={p.id}>{renderItem(p)}</div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
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
        </div>
      )}
    </div>
  );
}
