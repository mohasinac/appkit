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
import { ADMIN_ORDER_STATUS_TABS, ADMIN_ORDER_PAYMENT_REVIEW_TABS } from "../constants/filter-tabs";
import { isManualPaymentMethod, isPaymentReviewQueueMode } from "../../orders/constants/payment-window";
import {
  toRecordArray,
  toRelativeDate,
  toCurrency,
  toStringValue,
  type ListingItemRecord,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { AdminOrderEditorView, type AdminOrderItemRow } from "./AdminOrderEditorView";

interface AdminOrdersResponse {
  orders?: JsonArray;
  meta?: { total?: number };
}

/**
 * `OrderDocument` has no `orderNumber` field — the real item info an order
 * list row should show lives in the denormalized `items[]` snapshot
 * (`productTitle`/`image`), written at order time specifically so list/detail
 * UI never needs an extra product fetch. Falling back to `Order {id}` (a raw
 * GUID) instead was Root Cause Pattern #(order-guid) — see CLAUDE.md.
 */
function toOrderItemRows(item: ListingItemRecord): AdminOrderItemRow[] {
  const items = Array.isArray(item.items) ? item.items : [];
  return items
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry) => ({
      productId: typeof entry.productId === "string" ? entry.productId : "",
      title: typeof entry.productTitle === "string" ? entry.productTitle : "Item",
      image: typeof entry.image === "string" ? entry.image : undefined,
      quantity: typeof entry.quantity === "number" ? entry.quantity : 1,
      unitPrice: typeof entry.unitPrice === "number" ? entry.unitPrice : 0,
      totalPrice: typeof entry.totalPrice === "number" ? entry.totalPrice : 0,
    }));
}

function firstOrderItem(item: ListingItemRecord): { image?: string; title?: string; extraCount: number } {
  const items = toOrderItemRows(item);
  return {
    image: items[0]?.image,
    title: items[0]?.title,
    extraCount: Math.max(0, items.length - 1),
  };
}

/**
 * Short marker appended to a row's secondary line so a manual payment needing
 * action is visible in the list itself, not only after opening the drawer.
 * Mirrors the same `paymentProofUrl` / `paymentReviewOutcome` derivation the
 * server-side queue uses (`listPaymentReviewQueue`) — kept in sync by reading
 * the same two fields rather than a denormalised flag (Root Cause #42).
 */
function paymentReviewLabel(item: ListingItemRecord): string | undefined {
  if (!isManualPaymentMethod(toStringValue(item.paymentMethod, ""))) return undefined;
  if (toStringValue(item.paymentStatus, "") === "paid") return "Payment verified";
  const outcome = toStringValue(item.paymentReviewOutcome, "");
  if (outcome === "rejected_fraud") return "Payment rejected";
  if (outcome === "reupload_requested") return "Re-upload requested";
  return item.paymentProofUrl ? "Awaiting verification" : "Awaiting payment";
}

interface OrderRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  image?: string;
  items: AdminOrderItemRow[];
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
    filterKeys: ["status", "paymentReview"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["admin", "orders", "listing"],
    endpoint: ADMIN_ENDPOINTS.ORDERS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
    ],
    mapRows: (response) =>
      toRecordArray(response.orders).map((item, index) => {
        const orderId = toStringValue(item.id, `order-${index}`);
        const { image, title, extraCount } = firstOrderItem(item);
        return {
          id: orderId,
          primary: title
            ? `${title}${extraCount > 0 ? ` +${extraCount} more` : ""}`
            : `Order ${orderId}`,
          secondary: [
            toStringValue(item.buyerName ?? item.customerName, "Unknown buyer"),
            toCurrency(item.totalAmount ?? item.total ?? item.amount),
            orderId.slice(0, 14),
            paymentReviewLabel(item),
          ]
            .filter(Boolean)
            .join(" · "),
          status: toStringValue(item.status, "Unknown"),
          updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
          image,
          items: toOrderItemRows(item),
          paymentProofUrl: toStringValue(item.paymentProofUrl, "") || undefined,
          paymentTransactionId: toStringValue(item.paymentTransactionId, "") || undefined,
          paymentMethod: toStringValue(item.paymentMethod, "") || undefined,
          paymentStatus: toStringValue(item.paymentStatus, "") || undefined,
          displayedUpiId: toStringValue(item.displayedUpiId, "") || undefined,
          buyerReportedUpiId: toStringValue(item.buyerReportedUpiId, "") || undefined,
          paymentUpiMismatch: Boolean(item.paymentUpiMismatch),
          buyerMarkedPaid: Boolean(item.buyerMarkedPaid),
          buyerFraudAgreementAccepted: Boolean(item.buyerFraudAgreementAccepted),
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
    // The payment-review queue is always `status == pending` by definition, so
    // a status chip on top of it could only ever narrow to zero rows. When the
    // queue is active the status filter is dropped rather than combined.
    buildFilters: (f) => {
      if (isPaymentReviewQueueMode(f.paymentReview ?? "")) return undefined;
      return f.status && f.status !== "All" ? sieveFilter("status", SIEVE_OP.EQ, f.status) : undefined;
    },
    buildExtraParams: (f) =>
      isPaymentReviewQueueMode(f.paymentReview ?? "") ? { paymentReview: f.paymentReview } : undefined,
    // Mirrors the row action's "View full details" entry so the row itself
    // is clickable, not just the overflow menu.
    onRowClick: (row) => {
      setSelectedRow(row);
      setDrawerOpen(true);
    },
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
      <>
        <FilterChipGroup
          label="Status"
          tabs={ADMIN_ORDER_STATUS_TABS}
          value={pendingFilters.status ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, status: id, paymentReview: "" }))}
        />
        <FilterChipGroup
          label="Manual payment"
          tabs={ADMIN_ORDER_PAYMENT_REVIEW_TABS}
          value={pendingFilters.paymentReview ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, paymentReview: id, status: "" }))}
        />
      </>
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
        items={selectedRow?.items}
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
