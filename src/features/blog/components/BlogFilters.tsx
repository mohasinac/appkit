"use client";

import { useTranslations } from "next-intl";
import { FilterFacetSection } from "../../filters/FilterFacetSection";
import { SwitchFilter } from "../../filters/SwitchFilter";
import type { UrlTable } from "../../filters/FilterPanel";

export const BLOG_SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest First" },
  { value: "createdAt", label: "Oldest First" },
  { value: "title", label: "Title A–Z" },
  { value: "-title", label: "Title Z–A" },
  { value: "-views", label: "Most Viewed" },
  { value: "-readTimeMinutes", label: "Longest Read" },
  { value: "-publishedAt", label: "Published: Newest" },
  { value: "publishedAt", label: "Published: Oldest" },
] as const;

export interface BlogFiltersProps {
  table: UrlTable;
  /** "public" hides admin-only fields (status, isFeatured) */
  variant?: "admin" | "public";
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
    <div>
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
    </div>
  );
}
