"use client";
import { FilterFacetSection } from "../../filters/FilterFacetSection";
import { AsyncFacetSection } from "../../filters/AsyncFacetSection";
import { RangeFilter } from "../../filters/RangeFilter";
import type { FacetOption } from "../../filters/FilterFacetSection";
import type { UrlTable } from "../../filters/FilterPanel";
import type { AsyncFacetSectionProps } from "../../filters/AsyncFacetSection";
import { Div, Label } from "../../../ui";

type LoadOptionsFn = AsyncFacetSectionProps["loadOptions"];

const NEGOTIABLE_OPTIONS: FacetOption[] = [
  { value: "true", label: "Negotiable only" },
];

const SHIPPING_OPTIONS: FacetOption[] = [
  { value: "true", label: "Accepts shipping" },
];

export interface ClassifiedFiltersProps {
  table: UrlTable;
  categoryOptions?: FacetOption[];
  loadCategoryOptions?: LoadOptionsFn;
  currencyPrefix?: string;
}

export function ClassifiedFilters({
  table,
  categoryOptions = [],
  loadCategoryOptions,
  currencyPrefix = "₹",
}: ClassifiedFiltersProps) {
  const selectedCategories = table.get("category")
    ? table.get("category").split("|").filter(Boolean)
    : [];
  const selectedNegotiable = table.get("negotiable") ? [table.get("negotiable")] : [];
  const selectedShipping = table.get("acceptsShipping") ? [table.get("acceptsShipping")] : [];

  return (
    <Div>
      {loadCategoryOptions ? (
        <AsyncFacetSection
          title="Category"
          loadOptions={loadCategoryOptions}
          selected={selectedCategories}
          onChange={(vals) => table.set("category", vals.join("|"))}
          defaultCollapsed={false}
        />
      ) : categoryOptions.length > 0 ? (
        <FilterFacetSection
          title="Category"
          options={categoryOptions}
          selected={selectedCategories}
          onChange={(vals) => table.set("category", vals.join("|"))}
          searchable
          defaultCollapsed={categoryOptions.length > 6}
        />
      ) : null}

      <Div className="border-t border-[var(--appkit-color-border)] pt-4 mt-4">
        <Label className="block text-sm font-medium text-[var(--appkit-color-text)] mb-2">
          City / Area
        </Label>
        <input
          type="text"
          value={table.get("city") || ""}
          onChange={(e) => table.set("city", e.target.value)}
          placeholder="e.g. Mumbai"
          className="w-full rounded-lg border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] px-3 py-2 text-sm text-[var(--appkit-color-text)] placeholder-[var(--appkit-color-text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--appkit-color-primary)]"
        />
      </Div>

      <FilterFacetSection
        title="Negotiable"
        options={NEGOTIABLE_OPTIONS}
        selected={selectedNegotiable}
        onChange={(vals) => table.set("negotiable", vals[0] ?? "")}
        searchable={false}
        selectionMode="single"
        defaultCollapsed={false}
      />

      <FilterFacetSection
        title="Shipping"
        options={SHIPPING_OPTIONS}
        selected={selectedShipping}
        onChange={(vals) => table.set("acceptsShipping", vals[0] ?? "")}
        searchable={false}
        selectionMode="single"
        defaultCollapsed={false}
      />

      <RangeFilter
        title="Asking Price"
        minValue={table.get("minPrice")}
        maxValue={table.get("maxPrice")}
        onMinChange={(v) => table.set("minPrice", v)}
        onMaxChange={(v) => table.set("maxPrice", v)}
        prefix={currencyPrefix}
        showSlider
        minBound={0}
        maxBound={500000}
        step={100}
        minPlaceholder="Min price"
        maxPlaceholder="Max price"
        defaultCollapsed={false}
      />
    </Div>
  );
}
