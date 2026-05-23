"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ConfirmDeleteModal, RowActionMenu, useToast } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
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
}

export interface AdminReturnRequestsViewProps {
  children?: React.ReactNode;
}

export function AdminReturnRequestsView(_props: AdminReturnRequestsViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ReturnRow | null>(null);

  const approveMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await apiClient.patch(ADMIN_ENDPOINTS.ORDER_BY_ID(orderId), { status: "refunded" });
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
      await apiClient.patch(ADMIN_ENDPOINTS.ORDER_BY_ID(orderId), { status: "delivered" });
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

  const config: ListingViewConfig<AdminOrdersResponse, ReturnRow> = {
    portal: "admin",
    title: "Return Requests",
    searchPlaceholder: "Search by order ID or buyer",
    emptyLabel: "No return requests",
    filterKeys: [],
    defaultSort: "-createdAt",
    queryKey: ["admin", "return-requests", "listing"],
    endpoint: `${ADMIN_ENDPOINTS.ORDERS}?status=return_requested`,
    sortOptions: [
      { value: "-createdAt", label: "Newest" },
      { value: "createdAt", label: "Oldest" },
    ],
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `order-${index}`),
        primary: toStringValue(item.id, "Unknown order"),
        secondary: [
          toStringValue(item.buyerName ?? item.buyerId, "Unknown buyer"),
          toRupees(item.totalAmount),
        ].join(" · "),
        status: toStringValue(item.status, "return_requested"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: () => undefined,
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          {
            label: ACTIONS.ADMIN["approve-return"].label,
            onClick: () => {
              setSelectedRow(row);
              setApproveOpen(true);
            },
          },
          {
            label: ACTIONS.ADMIN["reject-return"].label,
            destructive: true,
            onClick: () => {
              setSelectedRow(row);
              setRejectOpen(true);
            },
          },
        ]}
      />
    ),
  };

  return (
    <>
      <DataListingView config={config} />
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
        title={ACTIONS.ADMIN["approve-return"].confirmation!.title}
        message="The order status will be updated to Refunded. The buyer will be notified and the refund process will begin."
        confirmText={ACTIONS.ADMIN["approve-return"].confirmation!.confirmLabel}
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
        title={ACTIONS.ADMIN["reject-return"].confirmation!.title}
        message="The order status will be reverted to Delivered. The buyer's return request will be declined."
        confirmText={ACTIONS.ADMIN["reject-return"].confirmation!.confirmLabel}
        variant="danger"
      />
    </>
  );
}
