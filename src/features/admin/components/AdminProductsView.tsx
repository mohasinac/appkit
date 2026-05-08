"use client";

import React from "react";
import { ListingViewShell, Toggle, useToast } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";
import type { AdminListingScaffoldRow } from "./AdminListingScaffold";
import type { AdminTableColumn } from "../types";
import { apiClient } from "../../../http";

export interface AdminProductsViewProps extends ListingViewShellProps {
  actionHref?: string;
  getRowHref?: (row: AdminListingScaffoldRow) => string;
}

interface AdminProductsResponse {
  items?: unknown[];
  total?: number;
}

type ProductRow = AdminListingScaffoldRow;
type FlagField = "featured" | "isPromoted" | "isOnSale" | "isSold";

const FLAG_DEFS: { key: FlagField; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "isPromoted", label: "Promoted" },
  { key: "isOnSale", label: "On Sale" },
  { key: "isSold", label: "Sold" },
];

function buildBaseColumns(): AdminTableColumn<ProductRow>[] {
  return [
    {
      key: "primary",
      header: "Item",
      sortable: true,
      render: (row) => (
        <div className="space-y-1">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{row.primary}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{row.secondary}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      className: "w-36",
      render: (row) => (
        <span className="inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-800 dark:bg-secondary-900/30 dark:text-secondary-300">
          {row.status}
        </span>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      sortable: true,
      className: "w-36",
      render: (row) => (
        <span className="text-sm text-zinc-600 dark:text-zinc-300">{row.updatedAt}</span>
      ),
    },
  ];
}

export function AdminProductsView({ children, actionHref, getRowHref, ...props }: AdminProductsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [overrides, setOverrides] = React.useState<Record<string, Partial<ProductRow>>>({});
  const { showToast } = useToast();

  const filterParts: string[] = [];
  if (statusFilter && statusFilter !== "All") filterParts.push(`status==${statusFilter}`);
  if (typeFilter && typeFilter !== "All") {
    if (typeFilter === "Auctions") filterParts.push("isAuction==true");
    else if (typeFilter === "Pre-orders") filterParts.push("isPreOrder==true");
  }
  const filters = filterParts.join(",") || undefined;

  const { rows: fetchedRows, total, isLoading, errorMessage } = useAdminListingData<
    AdminProductsResponse,
    ProductRow
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
        featured: Boolean(item.featured),
        isPromoted: Boolean(item.isPromoted),
        isOnSale: Boolean(item.isOnSale),
        isSold: Boolean(item.isSold),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });

  const rows: ProductRow[] = fetchedRows.map((r) =>
    overrides[r.id] ? { ...r, ...overrides[r.id] } : r,
  );

  const handleToggle = async (id: string, field: FlagField, value: boolean) => {
    const prev = fetchedRows.find((r) => r.id === id)?.[field];
    setOverrides((o) => ({ ...o, [id]: { ...o[id], [field]: value } }));
    try {
      await apiClient.patch(ADMIN_ENDPOINTS.PRODUCT_BY_ID(id), { [field]: value });
    } catch (err) {
      setOverrides((o) => ({ ...o, [id]: { ...o[id], [field]: prev } }));
      showToast((err as Error)?.message ?? "Failed to update product.", "error");
    }
  };

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  const flagColumn: AdminTableColumn<ProductRow> = {
    key: "flags",
    header: "Flags",
    className: "w-56",
    render: (row) => (
      <div
        className="flex flex-wrap gap-x-3 gap-y-1"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        {FLAG_DEFS.map(({ key, label }) => (
          <Toggle
            key={key}
            size="sm"
            label={label}
            checked={!!row[key]}
            onChange={(v) => { void handleToggle(row.id, key, v); }}
          />
        ))}
      </div>
    ),
  };

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
      columns={[...buildBaseColumns(), flagColumn]}
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
