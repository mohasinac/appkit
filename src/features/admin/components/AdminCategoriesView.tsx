"use client";

import React from "react";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { CATEGORY_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";

export interface AdminCategoriesViewProps extends ListingViewShellProps {}

interface AdminCategoriesResponse {
  data?: unknown;
  items?: unknown[];
  total?: number;
}

export function AdminCategoriesView({
  children,
  ...props
}: AdminCategoriesViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [q, setQ] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState("");
  const [featuredFilter, setFeaturedFilter] = React.useState("");

  const filterParts: string[] = [];
  if (activeFilter && activeFilter !== "All") {
    filterParts.push(activeFilter === "Active" ? "isActive==true" : "isActive==false");
  }
  if (featuredFilter && featuredFilter !== "All") filterParts.push("isFeatured==true");
  const filters = filterParts.join(",") || undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminCategoriesResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["admin", "categories", "listing", q, filters ?? ""],
    endpoint: `${CATEGORY_ENDPOINTS.LIST}?flat=true`,
    filters,
    q,
    mapRows: (response) => {
      const sourceItems = Array.isArray(response.data)
        ? response.data
        : response.items;

      return toRecordArray(sourceItems).map((item, index) => {
        const tierValue = typeof item.tier === "number" ? String(item.tier) : "-";
        const slugValue = toStringValue(item.slug, "no-slug");
        const parentValue = toStringValue(item.parentId, "root");
        const orderValue =
          typeof item.order === "number" ? String(item.order) : "-";

        return {
          id: toStringValue(item.id, `category-${index}`),
          primary: toStringValue(item.name, "Untitled category"),
          secondary: `Slug: ${slugValue} · Tier: ${tierValue} · Parent: ${parentValue} · Order: ${orderValue}`,
          status:
            typeof item.isActive === "boolean"
              ? item.isActive
                ? "Active"
                : "Inactive"
              : toStringValue(item.status, "Active"),
          updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        };
      });
    },
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  return (
    <AdminListingScaffold
      portal="admin"
      {...props}
      title="Category Management"
      subtitle="Organize taxonomy hierarchy, slug readiness, and active visibility from the shared listing scaffold."
      actionLabel="New category"
      actionHref="/admin/categories/new"
      searchPlaceholder="Search categories, slugs, or parent category"
      onSearch={setQ}
      searchValue={q}
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No categories found"
      resultSummary={`Showing ${rows.length} of ${total} categories`}
      filterGroups={[
        {
          title: "Active",
          options: ["All", "Active", "Inactive"],
          active: activeFilter || "All",
          onSelect: (opt) => setActiveFilter(opt === "All" ? "" : opt),
        },
        {
          title: "Featured",
          options: ["All", "Featured Only"],
          active: featuredFilter || "All",
          onSelect: (opt) => setFeaturedFilter(opt === "All" ? "" : opt),
        },
      ]}
    />
  );
}
