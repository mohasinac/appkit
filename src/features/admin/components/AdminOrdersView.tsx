"use client";

import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React, { useState, useCallback } from "react";
import { FilterChipGroup, ListingLayout, useToast } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { apiClient } from "../../../http";
import { QuickEditMenu } from "./QuickEditMenu";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_ORDER_STATUS_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { AdminOrderEditorView } from "./AdminOrderEditorView";

interface AdminOrdersResponse {
  orders?: unknown[];
  meta?: { total?: number };
}

interface OrderRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export type AdminOrdersViewProps = ListingLayoutProps;

export function AdminOrdersView({ children, ...props }: AdminOrdersViewProps) {
  const { showToast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<OrderRow | null>(null);

  const handleQuickStatus = useCallback(
    async (id: string, status: string) => {
      try {
        await apiClient.patch(ADMIN_ENDPOINTS.ORDER_BY_ID(id), { status });
        showToast("Order status updated.", "success");
      } catch (err) {
        showToast((err as Error)?.message ?? "Failed to update order.", "error");
        throw err;
      }
    },
    [showToast],
  );

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminOrdersResponse, OrderRow> = {
    portal: "admin",
    title: "Orders",
    searchPlaceholder: "Search orders, buyers, or tracking IDs",
    emptyLabel: "No orders found",
    filterKeys: ["status"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["admin", "orders", "listing"],
    endpoint: ADMIN_ENDPOINTS.ORDERS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
    ],
    mapRows: (response) =>
      toRecordArray(response.orders).map((item, index) => ({
        id: toStringValue(item.id, `order-${index}`),
        primary: `Order ${toStringValue(item.orderNumber ?? item.id, "-")}`,
        secondary: [
          toStringValue(item.buyerName ?? item.customerName, "Unknown buyer"),
          toRupees(item.totalAmount ?? item.total ?? item.amount),
        ].join(" · "),
        status: toStringValue(item.status, "Unknown"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
    buildFilters: (f) => (f.status && f.status !== "All" ? sieveFilter("status", SIEVE_OP.EQ, f.status) : undefined),
    buildBulkActions: (selection): BulkActionItem[] => [
      {
        id: "mark-shipped",
        label: ACTIONS.ADMIN["mark-shipped"].label,
        variant: "secondary",
        onClick: () => {
          for (const id of selection.selectedIds) void handleQuickStatus(id, "shipped");
          selection.clearSelection();
        },
      },
      {
        id: "mark-delivered",
        label: ACTIONS.ADMIN["mark-delivered"].label,
        variant: "primary",
        onClick: () => {
          for (const id of selection.selectedIds) void handleQuickStatus(id, "delivered");
          selection.clearSelection();
        },
      },
      {
        id: "mark-cancelled",
        label: ACTIONS.ADMIN["cancel-order"].label,
        variant: "danger",
        onClick: () => {
          for (const id of selection.selectedIds) void handleQuickStatus(id, "cancelled");
          selection.clearSelection();
        },
      },
    ],
    renderRowActions: (row) => (
      <QuickEditMenu
        actions={[
          {
            label: "View full details",
            onClick: () => {
              setSelectedRow(row);
              setDrawerOpen(true);
            },
          },
          {
            label: "Update status",
            separator: true,
            formTitle: "Update Order Status",
            fields: [
              {
                name: "status",
                label: "Status",
                type: "select",
                required: true,
                options: ADMIN_ORDER_STATUS_TABS.filter((t) => t.id !== "All").map((t) => ({
                  value: t.id,
                  label: t.label,
                })),
              },
            ],
            defaultValues: { status: row.status },
            onSubmit: (vals) => handleQuickStatus(row.id, String(vals.status ?? "")),
            submitLabel: "Update",
          },
        ]}
      />
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Status"
        tabs={ADMIN_ORDER_STATUS_TABS}
        value={pendingFilters.status ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
      />
    ),
  };

  return (
    <>
      <DataListingView config={config} />
      <AdminOrderEditorView
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        orderId={selectedRow?.id}
        orderLabel={selectedRow?.primary}
        currentStatus={selectedRow?.status}
      />
    </>
  );
}
