"use client";

import { useTranslations } from "next-intl";
import { FilterFacetSection } from "../../filters/FilterFacetSection";
import { RangeFilter } from "../../filters/RangeFilter";
import type { FacetOption } from "../../filters/FilterFacetSection";
import type { UrlTable } from "../../filters/FilterPanel";
import { Div } from "../../../ui";

export type { FacetOption, UrlTable };

export interface ProductFiltersProps {
  table: UrlTable;
  /** Pass category options loaded from the API */
  categoryOptions?: FacetOption[];
  /** Pass brand options loaded from the API */
  brandOptions?: FacetOption[];
  /** Pass seller name options */
  sellerOptions?: FacetOption[];
  /** Override defaults with dynamic tag options */
  tagOptions?: FacetOption[];
  /** Show status filter (admin / seller only) */
  showStatus?: boolean;
  statusOptions?: FacetOption[];
  /**
   * Currency prefix shown in price range labels (e.g. "₹", "$", "€").
   * Injected by the consumer app — never hard-coded in appkit.
   */
  currencyPrefix?: string;
}

export function ProductFilters({
  table,
  categoryOptions = [],
  brandOptions = [],
  sellerOptions = [],
  tagOptions = [],
  showStatus = false,
  statusOptions,
  currencyPrefix = "",
}: ProductFiltersProps) {
  const t = useTranslations("filters");

  const conditionOptions: FacetOption[] = [
    { value: "new", label: t("conditionNew") },
    { value: "used", label: t("conditionUsed") },
    { value: "refurbished", label: t("conditionRefurbished") },
    { value: "broken", label: t("conditionBroken") },
  ];

  const defaultStatusOptions: FacetOption[] = [
    { value: "published", label: t("statusPublished") },
    { value: "draft", label: t("statusDraft") },
    { value: "archived", label: t("statusArchived") },
  ];

  const selectedCategories = table.get("category")
    ? table.get("category").split("|").filter(Boolean)
    : [];
  const selectedBrands = table.get("brand") ? [table.get("brand")] : [];
  const selectedSellers = table.get("seller") ? [table.get("seller")] : [];
  const selectedConditions = table.get("condition")
    ? table.get("condition").split("|").filter(Boolean)
    : [];
  const selectedTags = table.get("tags")
    ? table.get("tags").split("|").filter(Boolean)
    : [];
  const selectedStatuses = table.get("status")
    ? table.get("status").split("|").filter(Boolean)
    : [];

  return (
    <Div>
      {categoryOptions.length > 0 && (
        <FilterFacetSection
          title={t("category")}
          options={categoryOptions}
          selected={selectedCategories}
          onChange={(vals) => table.set("category", vals.join("|"))}
          searchable={categoryOptions.length > 6}
          defaultCollapsed={true}
        />
      )}

      <FilterFacetSection
        title={t("condition")}
        options={conditionOptions}
        selected={selectedConditions}
        onChange={(vals) => table.set("condition", vals.join("|"))}
        searchable={false}
        defaultCollapsed={true}
      />

      <RangeFilter
        title={t("priceRange")}
        minValue={table.get("minPrice")}
        maxValue={table.get("maxPrice")}
        onMinChange={(v) => table.set("minPrice", v)}
        onMaxChange={(v) => table.set("maxPrice", v)}
        prefix={currencyPrefix}
        showSlider
        minBound={0}
        maxBound={500000}
        step={500}
        minPlaceholder={t("minPrice")}
        maxPlaceholder={t("maxPrice")}
        defaultCollapsed={true}
      />

      {brandOptions.length > 0 && (
        <FilterFacetSection
          title={t("brand")}
          options={brandOptions}
          selected={selectedBrands}
          onChange={(vals) => table.set("brand", vals[0] ?? "")}
          searchable={brandOptions.length > 6}
          defaultCollapsed={true}
        />
      )}

      {sellerOptions.length > 0 && (
        <FilterFacetSection
          title={t("seller")}
          options={sellerOptions}
          selected={selectedSellers}
          onChange={(vals) => table.set("seller", vals[0] ?? "")}
          searchable={sellerOptions.length > 6}
          defaultCollapsed={true}
        />
      )}

      {tagOptions.length > 0 && (
        <FilterFacetSection
          title={t("tags")}
          options={tagOptions}
          selected={selectedTags}
          onChange={(vals) => table.set("tags", vals.join("|"))}
          searchable={tagOptions.length > 6}
          defaultCollapsed={true}
        />
      )}

      {showStatus && (
        <FilterFacetSection
          title={t("status")}
          options={statusOptions ?? defaultStatusOptions}
          selected={selectedStatuses}
          onChange={(vals) => table.set("status", vals.join("|"))}
          searchable={false}
          defaultCollapsed={true}
        />
      )}
    </Div>
  );
}
