"use client";

import React from "react";
import { ListingViewShell, RowActionMenu } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";
import { AdminStoreEditorView } from "./AdminStoreEditorView";

export interface AdminStoresViewProps extends ListingViewShellProps {}

interface AdminStoresResponse {
  items?: unknown[];
  total?: number;
}

interface StoreRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw?: Record<string, unknown>;
}

export function AdminStoresView({ children, ...props }: AdminStoresViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<StoreRow | null>(null);

  const filterParts: string[] = [];
  if (statusFilter && statusFilter !== "All") filterParts.push(`status==${statusFilter}`);
  const filters = filterParts.join(",") || undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminStoresResponse,
    StoreRow
  >({
    queryKey: ["admin", "stores", "listing", q, filters ?? ""],
    endpoint: ADMIN_ENDPOINTS.STORES,
    filters,
    q,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `store-${index}`),
        primary: toStringValue(item.storeName, "Unnamed store"),
        secondary: [
          toStringValue(item.storeSlug, "No slug"),
          toStringValue(item.ownerId, "No owner"),
        ].join(" · "),
        status: toStringValue(item.status, "Pending"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        _raw: item,
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  const rowActions = (row: StoreRow) => [
    {
      label: "Manage",
      onClick: () => {
        setSelectedRow(row);
        setDrawerOpen(true);
      },
    },
  ];

  return (
    <>
      <AdminListingScaffold
        portal="admin"
        {...props}
        title="Store Directory"
        subtitle="Review seller storefront health, verification, and merchandising quality."
        searchPlaceholder="Search stores, slugs, or owner names"
        onSearch={setQ}
        searchValue={q}
        rows={rows}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyLabel="No stores found"
        resultSummary={`Showing ${rows.length} of ${total} stores`}
        filterGroups={[
          {
            title: "Status",
            options: ["All", "active", "pending", "suspended", "rejected"],
            active: statusFilter || "All",
            onSelect: (opt) => setStatusFilter(opt === "All" ? "" : opt),
          },
        ]}
        renderRowActions={(row) => (
          <RowActionMenu actions={rowActions(row as StoreRow)} />
        )}
      />

      <AdminStoreEditorView
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        storeId={selectedRow?.id}
        storeName={selectedRow?.primary}
        currentStatus={selectedRow?.status?.toLowerCase()}
        currentIsVerified={Boolean(selectedRow?._raw?.isVerified)}
      />
    </>
  );
}
