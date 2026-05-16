"use client";
import { FilterFacetSection } from "../../filters/FilterFacetSection";
import { AsyncFacetSection } from "../../filters/AsyncFacetSection";
import { RangeFilter } from "../../filters/RangeFilter";
import type { FacetOption } from "../../filters/FilterFacetSection";
import type { UrlTable } from "../../filters/FilterPanel";
import type { AsyncFacetSectionProps } from "../../filters/AsyncFacetSection";
import { Div } from "../../../ui";

type LoadOptionsFn = AsyncFacetSectionProps["loadOptions"];

const SEX_OPTIONS: FacetOption[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "unknown", label: "Unknown" },
];

const TRANSPORT_OPTIONS: FacetOption[] = [
  { value: "in-person", label: "In-Person only" },
  { value: "courier", label: "Live-animal courier" },
  { value: "specialist", label: "Specialist transport" },
];

export interface LiveItemFiltersProps {
  table: UrlTable;
  categoryOptions?: FacetOption[];
  loadCategoryOptions?: LoadOptionsFn;
  currencyPrefix?: string;
}

export function LiveItemFilters({
  table,
  categoryOptions = [],
  loadCategoryOptions,
  currencyPrefix = "₹",
}: LiveItemFiltersProps) {
  const selectedCategories = table.get("category")
    ? table.get("category").split("|").filter(Boolean)
    : [];
  const selectedSex = table.get("liveSex") ? [table.get("liveSex")] : [];
  const selectedTransport = table.get("liveTransportMethod") ? [table.get("liveTransportMethod")] : [];

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

      <div className="border-t border-[var(--appkit-color-border)] pt-4 mt-4">
        <label className="block text-sm font-medium text-[var(--appkit-color-text)] mb-2">
          Species / Animal
        </label>
        <input
          type="text"
          value={table.get("species") || ""}
          onChange={(e) => table.set("species", e.target.value)}
          placeholder="e.g. Axolotl, Parrot"
          className="w-full rounded-lg border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] px-3 py-2 text-sm text-[var(--appkit-color-text)] placeholder-[var(--appkit-color-text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--appkit-color-primary)]"
        />
      </div>

      <div className="border-t border-[var(--appkit-color-border)] pt-4 mt-4">
        <label className="block text-sm font-medium text-[var(--appkit-color-text)] mb-2">
          Jurisdiction (state/UT)
        </label>
        <input
          type="text"
          value={table.get("jurisdiction") || ""}
          onChange={(e) => table.set("jurisdiction", e.target.value)}
          placeholder="e.g. Maharashtra"
          className="w-full rounded-lg border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] px-3 py-2 text-sm text-[var(--appkit-color-text)] placeholder-[var(--appkit-color-text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--appkit-color-primary)]"
        />
      </div>

      <FilterFacetSection
        title="Sex"
        options={SEX_OPTIONS}
        selected={selectedSex}
        onChange={(vals) => table.set("liveSex", vals[0] ?? "")}
        searchable={false}
        selectionMode="single"
        defaultCollapsed={false}
      />

      <FilterFacetSection
        title="Transport Method"
        options={TRANSPORT_OPTIONS}
        selected={selectedTransport}
        onChange={(vals) => table.set("liveTransportMethod", vals[0] ?? "")}
        searchable={false}
        selectionMode="single"
        defaultCollapsed={false}
      />

      <RangeFilter
        title="Price"
        minValue={table.get("minPrice")}
        maxValue={table.get("maxPrice")}
        onMinChange={(v) => table.set("minPrice", v)}
        onMaxChange={(v) => table.set("maxPrice", v)}
        prefix={currencyPrefix}
        showSlider
        minBound={0}
        maxBound={200000}
        step={100}
        minPlaceholder="Min price"
        maxPlaceholder="Max price"
        defaultCollapsed={false}
      />
    </Div>
  );
}
