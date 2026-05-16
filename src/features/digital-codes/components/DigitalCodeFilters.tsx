"use client";
import { FilterFacetSection } from "../../filters/FilterFacetSection";
import { AsyncFacetSection } from "../../filters/AsyncFacetSection";
import { RangeFilter } from "../../filters/RangeFilter";
import type { FacetOption } from "../../filters/FilterFacetSection";
import type { UrlTable } from "../../filters/FilterPanel";
import type { AsyncFacetSectionProps } from "../../filters/AsyncFacetSection";
import { Div } from "../../../ui";

type LoadOptionsFn = AsyncFacetSectionProps["loadOptions"];

const DELIVERY_OPTIONS: FacetOption[] = [
  { value: "auto-claim", label: "Instant (auto-claim)" },
  { value: "manual-email", label: "Manual (sent by seller)" },
];

export interface DigitalCodeFiltersProps {
  table: UrlTable;
  categoryOptions?: FacetOption[];
  loadCategoryOptions?: LoadOptionsFn;
  currencyPrefix?: string;
}

export function DigitalCodeFilters({
  table,
  categoryOptions = [],
  loadCategoryOptions,
  currencyPrefix = "₹",
}: DigitalCodeFiltersProps) {
  const selectedCategories = table.get("category")
    ? table.get("category").split("|").filter(Boolean)
    : [];
  const selectedDelivery = table.get("deliveryMethod") ? [table.get("deliveryMethod")] : [];

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

      <FilterFacetSection
        title="Delivery Method"
        options={DELIVERY_OPTIONS}
        selected={selectedDelivery}
        onChange={(vals) => table.set("deliveryMethod", vals[0] ?? "")}
        searchable={false}
        selectionMode="single"
        defaultCollapsed={false}
      />

      <RangeFilter
        title="Price per Code"
        minValue={table.get("minPrice")}
        maxValue={table.get("maxPrice")}
        onMinChange={(v) => table.set("minPrice", v)}
        onMaxChange={(v) => table.set("maxPrice", v)}
        prefix={currencyPrefix}
        showSlider
        minBound={0}
        maxBound={50000}
        step={50}
        minPlaceholder="Min price"
        maxPlaceholder="Max price"
        defaultCollapsed={false}
      />
    </Div>
  );
}
