"use client"
import { useTranslations } from "next-intl";
import { FilterFacetSection } from "../../filters/FilterFacetSection";
import { RangeFilter } from "../../filters/RangeFilter";
import { SwitchFilter } from "../../filters/SwitchFilter";
import type { FacetOption } from "../../filters/FilterFacetSection";
import type { UrlTable } from "../../filters/FilterPanel";
import { Div } from "../../../ui";
import { TABLE_KEYS } from "../../../constants/table-keys";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { sortBy } from "../../../constants/sort";

export type { FacetOption, UrlTable };

export type ProductFilterVariant = "admin" | "seller" | "public";

export const PRODUCT_FILTER_KEYS = {
  admin: [
    TABLE_KEYS.CATEGORY,
    TABLE_KEYS.CONDITION,
    TABLE_KEYS.MIN_PRICE,
    TABLE_KEYS.MAX_PRICE,
    TABLE_KEYS.BRAND,
    TABLE_KEYS.SELLER,
    TABLE_KEYS.TAGS,
    TABLE_KEYS.STATUS,
  ],
  seller: [
    TABLE_KEYS.CATEGORY,
    TABLE_KEYS.CONDITION,
    TABLE_KEYS.MIN_PRICE,
    TABLE_KEYS.MAX_PRICE,
    TABLE_KEYS.BRAND,
    TABLE_KEYS.TAGS,
    TABLE_KEYS.STATUS,
  ],
  public: [
    TABLE_KEYS.CATEGORY,
    TABLE_KEYS.CONDITION,
    TABLE_KEYS.MIN_PRICE,
    TABLE_KEYS.MAX_PRICE,
    TABLE_KEYS.BRAND,
    TABLE_KEYS.STORE_ID,
    TABLE_KEYS.TAGS,
  ],
} as const;

export const PRODUCT_ADMIN_SORT_OPTIONS = [
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT), label: "Newest First" },
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT, "ASC"), label: "Oldest First" },
  { value: sortBy(PRODUCT_FIELDS.PRICE), label: "Price: High to Low" },
  { value: sortBy(PRODUCT_FIELDS.PRICE, "ASC"), label: "Price: Low to High" },
  { value: sortBy(PRODUCT_FIELDS.TITLE, "ASC"), label: "Title A-Z" },
  { value: sortBy(PRODUCT_FIELDS.TITLE), label: "Title Z-A" },
  { value: sortBy(PRODUCT_FIELDS.VIEW_COUNT), label: "Most Viewed" },
] as const;

export const PRODUCT_SELLER_SORT_OPTIONS = [
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT), label: "Newest First" },
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT, "ASC"), label: "Oldest First" },
  { value: sortBy(PRODUCT_FIELDS.PRICE), label: "Price: High to Low" },
  { value: sortBy(PRODUCT_FIELDS.PRICE, "ASC"), label: "Price: Low to High" },
  { value: sortBy(PRODUCT_FIELDS.TITLE, "ASC"), label: "Title A-Z" },
] as const;

