"use client";
import { useTranslations } from "next-intl";
import { FilterFacetSection } from "../../filters/FilterFacetSection";
import { SwitchFilter } from "../../filters/SwitchFilter";
import type { UrlTable } from "../../filters/FilterPanel";
import { Div } from "../../../ui";

export interface AddressFiltersProps {
  table: UrlTable;
}

export function AddressFilters({ table }: AddressFiltersProps) {
  const t = useTranslations("filters");

  const typeOptions = [
    { value: "home", label: t("addressTypeHome") },
    { value: "work", label: t("addressTypeWork") },
    { value: "shipping", label: t("addressTypeShipping") },
    { value: "billing", label: t("addressTypeBilling") },
    { value: "business", label: t("addressTypeBusiness") },
    { value: "other", label: t("addressTypeOther") },
  ];

  const selectedTypes = table.get("addressType")
    ? table.get("addressType").split("|").filter(Boolean)
    : [];

  return (
    <Div>
      <FilterFacetSection
        title={t("addressType")}
        options={typeOptions}
        selected={selectedTypes}
        onChange={(vals) => table.set("addressType", vals.join("|"))}
        searchable={false}
        defaultCollapsed={false}
      />

      <SwitchFilter
        title={t("addressVerified")}
        label={t("showVerifiedAddressOnly")}
        checked={table.get("verified") === "true"}
        onChange={(v) => table.set("verified", v ? "true" : "")}
        defaultCollapsed={true}
      />

      <SwitchFilter
        title={t("addressActive")}
        label={t("showActiveAddressOnly")}
        checked={table.get("activeOnly") === "true"}
        onChange={(v) => table.set("activeOnly", v ? "true" : "")}
        defaultCollapsed={true}
      />
    </Div>
  );
}
