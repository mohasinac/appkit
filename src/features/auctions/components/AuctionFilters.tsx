import { useTranslations } from "next-intl";
import { FilterFacetSection } from "../../filters/FilterFacetSection";
import { RangeFilter } from "../../filters/RangeFilter";
import type { FacetOption } from "../../filters/FilterFacetSection";
import type { UrlTable } from "../../filters/FilterPanel";
import { Div } from "../../../ui";

export interface AuctionFiltersProps {
  table: UrlTable;
  categoryOptions?: FacetOption[];
  storeOptions?: FacetOption[];
  currencyPrefix?: string;
}

export function AuctionFilters({
  table,
  categoryOptions = [],
  storeOptions = [],
  currencyPrefix = "",
}: AuctionFiltersProps) {
  const t = useTranslations("filters");

  const selectedCategories = table.get("category")
    ? table.get("category").split("|").filter(Boolean)
    : [];
  const selectedStores = table.get("storeId")
    ? table.get("storeId").split("|").filter(Boolean)
    : [];

  return (
    <Div>
      {categoryOptions.length > 0 && (
        <FilterFacetSection
          title={t("category")}
          options={categoryOptions}
          selected={selectedCategories}
          onChange={(vals) => table.set("category", vals.join("|"))}
          searchable={true}
          defaultCollapsed={categoryOptions.length > 6}
        />
      )}

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

      {storeOptions.length > 0 && (
        <FilterFacetSection
          title={t("store")}
          options={storeOptions}
          selected={selectedStores}
          onChange={(vals) => table.set("storeId", vals[0] ?? "")}
          searchable={storeOptions.length > 4}
          defaultCollapsed={storeOptions.length > 6}
        />
      )}

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
