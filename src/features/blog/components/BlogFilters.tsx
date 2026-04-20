import { useTranslations } from "next-intl";
import { FilterFacetSection } from "../../filters/FilterFacetSection";
import { SwitchFilter } from "../../filters/SwitchFilter";
import type { UrlTable } from "../../filters/FilterPanel";
import { Div } from "../../../ui";

export type BlogFilterVariant = "admin" | "seller" | "public";

export const BLOG_FILTER_KEYS = {
  admin: ["status", "category", "isFeatured"],
  seller: ["status", "category", "isFeatured"],
  public: ["category"],
} as const;

export const BLOG_ADMIN_SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest First" },
  { value: "createdAt", label: "Oldest First" },
  { value: "title", label: "Title A–Z" },
  { value: "-title", label: "Title Z–A" },
  { value: "-views", label: "Most Viewed" },
  { value: "-readTimeMinutes", label: "Longest Read" },
  { value: "-publishedAt", label: "Published: Newest" },
  { value: "publishedAt", label: "Published: Oldest" },
] as const;

export const BLOG_SELLER_SORT_OPTIONS = BLOG_ADMIN_SORT_OPTIONS;

export const BLOG_PUBLIC_SORT_OPTIONS = [
  { value: "-publishedAt", label: "Published: Newest" },
  { value: "publishedAt", label: "Published: Oldest" },
  { value: "-views", label: "Most Viewed" },
  { value: "title", label: "Title A–Z" },
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
          defaultCollapsed={true}
        />
      )}
    </Div>
  );
}
