"use client";

import { useTranslations } from "next-intl";
import { FilterFacetSection } from "../../filters/FilterFacetSection";
import { SwitchFilter } from "../../filters/SwitchFilter";
import type { UrlTable } from "../../filters/FilterPanel";
import { Div } from "../../../ui";

export type CategoryFilterVariant = "admin" | "seller" | "public";

export const CATEGORY_FILTER_KEYS = {
  admin: [
    "tier",
    "isFeatured",
    "isBrand",
    "isActive",
    "isSearchable",
    "isLeaf",
  ],
  seller: ["tier", "isFeatured", "isBrand", "isActive"],
  public: ["tier", "isFeatured", "isBrand"],
} as const;

export const CATEGORY_ADMIN_SORT_OPTIONS = [
  { value: "order", label: "Order Asc" },
  { value: "-order", label: "Order Desc" },
  { value: "name", label: "Name A-Z" },
  { value: "-name", label: "Name Z-A" },
  { value: "tier", label: "Tier Low to High" },
  { value: "-tier", label: "Tier High to Low" },
  { value: "-metrics.totalItemCount", label: "Most Items" },
  { value: "-createdAt", label: "Newest First" },
] as const;

export const CATEGORY_SELLER_SORT_OPTIONS = [
  { value: "order", label: "Order Asc" },
  { value: "name", label: "Name A-Z" },
  { value: "-name", label: "Name Z-A" },
  { value: "-metrics.totalItemCount", label: "Most Items" },
] as const;

export const CATEGORY_PUBLIC_SORT_OPTIONS = [
  { value: "order", label: "Recommended" },
  { value: "name", label: "Name A-Z" },
  { value: "-name", label: "Name Z-A" },
  { value: "-metrics.totalItemCount", label: "Most Items" },
] as const;

export function getCategoryFilterKeys(
  variant: CategoryFilterVariant,
): readonly string[] {
  return CATEGORY_FILTER_KEYS[variant];
}

export function getCategorySortOptions(
  variant: CategoryFilterVariant,
): ReadonlyArray<{
  value: string;
  label: string;
}> {
  switch (variant) {
    case "admin":
      return CATEGORY_ADMIN_SORT_OPTIONS;
    case "seller":
      return CATEGORY_SELLER_SORT_OPTIONS;
    case "public":
      return CATEGORY_PUBLIC_SORT_OPTIONS;
    default:
      return CATEGORY_PUBLIC_SORT_OPTIONS;
  }
}

export interface CategoryFiltersProps {
  table: UrlTable;
  variant?: CategoryFilterVariant;
}

export function CategoryFilters({
  table,
  variant = "admin",
}: CategoryFiltersProps) {
  const t = useTranslations("filters");
  const tr = (key: string, fallback: string) =>
    t.has(key) ? t(key) : fallback;

  const tierOptions = [
    { value: "0", label: tr("tierRoot", "Root") },
    { value: "1", label: tr("tierLevel1", "Level 1") },
    { value: "2", label: tr("tierLevel2", "Level 2") },
    { value: "3", label: tr("tierLevel3", "Level 3") },
    { value: "4", label: tr("tierLevel4", "Level 4") },
  ];

  const selectedTier = table.get("tier")
    ? table.get("tier").split("|").filter(Boolean)
    : [];

  const featuredOnly = table.get("isFeatured") === "true";
  const brandOnly = table.get("isBrand") === "true";
  const activeOnly = table.get("isActive") === "true";
  const searchableOnly = table.get("isSearchable") === "true";
  const leafOnly = table.get("isLeaf") === "true";

  return (
    <Div>
      <FilterFacetSection
        title={tr("tier", "Tier")}
        options={tierOptions}
        selected={selectedTier}
        onChange={(vals) => table.set("tier", vals.join("|"))}
        searchable={false}
        defaultCollapsed={variant !== "admin"}
      />

      <SwitchFilter
        title={tr("featured", "Featured")}
        label={tr("showFeaturedOnly", "Show featured only")}
        checked={featuredOnly}
        onChange={(v: boolean) => table.set("isFeatured", v ? "true" : "")}
        defaultCollapsed={true}
      />

      <SwitchFilter
        title={tr("brand", "Brand")}
        label={tr("showBrandsOnly", "Show brands only")}
        checked={brandOnly}
        onChange={(v: boolean) => table.set("isBrand", v ? "true" : "")}
        defaultCollapsed={true}
      />

      {variant !== "public" && (
        <SwitchFilter
          title={tr("status", "Status")}
          label={tr("showActiveOnly", "Show active only")}
          checked={activeOnly}
          onChange={(v: boolean) => table.set("isActive", v ? "true" : "")}
          defaultCollapsed={true}
        />
      )}

      {variant === "admin" && (
        <>
          <SwitchFilter
            title={tr("searchable", "Searchable")}
            label={tr("showSearchableOnly", "Show searchable only")}
            checked={searchableOnly}
            onChange={(v: boolean) =>
              table.set("isSearchable", v ? "true" : "")
            }
            defaultCollapsed={true}
          />

          <SwitchFilter
            title={tr("leaf", "Leaf")}
            label={tr("showLeafOnly", "Show leaf only")}
            checked={leafOnly}
            onChange={(v: boolean) => table.set("isLeaf", v ? "true" : "")}
            defaultCollapsed={true}
          />
        </>
      )}
    </Div>
  );
}
