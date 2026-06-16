"use client";
// S-STORE — Filter drawer for SellerProductsView. Extracted so the main
// component stays under the 150-line code-quality threshold.

import React from "react";
import { Div, FilterChipGroup, ListingFilterDrawer, Row, Stack, Text } from "../../../ui";
import { INPUT_CLS, FILTER_LABEL_CLS } from "./seller-products-styles";
import { CategoryInlineSelect } from "./CategoryInlineSelect";
import { BrandInlineSelect } from "./BrandInlineSelect";

const HALF_INPUT_CLS = INPUT_CLS.replace("w-full", "w-1/2");

const CONDITION_OPTIONS = [
  { value: "", label: "Any" },
  { value: "mint", label: "Mint" },
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
  { value: "refurbished", label: "Refurbished" },
  { value: "for-parts", label: "For parts" },
] as const;

export interface SellerProductsFilterDrawerProps {
  isOpen: boolean;
  pendingFilters: Record<string, string>;
  statusOptions: ReadonlyArray<{ id: string; label: string }>;
  activeFilterCount: number;
  onChange: (next: Record<string, string>) => void;
  onClear: () => void;
  onApply: () => void;
  onClose: () => void;
}

export function SellerProductsFilterDrawer({
  isOpen,
  pendingFilters,
  statusOptions,
  activeFilterCount,
  onChange,
  onClear,
  onApply,
  onClose,
}: SellerProductsFilterDrawerProps) {
  const patch = (k: string, v: string) => onChange({ ...pendingFilters, [k]: v });
  return (
    <ListingFilterDrawer open={isOpen} onClose={onClose} onApply={onApply} onClear={onClear} activeCount={activeFilterCount}>
      <FilterChipGroup
        label="Status"
        tabs={statusOptions}
        value={pendingFilters.status ?? ""}
        onChange={(id) => patch("status", id)}
      />
      <Stack gap="xs" className=".5">
        <Text className={FILTER_LABEL_CLS}>Category</Text>
        <CategoryInlineSelect
          value={pendingFilters.category ?? ""}
          onChange={(v) => patch("category", v)}
          placeholder="Search categories…"
        />
      </Stack>
      <Stack gap="xs" className=".5">
        <Text className={FILTER_LABEL_CLS}>Brand</Text>
        <BrandInlineSelect
          value={pendingFilters.brand ?? ""}
          onChange={(v) => patch("brand", v)}
          placeholder="Search brands…"
          allowCreate={false}
        />
      </Stack>
      <Stack gap="xs" className=".5">
        <Text className={FILTER_LABEL_CLS}>Condition</Text>
        <select
          value={pendingFilters.condition ?? ""}
          onChange={(e) => patch("condition", e.target.value)}
          className={INPUT_CLS}
        >
          {CONDITION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Stack>
      <Stack gap="xs" className=".5">
        <Text className={FILTER_LABEL_CLS}>Price (₹ Rupees)</Text>
        <Row gap="sm">
          <input
            type="number"
            min={0}
            value={pendingFilters.minPrice ?? ""}
            onChange={(e) => patch("minPrice", e.target.value)}
            placeholder="min"
            className={HALF_INPUT_CLS}
          />
          <input
            type="number"
            min={0}
            value={pendingFilters.maxPrice ?? ""}
            onChange={(e) => patch("maxPrice", e.target.value)}
            placeholder="max"
            className={HALF_INPUT_CLS}
          />
        </Row>
      </Stack>
      <Stack gap="xs" className=".5">
        <Text className={FILTER_LABEL_CLS}>Tags (comma-separated)</Text>
        <input
          type="text"
          value={pendingFilters.tags ?? ""}
          onChange={(e) => patch("tags", e.target.value)}
          placeholder="pokemon, vintage, holo"
          className={INPUT_CLS}
        />
      </Stack>
      <Stack gap="xs" className=".5">
        <Text className={FILTER_LABEL_CLS}>Badges (feature slugs)</Text>
        <input
          type="text"
          value={pendingFilters.badges ?? ""}
          onChange={(e) => patch("badges", e.target.value)}
          placeholder="feature-free-shipping, feature-verified"
          className={INPUT_CLS}
        />
      </Stack>
    </ListingFilterDrawer>
  );
}
