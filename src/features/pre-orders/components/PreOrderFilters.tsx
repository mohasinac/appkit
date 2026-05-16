"use client";
import { useTranslations } from "next-intl";
import { FilterFacetSection } from "../../filters/FilterFacetSection";
import { AsyncFacetSection } from "../../filters/AsyncFacetSection";
import { RangeFilter } from "../../filters/RangeFilter";
import type { FacetOption } from "../../filters/FilterFacetSection";
import type { UrlTable } from "../../filters/FilterPanel";
import type { AsyncFacetSectionProps } from "../../filters/AsyncFacetSection";
import { Div } from "../../../ui";

type LoadOptionsFn = AsyncFacetSectionProps["loadOptions"];

export interface PreOrderFiltersProps {
  table: UrlTable;
  categoryOptions?: FacetOption[];
  brandOptions?: FacetOption[];
  storeOptions?: FacetOption[];
  loadCategoryOptions?: LoadOptionsFn;
  loadBrandOptions?: LoadOptionsFn;
  loadStoreOptions?: LoadOptionsFn;
  currencyPrefix?: string;
}

export function PreOrderFilters({
  table,
  categoryOptions = [],
  brandOptions = [],
  storeOptions = [],
  loadCategoryOptions,
  loadBrandOptions,
  loadStoreOptions,
  currencyPrefix = "",
}: PreOrderFiltersProps) {
  const t = useTranslations("filters");

  const selectedCategories = table.get("category")
    ? table.get("category").split("|").filter(Boolean)
    : [];
  const selectedBrands = table.get("brand") ? [table.get("brand")] : [];

  const productionStatusOptions: FacetOption[] = [
    { value: "upcoming", label: "Upcoming" },
    { value: "in_production", label: "In Production" },
    { value: "ready_to_ship", label: "Ready to Ship" },
  ];

  const selectedProductionStatuses = table.get("preOrderProductionStatus")
    ? table.get("preOrderProductionStatus").split("|").filter(Boolean)
    : [];
  const selectedStores = table.get("storeId")
    ? table.get("storeId").split("|").filter(Boolean)
    : [];

  return (
    <Div>
      {loadCategoryOptions ? (
        <AsyncFacetSection
          title={t("category")}
          loadOptions={loadCategoryOptions}
          selected={selectedCategories}
          onChange={(vals) => table.set("category", vals.join("|"))}
          defaultCollapsed={false}
        />
      ) : categoryOptions.length > 0 ? (
        <FilterFacetSection
          title={t("category")}
          options={categoryOptions}
          selected={selectedCategories}
          onChange={(vals) => table.set("category", vals.join("|"))}
          searchable={true}
          defaultCollapsed={categoryOptions.length > 6}
        />
      ) : null}

      {loadBrandOptions ? (
        <AsyncFacetSection
          title={t("brand")}
          loadOptions={loadBrandOptions}
          selected={selectedBrands}
          onChange={(vals) => table.set("brand", vals[0] ?? "")}
          defaultCollapsed={false}
        />
      ) : brandOptions.length > 0 ? (
        <FilterFacetSection
          title={t("brand")}
          options={brandOptions}
          selected={selectedBrands}
          onChange={(vals) => table.set("brand", vals[0] ?? "")}
          searchable={brandOptions.length > 4}
          defaultCollapsed={brandOptions.length > 6}
        />
      ) : null}

      <FilterFacetSection
        title={t("productionStatus")}
        options={productionStatusOptions}
        selected={selectedProductionStatuses}
        onChange={(vals) => table.set("preOrderProductionStatus", vals[0] ?? "")}
        searchable={false}
        selectionMode="single"
        defaultCollapsed={false}
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
        step={100}
        minPlaceholder={t("minPrice")}
        maxPlaceholder={t("maxPrice")}
        defaultCollapsed={false}
      />

      {loadStoreOptions ? (
        <AsyncFacetSection
          title={t("store")}
          loadOptions={loadStoreOptions}
          selected={selectedStores}
          onChange={(vals) => table.set("storeId", vals[0] ?? "")}
          defaultCollapsed={false}
        />
      ) : storeOptions.length > 0 ? (
        <FilterFacetSection
          title={t("store")}
          options={storeOptions}
          selected={selectedStores}
          onChange={(vals) => table.set("storeId", vals[0] ?? "")}
          searchable={storeOptions.length > 4}
          selectionMode="single"
          defaultCollapsed={storeOptions.length > 6}
        />
      ) : null}

      <RangeFilter
        title="Delivery Date Range"
        type="date"
        minValue={table.get("dateFrom")}
        maxValue={table.get("dateTo")}
        onMinChange={(v) => table.set("dateFrom", v)}
        onMaxChange={(v) => table.set("dateTo", v)}
        minPlaceholder={t("minDate")}
        maxPlaceholder={t("maxDate")}
        defaultCollapsed={false}
      />
    </Div>
  );
}
