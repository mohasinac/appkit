"use client";
import { normalizeError } from "../../../errors/normalize";

import { useApiMutation, useBulkEvent, RTDB_PATHS, type JsonArray } from "@mohasinac/appkit/client";
import type { JsonValue } from "@mohasinac/appkit";
import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  FilterChipGroup,
  Form,
  FormActions,
  Input,
  ListingLayout,
  Modal,
  RowActionMenu,
  useToast,
} from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_PAYOUT_STATUS_TABS } from "../constants/filter-tabs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_BULK_ACTIONS, ROW_ACTION_META } from "../../products/constants/action-defs";
import {
  toRecordArray,
  toRelativeDate,
  toCurrency,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { apiClient } from "../../../http";

interface AdminPayoutsResponse {
  payouts?: JsonArray;
  meta?: { total?: number };
}

interface PayoutRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export type AdminPayoutsViewProps = ListingLayoutProps;

export function AdminPayoutsView({ children, ...props }: AdminPayoutsViewProps) {
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [calculating, setCalculating] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  // P-7 — "Calculate Payouts" triggers the payoutsWeekly async job (Async Job
  // Primitive) and tracks progress via the shared useBulkEvent RTDB channel.
  const bulkEvent = useBulkEvent({ rtdbPath: RTDB_PATHS.BULK_EVENTS });
  const handleCalculatePayouts = async () => {
    setCalculating(true);
    try {
      const res = (await apiClient.post(ADMIN_ENDPOINTS.PAYOUTS_WEEKLY, {})) as {
        data?: { jobId?: string; customToken?: string };
      };
      const { jobId, customToken } = res.data ?? {};
      if (jobId && customToken) {
        bulkEvent.subscribe(jobId, customToken);
      } else {
        setCalculating(false);
        toast.showToast("Failed to start payout calculation.", "error");
      }
    } catch (_err) {
      void normalizeError(_err);
      setCalculating(false);
      toast.showToast("Failed to start payout calculation.", "error");
    }
  };
  useEffect(() => {
    if (bulkEvent.status === "success") {
      setCalculating(false);
      toast.showToast(
        bulkEvent.result?.summary
          ? `Payout calculation complete: ${JSON.stringify(bulkEvent.result.summary)}`
          : "Payout calculation complete.",
        "success",
      );
      void queryClient.invalidateQueries({ queryKey: ["admin", "payouts", "listing"] });
    } else if (bulkEvent.status === "failed" || bulkEvent.status === "timeout") {
      setCalculating(false);
      toast.showToast(bulkEvent.error ?? "Payout calculation failed.", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkEvent.status]);

  const markPaid = useApiMutation({
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
      const blob = await apiClient.blob(ADMIN_ENDPOINTS.PAYOUTS_EXPORT);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payouts-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_err) {
      void normalizeError(_err);
      toast.showToast("CSV export failed.", "error");
    }
  };

  const closePaidModal = () => {
    setMarkPaidOpen(false);
    setTransactionId("");
  };

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminPayoutsResponse, PayoutRow> = {
    portal: "admin",
    title: "Payouts",
    searchPlaceholder: "Search stores, payout IDs, or order groups",
    emptyLabel: "No payouts found",
    filterKeys: ["status"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["admin", "payouts", "listing"],
    endpoint: ADMIN_ENDPOINTS.PAYOUTS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
      { value: sortBy("amount", "DESC"), label: "Highest amount" },
    ],
    mapRows: (response) =>
      toRecordArray(response.payouts).map((item, index) => ({
        id: toStringValue(item.id, `payout-${index}`),
        primary: [`Payout ${toStringValue(item.id, "-")}`, toCurrency(item.amount)].join(" · "),
        secondary: toStringValue(
          (item as Record<string, JsonValue>).storeName ?? (item as Record<string, JsonValue>).sellerName,
          "Unknown store",
        ),
        status: toStringValue(item.status, "Pending"),
        updatedAt: toRelativeDate(
          (item as Record<string, JsonValue>).updatedAt ?? (item as Record<string, JsonValue>).createdAt,
        ),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
    buildFilters: (state) =>
      state.status && state.status !== "All" ? sieveFilter("status", SIEVE_OP.EQ, state.status) : undefined,
    toolbarExtra: (
      <>
        <Button
          type="button"
          action={ACTIONS.ADMIN["calculate-payouts"]}
          size="sm"
          isLoading={calculating}
          disabled={calculating}
          onClick={handleCalculatePayouts}
        />
        <Button type="button" variant="outline" size="sm" onClick={handleExportCsv}>
          {ACTIONS.ADMIN["export-csv"].label}
        </Button>
      </>
    ),
    // Rule #7: bulk-action array sourced from the ADMIN_BULK_ACTIONS preset.
    buildBulkActions: (selection): BulkActionItem[] =>
      ADMIN_BULK_ACTIONS.payouts.map((id) => ({
        id,
        label: ROW_ACTION_META[id].label,
        variant: "primary" as const,
        onClick: () => selection.clearSelection(),
      })),
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          {
            label: ACTIONS.ADMIN["grant-payout"].label,
            onClick: () => {
              setSelectedPayoutId(row.id);
              setMarkPaidOpen(true);
            },
            disabled:
              row.status.toLowerCase() === "paid" || row.status.toLowerCase() === "cancelled",
          },
        ]}
      />
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Status"
        tabs={ADMIN_PAYOUT_STATUS_TABS}
        value={pendingFilters.status ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
      />
    ),
  };

  return (
    <>
      <DataListingView config={config} />
      <Modal isOpen={markPaidOpen} onClose={closePaidModal} title="Mark payout as paid">
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            markPaid.mutate();
          }} spacing="md">
          <Input
            label="Transaction / reference ID"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="UTR, UPI ref, or bank transfer ID (optional)"
          />
          <FormActions align="right">
            <Button type="button" variant="outline" onClick={closePaidModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={markPaid.isPending}>
              {markPaid.isPending ? "Saving..." : "Confirm paid"}
            </Button>
          </FormActions>
        </Form>
      </Modal>
    </>
  );
}
