"use client";
// S-STORE — Filter fields for SellerProductsView. Extracted so the main
// component stays under the 150-line code-quality threshold. Rendered as
// DataListingView's `renderFilterPanel` content — DataListingView already
// owns the surrounding <ListingFilterDrawer>, so this only renders the
// inner fields.

import React from "react";
import { Div, FilterChipGroup, Row, Stack, Text } from "../../../ui";
import { FieldInput, FieldSelect } from "../../../ui/forms";
import { CategoryInlineSelect } from "./CategoryInlineSelect";
import { BrandInlineSelect } from "./BrandInlineSelect";

const CONDITION_OPTIONS = [
  { value: "", label: "Any" },
  { value: "mint", label: "Mint" },
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
  { value: "refurbished", label: "Refurbished" },
  { value: "for-parts", label: "For parts" },
];

export interface SellerProductsFilterFieldsProps {
  pendingFilters: Record<string, string>;
  statusOptions: ReadonlyArray<{ id: string; label: string }>;
  onChange: (next: Record<string, string>) => void;
}

export function SellerProductsFilterFields({
  pendingFilters,
  statusOptions,
  onChange,
}: SellerProductsFilterFieldsProps) {
  const patch = (k: string, v: string) => onChange({ ...pendingFilters, [k]: v });
  return (
    <>
      <FilterChipGroup
        label="Status"
        tabs={statusOptions}
        value={pendingFilters.status ?? ""}
        onChange={(id) => patch("status", id)}
      />
      <Stack gap="xs">
        <Text size="xs" weight="semibold" color="muted" transform="uppercase">Category</Text>
        <CategoryInlineSelect
          value={pendingFilters.category ?? ""}
          onChange={(v) => patch("category", v)}
          placeholder="Search categories…"
        />
      </Stack>
      <Stack gap="xs">
        <Text size="xs" weight="semibold" color="muted" transform="uppercase">Brand</Text>
        <BrandInlineSelect
          value={pendingFilters.brand ?? ""}
          onChange={(v) => patch("brand", v)}
          placeholder="Search brands…"
          allowCreate={false}
        />
      </Stack>
      <FieldSelect
        name="condition"
        label="Condition"
        value={pendingFilters.condition ?? ""}
        onChange={(v) => patch("condition", v)}
        options={CONDITION_OPTIONS}
      />
      <Stack gap="xs">
        <Text size="xs" weight="semibold" color="muted" transform="uppercase">Price (₹ Rupees)</Text>
        <Row gap="sm">
          <Div className="flex-1">
            <FieldInput
              name="minPrice"
              type="number"
              min={0}
              value={pendingFilters.minPrice ?? ""}
              onChange={(v) => patch("minPrice", v)}
              placeholder="min"
            />
          </Div>
          <Div className="flex-1">
            <FieldInput
              name="maxPrice"
              type="number"
              min={0}
              value={pendingFilters.maxPrice ?? ""}
              onChange={(v) => patch("maxPrice", v)}
              placeholder="max"
            />
          </Div>
        </Row>
      </Stack>
      <FieldInput
        name="tags"
        label="Tags (comma-separated)"
        type="text"
        value={pendingFilters.tags ?? ""}
        onChange={(v) => patch("tags", v)}
        placeholder="pokemon, vintage, holo"
      />
      <FieldInput
        name="badges"
        label="Badges (feature slugs)"
        type="text"
        value={pendingFilters.badges ?? ""}
        onChange={(v) => patch("badges", v)}
        placeholder="feature-free-shipping, feature-verified"
      />
    </>
  );
}
