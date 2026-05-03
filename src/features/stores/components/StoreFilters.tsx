import { useTranslations } from "next-intl";
import { FilterFacetSection } from "../../filters/FilterFacetSection";
import { RangeFilter } from "../../filters/RangeFilter";
import { SwitchFilter } from "../../filters/SwitchFilter";
import type { UrlTable } from "../../filters/FilterPanel";
import { Div } from "../../../ui";

export interface StoreFiltersProps {
  table: UrlTable;
}

export function StoreFilters({ table }: StoreFiltersProps) {
  const t = useTranslations("filters");

  const ratingOptions = [
    { value: "5", label: t("rating5Stars") },
    { value: "4", label: t("rating4Stars") },
    { value: "3", label: t("rating3Stars") },
    { value: "2", label: t("rating2Stars") },
    { value: "1", label: t("rating1Star") },
  ];

  const selectedRatings = table.get("rating")
    ? table.get("rating").split("|").filter(Boolean)
    : [];

  return (
    <Div>
      <FilterFacetSection
        title={t("rating")}
        options={ratingOptions}
        selected={selectedRatings}
        onChange={(vals) => table.set("rating", vals.join("|"))}
        searchable={false}
        defaultCollapsed={false}
      />

      <RangeFilter
        title={t("productCount")}
        minValue={table.get("minProductCount")}
        maxValue={table.get("maxProductCount")}
        onMinChange={(v) => table.set("minProductCount", v)}
        onMaxChange={(v) => table.set("maxProductCount", v)}
        minBound={0}
        maxBound={10000}
        step={10}
        minPlaceholder={t("minProductCount")}
        maxPlaceholder={t("maxProductCount")}
        defaultCollapsed={true}
      />

      <SwitchFilter
        title={t("featured")}
        label={t("showFeaturedOnly")}
        checked={table.get("featured") === "true"}
        onChange={(v) => table.set("featured", v ? "true" : "")}
        defaultCollapsed={true}
      />
    </Div>
  );
}
