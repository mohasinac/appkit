"use client"
import { useState } from "react";
import { Button, Div, Input, Label, Row, Select, Span, Stack } from "../../../ui";
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
      <Stack gap="xs">
        <Label size="sm" weight="medium" color="muted">
          {L.categoryFilter}
        </Label>
        <Select
          value={urlCategory}
          onValueChange={(value) => onCategoryChange(value)}
          options={[
            { value: "", label: L.allCategories },
            ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
          ]}
          className="rounded-lg border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </Stack>

      {/* Price range */}
      <Stack gap="xs">
        <Label size="sm" weight="medium" color="muted">
          {L.priceRange}
        </Label>
        <Row align="center" gap="sm">
          <Input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder={L.minPrice}
            className="w-28 rounded-lg border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <Span size="sm" color="muted">–</Span>
          <Input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder={L.maxPrice}
            className="w-28 rounded-lg border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <Button rounded="lg" 
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onPriceFilter(minPrice, maxPrice)}
            className="h-10 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
          >
            {L.apply}
          </Button>
        </Row>
      </Stack>

      {/* Clear filters */}
      {showClear && (
        <Button rounded="lg"
          type="button"
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          paddingX="md" textSize="sm"
          className="h-10 border border-zinc-200 dark:border-slate-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
        >
          {L.clearFilters}
        </Button>
      )}
    </Row>
  );
}
