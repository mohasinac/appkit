"use client";

import React from "react";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";

export interface AdminBrandsViewProps extends ListingViewShellProps {}

interface AdminBrandsResponse {
  items?: unknown[];
  total?: number;
}

export function AdminBrandsView({ ...props }: AdminBrandsViewProps) {
  const [q, setQ] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState("");

  const filterParts: string[] = [];
  if (activeFilter && activeFilter !== "All") {
    filterParts.push(activeFilter === "Active" ? "isActive==true" : "isActive==false");
  }
  const filters = filterParts.join(",") || undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminBrandsResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["admin", "brands", "listing", q, filters ?? ""],
    endpoint: ADMIN_ENDPOINTS.BRANDS,
    filters,
    q,
    mapRows: (response) => {
      return toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `brand-${index}`),
        primary: toStringValue(item.name, "Untitled brand"),
        secondary: `Slug: ${toStringValue(item.slug, "no-slug")}${item.website ? ` · ${item.website}` : ""}`,
        status:
          typeof item.isActive === "boolean"
            ? item.isActive
              ? "Active"
              : "Inactive"
            : "Active",
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
      }));
    },
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });

  return (
    <AdminListingScaffold
      portal="admin"
      {...props}
      title="Brand Management"
      subtitle="Manage brands referenced across products, homepage sections, and franchise listings."
      actionLabel="New brand"
      actionHref="/admin/brands/new"
      searchPlaceholder="Search brands by name or slug"
      onSearch={setQ}
      searchValue={q}
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No brands found"
      resultSummary={`Showing ${rows.length} of ${total} brands`}
      filterGroups={[
        {
          title: "Status",
          options: ["All", "Active", "Inactive"],
          active: activeFilter || "All",
          onSelect: (opt) => setActiveFilter(opt === "All" ? "" : opt),
        },
      ]}
    />
  );
}
