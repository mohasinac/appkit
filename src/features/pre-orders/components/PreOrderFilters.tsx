import { useTranslations } from "next-intl";
import { FilterFacetSection } from "../../filters/FilterFacetSection";
import { RangeFilter } from "../../filters/RangeFilter";
import type { FacetOption } from "../../filters/FilterFacetSection";
import type { UrlTable } from "../../filters/FilterPanel";
import { Div } from "../../../ui";

export interface PreOrderFiltersProps {
  table: UrlTable;
  storeOptions?: FacetOption[];
  currencyPrefix?: string;
}

export function PreOrderFilters({
  table,
  storeOptions = [],
  currencyPrefix = "",
}: PreOrderFiltersProps) {
  const t = useTranslations("filters");

  const statusOptions: FacetOption[] = [
    { value: "active", label: t("preOrderStatusActive") },
    { value: "upcoming", label: t("preOrderStatusUpcoming") },
    { value: "closed", label: t("preOrderStatusClosed") },
    { value: "cancelled", label: t("preOrderStatusCancelled") },
  ];

  const selectedStatuses = table.get("preOrderStatus")
    ? table.get("preOrderStatus").split("|").filter(Boolean)
    : [];
  const selectedStores = table.get("store")
    ? table.get("store").split("|").filter(Boolean)
    : [];

  return (
    <Div>
      <FilterFacetSection
        title={t("preOrderStatus")}
        options={statusOptions}
        selected={selectedStatuses}
        onChange={(vals) => table.set("preOrderStatus", vals.join("|"))}
        searchable={false}
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
        step={500}
        minPlaceholder={t("minPrice")}
        maxPlaceholder={t("maxPrice")}
        defaultCollapsed={true}
      />

      {storeOptions.length > 0 && (
        <FilterFacetSection
          title={t("store")}
          options={storeOptions}
          selected={selectedStores}
          onChange={(vals) => table.set("store", vals.join("|"))}
          searchable={storeOptions.length > 6}
          defaultCollapsed={true}
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
        defaultCollapsed={true}
      />
    </Div>
  );
}
