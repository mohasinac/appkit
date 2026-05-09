"use client";

import React from "react";
import { ListingViewShell, RowActionMenu } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";
import { AdminOrderEditorView } from "./AdminOrderEditorView";

export interface AdminOrdersViewProps extends ListingViewShellProps {}

interface AdminOrdersResponse {
  orders?: unknown[];
  meta?: {
    total?: number;
  };
}

interface OrderRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw?: Record<string, unknown>;
}

export function AdminOrdersView({ children, ...props }: AdminOrdersViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<OrderRow | null>(null);

  const filters = statusFilter && statusFilter !== "All"
    ? `status==${statusFilter}`
    : undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminOrdersResponse,
    OrderRow
  >({
    queryKey: ["admin", "orders", "listing", q, filters ?? ""],
    endpoint: ADMIN_ENDPOINTS.ORDERS,
    filters,
    q,
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
        _raw: item,
      })),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number"
        ? response.meta.total
        : mappedRows.length,
  });

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  const rowActions = (row: OrderRow) => [
    {
      label: "Update order",
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
        title="Order Operations"
        subtitle="Track payment, fulfillment, and delivery exceptions across the marketplace."
        actionLabel="Export orders"
        searchPlaceholder="Search orders, buyers, or tracking IDs"
        onSearch={setQ}
        searchValue={q}
        rows={rows}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyLabel="No orders found"
        resultSummary={`Showing ${rows.length} of ${total} orders`}
        filterGroups={[
          {
            title: "Status",
            options: ["All", "PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED", "RETURN_REQUESTED"],
            active: statusFilter || "All",
            onSelect: (opt) => setStatusFilter(opt === "All" ? "" : opt),
          },
        ]}
        renderRowActions={(row) => (
          <RowActionMenu actions={rowActions(row as OrderRow)} />
        )}
      />

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
