"use client";

import React, { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { BulkActionBar, ListingToolbar, Pagination, ConfirmDeleteModal, RowActionMenu, useToast } from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";
import { apiClient } from "../../../http";

const PAGE_SIZE = 25;
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

  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [view, setView] = useState<"grid" | "list" | "table">("table");

  const resetAll = useCallback(() => {
    table.setMany({ q: "", sort: "" });
    setSearchInput("");
  }, [table]);

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
  }, [searchInput, table]);

  const hasActiveState = !!table.get("q") || table.get("sort") !== DEFAULT_SORT;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<AdminOrdersResponse, ReturnRow>({
    queryKey: ["admin", "return-requests", "listing"],
    endpoint: `${ADMIN_ENDPOINTS.ORDERS}?status=RETURN_REQUESTED`,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    q: table.get("q") || undefined,
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

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selection = useBulkSelection({ items: rows ?? [], keyExtractor: (r: { id: string }) => r.id });

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
