"use client";
import { useTranslations } from "next-intl";
import { FilterFacetSection } from "../../filters/FilterFacetSection";
import { RangeFilter } from "../../filters/RangeFilter";
import { SwitchFilter } from "../../filters/SwitchFilter";
import type { UrlTable } from "../../filters/FilterPanel";
import { Div } from "../../../ui";
import { TABLE_KEYS } from "../../../constants/table-keys";
import { BLOG_FIELDS } from "../../../constants/field-names";
import { sortBy } from "../../../constants/sort";

export type BlogFilterVariant = "admin" | "seller" | "public";

export const BLOG_FILTER_KEYS = {
  admin: [TABLE_KEYS.STATUS, TABLE_KEYS.CATEGORY, TABLE_KEYS.IS_FEATURED],
  seller: [TABLE_KEYS.STATUS, TABLE_KEYS.CATEGORY, TABLE_KEYS.IS_FEATURED],
  public: [TABLE_KEYS.CATEGORY],
} as const;

export const BLOG_ADMIN_SORT_OPTIONS = [
  { value: sortBy(BLOG_FIELDS.CREATED_AT), label: "Newest First" },
  { value: sortBy(BLOG_FIELDS.CREATED_AT, "ASC"), label: "Oldest First" },
  { value: sortBy(BLOG_FIELDS.TITLE, "ASC"), label: "Title A–Z" },
  { value: sortBy(BLOG_FIELDS.TITLE), label: "Title Z–A" },
  { value: sortBy(BLOG_FIELDS.VIEWS), label: "Most Viewed" },
  { value: sortBy(BLOG_FIELDS.READ_TIME_MINUTES), label: "Longest Read" },
  { value: sortBy(BLOG_FIELDS.PUBLISHED_AT), label: "Published: Newest" },
  { value: sortBy(BLOG_FIELDS.PUBLISHED_AT, "ASC"), label: "Published: Oldest" },
] as const;

export const BLOG_SELLER_SORT_OPTIONS = BLOG_ADMIN_SORT_OPTIONS;

export const BLOG_PUBLIC_SORT_OPTIONS = [
  { value: sortBy(BLOG_FIELDS.PUBLISHED_AT), label: "Published: Newest" },
  { value: sortBy(BLOG_FIELDS.PUBLISHED_AT, "ASC"), label: "Published: Oldest" },
  { value: sortBy(BLOG_FIELDS.VIEWS), label: "Most Viewed" },
  { value: sortBy(BLOG_FIELDS.TITLE, "ASC"), label: "Title A–Z" },
] as const;

// Backward-compatible alias.
export const BLOG_SORT_OPTIONS = BLOG_ADMIN_SORT_OPTIONS;

export function getBlogFilterKeys(
  variant: BlogFilterVariant,
): readonly string[] {
  return BLOG_FILTER_KEYS[variant];
}

export function getBlogSortOptions(variant: BlogFilterVariant): ReadonlyArray<{
  value: string;
  label: string;
}> {
  switch (variant) {
    case "admin":
      return BLOG_ADMIN_SORT_OPTIONS;
    case "seller":
      return BLOG_SELLER_SORT_OPTIONS;
    case "public":
      return BLOG_PUBLIC_SORT_OPTIONS;
    default:
      return BLOG_PUBLIC_SORT_OPTIONS;
  }
}

export interface BlogFiltersProps {
  table: UrlTable;
  /** "public" hides admin-only fields (status, isFeatured) */
  variant?: BlogFilterVariant;
}

export function BlogFilters({ table, variant = "admin" }: BlogFiltersProps) {
  const t = useTranslations("filters");

  const statusOptions = [
    { value: "draft", label: t("blogStatusDraft") },
    { value: "published", label: t("blogStatusPublished") },
    { value: "archived", label: t("blogStatusArchived") },
  ];

  const categoryOptions = [
    { value: "news", label: t("blogCategoryNews") },
    { value: "tips", label: t("blogCategoryTips") },
    { value: "guides", label: t("blogCategoryGuides") },
    { value: "updates", label: t("blogCategoryUpdates") },
    { value: "community", label: t("blogCategoryCommunity") },
  ];

  const selectedStatus = table.get("status")
    ? table.get("status").split("|").filter(Boolean)
    : [];
  const selectedCategory = table.get("category")
    ? table.get("category").split("|").filter(Boolean)
    : [];

  return (
    <Div>
      {variant !== "public" && (
        <FilterFacetSection
          title={t("status")}
          options={statusOptions}
          selected={selectedStatus}
          onChange={(vals) => table.set("status", vals.join("|"))}
          searchable={false}
          defaultCollapsed={false}
        />
      )}

      <FilterFacetSection
        title={t("category")}
        options={categoryOptions}
        selected={selectedCategory}
        onChange={(vals) => table.set("category", vals.join("|"))}
        searchable={false}
        defaultCollapsed={variant !== "public"}
      />

      {variant !== "public" && (
        <SwitchFilter
          title={t("isFeatured")}
          label={t("showFeaturedOnly")}
          checked={table.get("isFeatured") === "true"}
          onChange={(v: boolean) => table.set("isFeatured", v ? "true" : "")}
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

      <RangeFilter
        title={t("votesRange")}
        minValue={table.get("minVotes")}
        maxValue={table.get("maxVotes")}
        onMinChange={(v) => table.set("minVotes", v)}
        onMaxChange={(v) => table.set("maxVotes", v)}
        minBound={0}
        maxBound={100000}
        step={10}
        minPlaceholder={t("minVotes")}
        maxPlaceholder={t("maxVotes")}
        defaultCollapsed={true}
      />
    </Div>
  );
}
