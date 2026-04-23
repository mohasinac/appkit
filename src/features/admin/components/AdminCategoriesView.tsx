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

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminCategoriesResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["admin", "categories", "listing"],
    endpoint: `${CATEGORY_ENDPOINTS.LIST}?flat=true`,
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
      searchPlaceholder="Search categories, slugs, or parent category"
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No categories found"
      resultSummary={`Showing ${rows.length} of ${total} categories`}
    />
  );
}
