"use client";

import React from "react";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";

export interface AdminProductsViewProps extends ListingViewShellProps {
  actionHref?: string;
  getRowHref?: (row: { id: string; primary: string; secondary: string; status: string; updatedAt: string }) => string;
}

interface AdminProductsResponse {
  items?: unknown[];
  total?: number;
}

export function AdminProductsView({ children, actionHref, getRowHref, ...props }: AdminProductsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");

  const filterParts: string[] = [];
  if (statusFilter && statusFilter !== "All") filterParts.push(`status==${statusFilter}`);
  if (typeFilter && typeFilter !== "All") {
    if (typeFilter === "Auctions") filterParts.push("isAuction==true");
    else if (typeFilter === "Pre-orders") filterParts.push("isPreOrder==true");
  }
  const filters = filterParts.join(",") || undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminProductsResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["admin", "products", "listing", q, filters ?? ""],
    endpoint: ADMIN_ENDPOINTS.PRODUCTS,
    filters,
    q,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `product-${index}`),
        primary: toStringValue(item.title ?? item.name, "Untitled product"),
        secondary: [
          toStringValue(item.sellerName, "Unknown seller"),
          toStringValue(item.sku, "No SKU"),
        ].join(" · "),
        status: toStringValue(item.status, "Unknown"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
      })),
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
      title="Product Management"
      subtitle="Review catalogue health, publishing state, and merchandising issues from one queue."
      actionLabel="New product"
      actionHref={actionHref}
      getRowHref={getRowHref}
      searchPlaceholder="Search products, SKUs, or seller names"
      onSearch={setQ}
      searchValue={q}
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No products found"
      resultSummary={`Showing ${rows.length} of ${total} products`}
      filterGroups={[
        {
          title: "Status",
          options: ["All", "pending", "published", "draft", "archived"],
          active: statusFilter || "All",
          onSelect: (opt) => setStatusFilter(opt === "All" ? "" : opt),
        },
        {
          title: "Type",
          options: ["All", "Products", "Auctions", "Pre-orders"],
          active: typeFilter || "All",
          onSelect: (opt) => setTypeFilter(opt === "All" ? "" : opt),
        },
      ]}
    />
  );
}
