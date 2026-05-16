"use client"
import { useTranslations } from "next-intl";
import { FilterFacetSection } from "../../filters/FilterFacetSection";
import { AsyncFacetSection } from "../../filters/AsyncFacetSection";
import { RangeFilter } from "../../filters/RangeFilter";
import type { FacetOption } from "../../filters/FilterFacetSection";
import type { UrlTable } from "../../filters/FilterPanel";
import type { AsyncFacetSectionProps } from "../../filters/AsyncFacetSection";
import { Div } from "../../../ui";

type LoadOptionsFn = AsyncFacetSectionProps["loadOptions"];

export interface AuctionFiltersProps {
  table: UrlTable;
  categoryOptions?: FacetOption[];
  brandOptions?: FacetOption[];
  storeOptions?: FacetOption[];
  loadCategoryOptions?: LoadOptionsFn;
  loadBrandOptions?: LoadOptionsFn;
  loadStoreOptions?: LoadOptionsFn;
  currencyPrefix?: string;
}

export function AuctionFilters({
  table,
  categoryOptions = [],
  brandOptions = [],
  storeOptions = [],
  loadCategoryOptions,
  loadBrandOptions,
  loadStoreOptions,
  currencyPrefix = "",
}: AuctionFiltersProps) {
  const t = useTranslations("filters");

  const selectedCategories = table.get("category")
    ? table.get("category").split("|").filter(Boolean)
    : [];
  const selectedBrands = table.get("brand") ? [table.get("brand")] : [];
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

      <RangeFilter
        title={t("bidPriceRange")}
        minValue={table.get("minBid")}
        maxValue={table.get("maxBid")}
        onMinChange={(v) => table.set("minBid", v)}
        onMaxChange={(v) => table.set("maxBid", v)}
        prefix={currencyPrefix}
        showSlider
        minBound={0}
        maxBound={500000}
        step={500}
        minPlaceholder={t("minBidPrice")}
        maxPlaceholder={t("maxBidPrice")}
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
          defaultCollapsed={storeOptions.length > 6}
        />
      ) : null}

      <RangeFilter
        title={t("dateRange")}
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