export const PRODUCT_PUBLIC_SORT_OPTIONS = [
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT), label: "Newest First" },
  { value: sortBy(PRODUCT_FIELDS.CREATED_AT, "ASC"), label: "Oldest First" },
  { value: sortBy(PRODUCT_FIELDS.PRICE), label: "Price: High to Low" },
  { value: sortBy(PRODUCT_FIELDS.PRICE, "ASC"), label: "Price: Low to High" },
  { value: sortBy(PRODUCT_FIELDS.TITLE, "ASC"), label: "Title A–Z" },
  { value: sortBy(PRODUCT_FIELDS.TITLE), label: "Title Z–A" },
  { value: sortBy(PRODUCT_FIELDS.VIEW_COUNT), label: "Most Viewed" },
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
    { value: PRODUCT_FIELDS.CONDITION_VALUES.NEW, label: t("conditionNew") },
    { value: PRODUCT_FIELDS.CONDITION_VALUES.USED, label: t("conditionUsed") },
    { value: PRODUCT_FIELDS.CONDITION_VALUES.REFURBISHED, label: t("conditionRefurbished") },
    { value: PRODUCT_FIELDS.CONDITION_VALUES.BROKEN, label: t("conditionBroken") },
  ];

  const defaultStatusOptions: FacetOption[] = [
    { value: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED, label: t("statusPublished") },
    { value: PRODUCT_FIELDS.STATUS_VALUES.DRAFT, label: t("statusDraft") },
    { value: PRODUCT_FIELDS.STATUS_VALUES.OUT_OF_STOCK, label: t("statusOutOfStock") },
  ];

  const selectedCategories = table.get(TABLE_KEYS.CATEGORY)
    ? table.get(TABLE_KEYS.CATEGORY).split("|").filter(Boolean)
    : [];
  const selectedBrands = table.get(TABLE_KEYS.BRAND) ? [table.get(TABLE_KEYS.BRAND)] : [];
  const selectedSellers = table.get(TABLE_KEYS.STORE_ID) ? [table.get(TABLE_KEYS.STORE_ID)] : [];
  const selectedConditions = table.get(TABLE_KEYS.CONDITION)
    ? table.get(TABLE_KEYS.CONDITION).split("|").filter(Boolean)
    : [];
  const selectedTags = table.get(TABLE_KEYS.TAGS)
    ? table.get(TABLE_KEYS.TAGS).split("|").filter(Boolean)
    : [];
  const selectedStatuses = table.get(TABLE_KEYS.STATUS)
    ? table.get(TABLE_KEYS.STATUS).split("|").filter(Boolean)
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
          onChange={(vals) => table.set(TABLE_KEYS.CATEGORY, vals.join("|"))}
          searchable={true}
          defaultCollapsed={categoryOptions.length > 6}
        />
      )}

      <FilterFacetSection
        title={t("condition")}
        options={conditionOptions}
        selected={selectedConditions}
        onChange={(vals) => table.set(TABLE_KEYS.CONDITION, vals.join("|"))}
        searchable={false}
        defaultCollapsed={false}
      />

      <RangeFilter
        title={t("priceRange")}
        minValue={table.get(TABLE_KEYS.MIN_PRICE)}
        maxValue={table.get(TABLE_KEYS.MAX_PRICE)}
        onMinChange={(v) => table.set(TABLE_KEYS.MIN_PRICE, v)}
        onMaxChange={(v) => table.set(TABLE_KEYS.MAX_PRICE, v)}
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
          onChange={(vals) => table.set(TABLE_KEYS.BRAND, vals[0] ?? "")}
          searchable={brandOptions.length > 4}
          defaultCollapsed={brandOptions.length > 6}
        />
      )}

      {resolvedStoreOptions.length > 0 && (
        <FilterFacetSection
          title={t("store")}
          options={resolvedStoreOptions}
          selected={selectedSellers}
          onChange={(vals) => table.set(TABLE_KEYS.STORE_ID, vals[0] ?? "")}
          searchable={resolvedStoreOptions.length > 4}
          defaultCollapsed={resolvedStoreOptions.length > 6}
        />
      )}

      {showShipping && (
        <SwitchFilter
          title={t("shipping")}
          label={t("freeShippingOnly")}
          checked={table.get(TABLE_KEYS.FREE_SHIPPING) === "true"}
          onChange={(v) => table.set(TABLE_KEYS.FREE_SHIPPING, v ? "true" : "")}
          defaultCollapsed={false}
        />
      )}

      {tagOptions.length > 0 && (
        <FilterFacetSection
          title={t("tags")}
          options={tagOptions}
          selected={selectedTags}
          onChange={(vals) => table.set(TABLE_KEYS.TAGS, vals.join("|"))}
          searchable={tagOptions.length > 4}
          defaultCollapsed={tagOptions.length > 6}
        />
      )}

      {shouldShowStatus && (
        <FilterFacetSection
          title={t("status")}
          options={statusOptions ?? defaultStatusOptions}
          selected={selectedStatuses}
          onChange={(vals) => table.set(TABLE_KEYS.STATUS, vals.join("|"))}
          searchable={false}
          defaultCollapsed={false}
        />
      )}
    </Div>
  );
}
