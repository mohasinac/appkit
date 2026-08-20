"use client";

import { sieveFilter, SIEVE_OP, type JsonArray } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FilterChipGroup, ListingLayout, useToast } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { apiClient } from "../../../http";
import { QuickEditMenu } from "./QuickEditMenu";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROUTES } from "../../../next/routing/route-map";
import { ADMIN_BULK_ACTIONS, ROW_ACTION_META, ROW_ACTION_ID } from "../../products/constants/action-defs";
import { ADMIN_ORDER_STATUS_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toCurrency,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { AdminOrderEditorView } from "./AdminOrderEditorView";

interface AdminOrdersResponse {
  orders?: JsonArray;
  meta?: { total?: number };
}

interface OrderRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  paymentProofUrl?: string;
  paymentTransactionId?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  displayedUpiId?: string;
  buyerReportedUpiId?: string;
  paymentUpiMismatch?: boolean;
  buyerMarkedPaid?: boolean;
  buyerFraudAgreementAccepted?: boolean;
}

export type AdminOrdersViewProps = ListingLayoutProps;

export function AdminOrdersView({ children, ...props }: AdminOrdersViewProps) {
  const { showToast } = useToast();
  const router = useRouter();
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
          toCurrency(item.totalAmount ?? item.total ?? item.amount),
        ].join(" · "),
        status: toStringValue(item.status, "Unknown"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        paymentProofUrl: toStringValue(item.paymentProofUrl, "") || undefined,
        paymentTransactionId: toStringValue(item.paymentTransactionId, "") || undefined,
        paymentMethod: toStringValue(item.paymentMethod, "") || undefined,
        paymentStatus: toStringValue(item.paymentStatus, "") || undefined,
        displayedUpiId: toStringValue(item.displayedUpiId, "") || undefined,
        buyerReportedUpiId: toStringValue(item.buyerReportedUpiId, "") || undefined,
        paymentUpiMismatch: Boolean(item.paymentUpiMismatch),
        buyerMarkedPaid: Boolean(item.buyerMarkedPaid),
        buyerFraudAgreementAccepted: Boolean(item.buyerFraudAgreementAccepted),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
    buildFilters: (f) => (f.status && f.status !== "All" ? sieveFilter("status", SIEVE_OP.EQ, f.status) : undefined),
    // Rule #7: bulk-action array sourced from the ADMIN_BULK_ACTIONS preset.
    buildBulkActions: (selection): BulkActionItem[] => {
      const statusByAction: Record<(typeof ADMIN_BULK_ACTIONS.orders)[number], string> = {
        [ROW_ACTION_ID.MARK_SHIPPED]: "shipped",
        [ROW_ACTION_ID.MARK_DELIVERED]: "delivered",
        [ROW_ACTION_ID.CANCEL]: "cancelled",
      };
      const variantByAction: Record<(typeof ADMIN_BULK_ACTIONS.orders)[number], "secondary" | "primary" | "danger"> = {
        [ROW_ACTION_ID.MARK_SHIPPED]: "secondary",
        [ROW_ACTION_ID.MARK_DELIVERED]: "primary",
        [ROW_ACTION_ID.CANCEL]: "danger",
      };
      return ADMIN_BULK_ACTIONS.orders.map((id) => ({
        id,
        label: ROW_ACTION_META[id].label,
        variant: variantByAction[id],
        onClick: () => {
          for (const rowId of selection.selectedIds) void handleQuickStatus(rowId, statusByAction[id]);
          selection.clearSelection();
        },
      }));
    },
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
            label: "Open full page",
            onClick: () => router.push(String(ROUTES.ADMIN.ORDER_DETAIL(row.id))),
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
        paymentProofUrl={selectedRow?.paymentProofUrl}
        paymentTransactionId={selectedRow?.paymentTransactionId}
        paymentMethod={selectedRow?.paymentMethod}
        paymentStatus={selectedRow?.paymentStatus}
        displayedUpiId={selectedRow?.displayedUpiId}
        buyerReportedUpiId={selectedRow?.buyerReportedUpiId}
        paymentUpiMismatch={selectedRow?.paymentUpiMismatch}
        buyerMarkedPaid={selectedRow?.buyerMarkedPaid}
        buyerFraudAgreementAccepted={selectedRow?.buyerFraudAgreementAccepted}
      />
    </>
  );
}
