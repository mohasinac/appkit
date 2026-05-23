"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListingToolbar, Pagination, ConfirmDeleteModal, RowActionMenu, useToast } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
import { DataTable } from "./DataTable";
import { apiClient } from "../../../http";

const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
];

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

export function AdminReturnRequestsView({ children: _children }: AdminReturnRequestsViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ReturnRow | null>(null);

  const listing = useAdminListing<AdminOrdersResponse, ReturnRow>({
    filterKeys: [],
    defaultSort: DEFAULT_SORT,
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
    buildFilters: () => undefined,
  });

  const { view, setView, table, searchInput, setSearchInput, commitSearch, hasActiveState, resetAll, rows, isLoading, errorMessage, currentPage, totalPages } = listing;

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
      <div className="min-h-screen">
        <ListingToolbar
          filterCount={0}
          searchValue={searchInput}
          searchPlaceholder="Search by order ID or buyer"
          onSearchChange={setSearchInput}
          onSearchCommit={commitSearch}
          sortValue={table.get("sort") || DEFAULT_SORT}
          sortOptions={SORT_OPTIONS}
          onSortChange={(v) => { table.set("sort", v); }}
        showTableView
        view={view}
        onViewChange={(v) => setView(v)}
          onResetAll={resetAll}
          hasActiveState={hasActiveState}
        />

        {totalPages > 1 && (
          <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
          </div>
        )}

        <div className="py-4 px-3 sm:px-4">
          {errorMessage && (
            <div className="mb-4 rounded-xl border border-red-200 bg-error-surface px-4 py-3 text-sm text-error dark:border-red-900/60">
              {errorMessage}
            </div>
          )}
          <DataTable
            rows={rows}
            isLoading={isLoading}
            emptyLabel="No return requests"
            renderRowActions={(row) => {
              const rr = row as ReturnRow;
              return (
                <RowActionMenu
                  actions={[
                    {
                      label: ACTIONS.ADMIN["approve-return"].label,
                      onClick: () => { setSelectedRow(rr); setApproveOpen(true); },
                    },
                    {
                      label: ACTIONS.ADMIN["reject-return"].label,
                      destructive: true,
                      onClick: () => { setSelectedRow(rr); setRejectOpen(true); },
                    },
                  ]}
                />
              );
            }}
          />
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={approveOpen}
        onClose={() => { setApproveOpen(false); setSelectedRow(null); }}
        onConfirm={() => { if (selectedRow) approveMutation.mutate(selectedRow.id); }}
        isDeleting={approveMutation.isPending}
        title={ACTIONS.ADMIN["approve-return"].confirmation!.title}
        message="The order status will be updated to Refunded. The buyer will be notified and the refund process will begin."
        confirmText={ACTIONS.ADMIN["approve-return"].confirmation!.confirmLabel}
        variant="primary"
      />

      <ConfirmDeleteModal
        isOpen={rejectOpen}
        onClose={() => { setRejectOpen(false); setSelectedRow(null); }}
        onConfirm={() => { if (selectedRow) rejectMutation.mutate(selectedRow.id); }}
        isDeleting={rejectMutation.isPending}
        title={ACTIONS.ADMIN["reject-return"].confirmation!.title}
        message="The order status will be reverted to Delivered. The buyer's return request will be declined."
        confirmText={ACTIONS.ADMIN["reject-return"].confirmation!.confirmLabel}
        variant="danger"
      />
    </>
  );
}
