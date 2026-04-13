"use client";

import { useState } from "react";
import { Button, Div, Input, Label, Row, Select, Span } from "../../../ui";
import type { SearchCategoryOption } from "../types";

interface SearchFiltersRowProps {
  urlCategory: string;
  categories: SearchCategoryOption[];
  urlMinPrice: string;
  urlMaxPrice: string;
  showClear: boolean;
  onCategoryChange: (value: string) => void;
  onPriceFilter: (min: string, max: string) => void;
  onClearFilters: () => void;
  labels?: {
    categoryFilter?: string;
    allCategories?: string;
    priceRange?: string;
    minPrice?: string;
    maxPrice?: string;
    apply?: string;
    clearFilters?: string;
  };
}

export function SearchFiltersRow({
  urlCategory,
  categories,
  urlMinPrice,
  urlMaxPrice,
  showClear,
  onCategoryChange,
  onPriceFilter,
  onClearFilters,
  labels = {},
}: SearchFiltersRowProps) {
  const [minPrice, setMinPrice] = useState(urlMinPrice);
  const [maxPrice, setMaxPrice] = useState(urlMaxPrice);

  const L = {
    categoryFilter: labels.categoryFilter ?? "Category",
    allCategories: labels.allCategories ?? "All Categories",
    priceRange: labels.priceRange ?? "Price Range",
    minPrice: labels.minPrice ?? "Min",
    maxPrice: labels.maxPrice ?? "Max",
    apply: labels.apply ?? "Apply",
    clearFilters: labels.clearFilters ?? "Clear Filters",
  };

  return (
    <Row wrap gap="md" align="end">
      {/* Category filter */}
      <Div className="flex flex-col gap-1">
        <Label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {L.categoryFilter}
        </Label>
        <Select
          value={urlCategory}
          onChange={(value) => onCategoryChange(value)}
          options={[
            { value: "", label: L.allCategories },
            ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
          ]}
          className="rounded-lg border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </Div>

      {/* Price range */}
      <Div className="flex flex-col gap-1">
        <Label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {L.priceRange}
        </Label>
        <Div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder={L.minPrice}
            className="w-28 rounded-lg border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <Span className="text-sm text-zinc-500 dark:text-zinc-400">–</Span>
          <Input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder={L.maxPrice}
            className="w-28 rounded-lg border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onPriceFilter(minPrice, maxPrice)}
            className="h-10 px-4 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
          >
            {L.apply}
          </Button>
        </Div>
      </Div>

      {/* Clear filters */}
      {showClear && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="h-10 px-4 rounded-lg border border-zinc-200 dark:border-slate-700 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
        >
          {L.clearFilters}
        </Button>
      )}
    </Row>
  );
}
