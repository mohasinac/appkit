"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BulkActionBar, Button,
  Form,
  FormActions,
  FilterChipGroup,
  Input,
  ListingToolbar,
  ListingLayout,
  Modal,
  Pagination,
  RowActionMenu,
  useToast, ListingFilterDrawer} from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_PAYOUT_STATUS_TABS } from "../constants/filter-tabs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";
import { apiClient } from "../../../http";
import { useBottomActions } from "../../layout";

const FILTER_KEYS = ["status"];
const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
  { value: "-amount", label: "Highest amount" },
];
const STATUS_OPTIONS = ADMIN_PAYOUT_STATUS_TABS;

export interface AdminPayoutsViewProps extends ListingLayoutProps {}

interface AdminPayoutsResponse {
  payouts?: unknown[];
  meta?: { total?: number };
}

interface PayoutRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export function AdminPayoutsView({ children, ...props }: AdminPayoutsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const toast = useToast();
  const queryClient = useQueryClient();

  const {
    view, setView, table, searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters, activeFilterCount, hasActiveState, resetAll,
    rows, total, isLoading, errorMessage,
    currentPage, totalPages, selection,
  } = useAdminListing<AdminPayoutsResponse, PayoutRow>({
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    queryKey: ["admin", "payouts", "listing"],
    endpoint: ADMIN_ENDPOINTS.PAYOUTS,
    buildFilters: (state) => {
      const statusRaw = state.status;
      return statusRaw && statusRaw !== "All" ? `status==${statusRaw}` : undefined;
    },
    mapRows: (response) =>
      toRecordArray(response.payouts).map((item, index) => ({
        id: toStringValue(item.id, `payout-${index}`),
        primary: [`Payout ${toStringValue(item.id, "-")}`, toRupees(item.amount)].join(" · "),
        secondary: toStringValue(
          (item as Record<string, unknown>).storeName ?? (item as Record<string, unknown>).sellerName,
          "Unknown store",
        ),
        status: toStringValue(item.status, "Pending"),
        updatedAt: toRelativeDate(
          (item as Record<string, unknown>).updatedAt ?? (item as Record<string, unknown>).createdAt,
        ),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
  });

  const markPaid = useMutation({
    mutationFn: () => {
      if (!selectedPayoutId) throw new Error("No payout selected");
      return apiClient.patch(ADMIN_ENDPOINTS.PAYOUT_BY_ID(selectedPayoutId), {
        status: "paid",
        transactionId: transactionId.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.showToast("Payout marked as paid.", "success");
      setMarkPaidOpen(false);
      setSelectedPayoutId(null);
      setTransactionId("");
      void queryClient.invalidateQueries({ queryKey: ["admin", "payouts", "listing"] });
    },
    onError: () => {
      toast.showToast("Failed to update payout.", "error");
    },
  });

  const handleExportCsv = async () => {
    try {
      const res = await fetch(ADMIN_ENDPOINTS.PAYOUTS_EXPORT);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payouts-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.showToast("CSV export failed.", "error");
    }
  };

  const closePaidModal = () => {
    setMarkPaidOpen(false);
    setTransactionId("");
  };

  if (hasChildren) {
    return <ListingLayout portal="admin" {...props}>{children}</ListingLayout>;
  }

  return (
    <>
      <div className="min-h-screen">
        <ListingToolbar
          filterCount={activeFilterCount}
          onFiltersClick={openFilters}
          searchValue={searchInput}
          searchPlaceholder="Search stores, payout IDs, or order groups"
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
          extra={
            <Button type="button" variant="outline" size="sm" onClick={handleExportCsv}>
              {ACTIONS.ADMIN["export-csv"].label}
            </Button>
          }
        />

        <BulkActionBar
          selectedCount={selection.selectedCount}
          onClearSelection={selection.clearSelection}
          actions={([
            { id: "mark-paid", label: ACTIONS.ADMIN["mark-paid"].label, variant: "primary", onClick: () => { selection.clearSelection(); } },
          ] satisfies BulkActionItem[])}
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
            emptyLabel="No payouts found"
            renderRowActions={(row) => {
              const pr = row as PayoutRow;
              useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: ([
            { id: "mark-paid", label: ACTIONS.ADMIN["mark-paid"].label, variant: "primary", onClick: () => { selection.clearSelection(); } },
          ] satisfies BulkActionItem[]) } } : {});

  return (
                <RowActionMenu
                  actions={[
                    {
                      label: ACTIONS.ADMIN["grant-payout"].label,
                      onClick: () => {
                        setSelectedPayoutId(pr.id);
                        setMarkPaidOpen(true);
                      },
                      disabled:
                        pr.status.toLowerCase() === "paid" ||
                        pr.status.toLowerCase() === "cancelled",
                    },
                  ]}
                />
              );
            }}
          />
        </div>

        <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
        <FilterChipGroup
            label="Status"
            tabs={STATUS_OPTIONS}
            value={pendingFilters.status ?? ""}
            onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
          />
      </ListingFilterDrawer>
      </div>

      <Modal isOpen={markPaidOpen} onClose={closePaidModal} title="Mark payout as paid">
        <Form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            markPaid.mutate();
          }}
        >
          <Input
            label="Transaction / reference ID"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="UTR, UPI ref, or bank transfer ID (optional)"
          />
          <FormActions align="right">
            <Button type="button" variant="outline" onClick={closePaidModal}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={markPaid.isPending}>
              {markPaid.isPending ? "Saving..." : "Confirm paid"}
            </Button>
          </FormActions>
        </Form>
      </Modal>
    </>
  );
}
