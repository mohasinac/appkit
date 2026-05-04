import { useTranslations } from "next-intl";
import { FilterFacetSection } from "../../filters/FilterFacetSection";
import { RangeFilter } from "../../filters/RangeFilter";
import { SwitchFilter } from "../../filters/SwitchFilter";
import type { FacetOption } from "../../filters/FilterFacetSection";
import type { UrlTable } from "../../filters/FilterPanel";
import { Div } from "../../../ui";

export type { FacetOption, UrlTable };

export type ProductFilterVariant = "admin" | "seller" | "public";

export const PRODUCT_FILTER_KEYS = {
  admin: [
    "category",
    "condition",
    "minPrice",
    "maxPrice",
    "brand",
    "seller",
    "tags",
    "status",
  ],
  seller: [
    "category",
    "condition",
    "minPrice",
    "maxPrice",
    "brand",
    "tags",
    "status",
  ],
  public: [
    "category",
    "condition",
    "minPrice",
    "maxPrice",
    "brand",
    "seller",
    "tags",
  ],
} as const;

export const PRODUCT_ADMIN_SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest First" },
  { value: "createdAt", label: "Oldest First" },
  { value: "-price", label: "Price: High to Low" },
  { value: "price", label: "Price: Low to High" },
  { value: "title", label: "Title A-Z" },
  { value: "-title", label: "Title Z-A" },
  { value: "-views", label: "Most Viewed" },
] as const;

export const PRODUCT_SELLER_SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest First" },
  { value: "createdAt", label: "Oldest First" },
  { value: "-price", label: "Price: High to Low" },
  { value: "price", label: "Price: Low to High" },
  { value: "title", label: "Title A-Z" },
] as const;

export const PRODUCT_PUBLIC_SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest First" },
  { value: "-price", label: "Price: High to Low" },
  { value: "price", label: "Price: Low to High" },
  { value: "title", label: "Title A-Z" },
  { value: "-views", label: "Most Viewed" },
] as const;

export function getProductFilterKeys(
  variant: ProductFilterVariant,
): readonly string[] {
  return PRODUCT_FILTER_KEYS[variant];
}

export function getProductSortOptions(
  variant: ProductFilterVariant,
): ReadonlyArray<{ value: string; label: string }> {
  switch (variant) {
    case "admin":
      return PRODUCT_ADMIN_SORT_OPTIONS;
    case "seller":
      return PRODUCT_SELLER_SORT_OPTIONS;
    case "public":
      return PRODUCT_PUBLIC_SORT_OPTIONS;
    default:
      return PRODUCT_PUBLIC_SORT_OPTIONS;
  }
}

export interface ProductFiltersProps {
  table: UrlTable;
  categoryOptions?: FacetOption[];
  brandOptions?: FacetOption[];
  /** Store options (formerly sellerOptions) */
  storeOptions?: FacetOption[];
  /** @deprecated use storeOptions */
  sellerOptions?: FacetOption[];
  tagOptions?: FacetOption[];
  showStatus?: boolean;
  variant?: ProductFilterVariant;
  statusOptions?: FacetOption[];
  currencyPrefix?: string;
  /** Show free-shipping toggle */
  showShipping?: boolean;
}

export function ProductFilters({
  table,
  categoryOptions = [],
  brandOptions = [],
  storeOptions = [],
  sellerOptions,
  tagOptions = [],
  showStatus = false,
  variant,
  statusOptions,
  currencyPrefix = "",
  showShipping = true,
}: ProductFiltersProps) {
  const resolvedStoreOptions = storeOptions.length > 0 ? storeOptions : (sellerOptions ?? []);
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
  const selectedSellers = table.get("storeId") ? [table.get("storeId")] : [];
  const selectedConditions = table.get("condition")
    ? table.get("condition").split("|").filter(Boolean)
    : [];
  const selectedTags = table.get("tags")
    ? table.get("tags").split("|").filter(Boolean)
    : [];
  const selectedStatuses = table.get("status")
    ? table.get("status").split("|").filter(Boolean)
    : [];
  const resolvedVariant: ProductFilterVariant =
    variant ?? (showStatus ? "admin" : "public");
  const shouldShowStatus = resolvedVariant !== "public" || showStatus;

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

      <FilterFacetSection
        title={t("condition")}
        options={conditionOptions}
        selected={selectedConditions}
        onChange={(vals) => table.set("condition", vals.join("|"))}
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
        defaultCollapsed={false}
      />

      {brandOptions.length > 0 && (
        <FilterFacetSection
          title={t("brand")}
          options={brandOptions}
          selected={selectedBrands}
          onChange={(vals) => table.set("brand", vals[0] ?? "")}
          searchable={brandOptions.length > 4}
          defaultCollapsed={brandOptions.length > 6}
        />
      )}

      {resolvedStoreOptions.length > 0 && (
        <FilterFacetSection
          title={t("store")}
          options={resolvedStoreOptions}
          selected={selectedSellers}
          onChange={(vals) => table.set("storeId", vals[0] ?? "")}
          searchable={resolvedStoreOptions.length > 4}
          defaultCollapsed={resolvedStoreOptions.length > 6}
        />
      )}

      {showShipping && (
        <SwitchFilter
          title={t("shipping")}
          label={t("freeShippingOnly")}
          checked={table.get("freeShipping") === "true"}
          onChange={(v) => table.set("freeShipping", v ? "true" : "")}
          defaultCollapsed={false}
        />
      )}

      {tagOptions.length > 0 && (
        <FilterFacetSection
          title={t("tags")}
          options={tagOptions}
          selected={selectedTags}
          onChange={(vals) => table.set("tags", vals.join("|"))}
          searchable={tagOptions.length > 4}
          defaultCollapsed={tagOptions.length > 6}
        />
      )}

      {shouldShowStatus && (
        <FilterFacetSection
          title={t("status")}
          options={statusOptions ?? defaultStatusOptions}
          selected={selectedStatuses}
          onChange={(vals) => table.set("status", vals.join("|"))}
          searchable={false}
          defaultCollapsed={false}
        />
      )}
    </Div>
  );
}
