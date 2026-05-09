"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ConfirmDeleteModal,
  RowActionMenu,
  useToast,
} from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";
import { apiClient } from "../../../http";

interface AdminOrdersResponse {
  items?: unknown[];
  total?: number;
}

interface ReturnRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw?: Record<string, unknown>;
}

export interface AdminReturnRequestsViewProps {
  children?: React.ReactNode;
}

export function AdminReturnRequestsView({ children }: AdminReturnRequestsViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<ReturnRow | null>(null);

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminOrdersResponse,
    ReturnRow
  >({
    queryKey: ["admin", "return-requests", "listing"],
    endpoint: `${ADMIN_ENDPOINTS.ORDERS}?status=RETURN_REQUESTED`,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `order-${index}`),
        primary: toStringValue(item.id, "Unknown order"),
        secondary: [
          toStringValue(item.buyerName ?? item.buyerId, "Unknown buyer"),
          toRupees(item.totalAmount),
        ].join(" · "),
        status: toStringValue(item.status, "RETURN_REQUESTED"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        _raw: item,
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });

  const approveMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await apiClient.patch(ADMIN_ENDPOINTS.ORDER_BY_ID(orderId), { status: "REFUNDED" });
    },
    onSuccess: () => {
      showToast("Return approved — order marked as Refunded.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "return-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      setApproveOpen(false);
      setSelectedRow(null);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to approve return.", "error");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await apiClient.patch(ADMIN_ENDPOINTS.ORDER_BY_ID(orderId), { status: "DELIVERED" });
    },
    onSuccess: () => {
      showToast("Return rejected — order reverted to Delivered.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "return-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      setRejectOpen(false);
      setSelectedRow(null);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to reject return.", "error");
    },
  });

  return (
    <>
      <AdminListingScaffold
        portal="admin"
        title="Return Requests"
        subtitle="Orders where the buyer has requested a return. Approve to issue a refund, or reject to revert to Delivered."
        searchPlaceholder="Search by order ID or buyer"
        emptyLabel="No return requests"
        rows={rows}
        isLoading={isLoading}
        errorMessage={errorMessage}
        resultSummary={`${total} return request${total === 1 ? "" : "s"}`}
        renderRowActions={(row) => {
          const rr = row as ReturnRow;
          return (
            <RowActionMenu
              actions={[
                {
                  label: "Approve return",
                  onClick: () => {
                    setSelectedRow(rr);
                    setApproveOpen(true);
                  },
                },
                {
                  label: "Reject return",
                  destructive: true,
                  onClick: () => {
                    setSelectedRow(rr);
                    setRejectOpen(true);
                  },
                },
              ]}
            />
          );
        }}
      />

      <ConfirmDeleteModal
        isOpen={approveOpen}
        onClose={() => {
          setApproveOpen(false);
          setSelectedRow(null);
        }}
        onConfirm={() => {
          if (selectedRow) approveMutation.mutate(selectedRow.id);
        }}
        isDeleting={approveMutation.isPending}
        title="Approve return request?"
        message="The order status will be updated to Refunded. The buyer will be notified and the refund process will begin."
        confirmText="Approve return"
        variant="primary"
      />

      <ConfirmDeleteModal
        isOpen={rejectOpen}
        onClose={() => {
          setRejectOpen(false);
          setSelectedRow(null);
        }}
        onConfirm={() => {
          if (selectedRow) rejectMutation.mutate(selectedRow.id);
        }}
        isDeleting={rejectMutation.isPending}
        title="Reject return request?"
        message="The order status will be reverted to Delivered. The buyer's return request will be declined."
        confirmText="Reject return"
        variant="danger"
      />
    </>
  );
}
