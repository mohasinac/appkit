"use client";
import { normalizeError } from "../../../errors/normalize";

import { sieveFilter, SIEVE_OP, type JsonArray } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React, { useState } from "react";
import { Badge, Div, FilterChipGroup, ListingLayout, Row, RowActionMenu, SideDrawer, Span, Stack, Text, Toggle, useToast } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_PAYOUT_STATUS_TABS } from "../../admin/constants/filter-tabs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { SELLER_BULK_ACTIONS, ROW_ACTION_META } from "../../products/constants/action-defs";
import { apiClient } from "../../../http";
import {
  toRecordArray,
  toRelativeDate,
  toCurrency,
  toStringValue,
} from "../../admin/hooks/useAdminListingData";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";

interface SellerPayoutsResponse {
  payouts?: JsonArray;
  meta?: { total: number };
}

interface PayoutRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

const PAYOUT_STAGES = ["pending", "processing", "paid"] as const;
const PAYOUT_CYCLE_DAYS = 7;

function formatDate(value: unknown): string {
  if (!value) return "—";
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function StatusProgress({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === "failed") {
    return <Badge variant="danger">Failed</Badge>;
  }
  const currentIndex = PAYOUT_STAGES.indexOf(normalized as (typeof PAYOUT_STAGES)[number]);
  return (
    <Row gap="xs" align="center">
      {PAYOUT_STAGES.map((stage, i) => (
        <React.Fragment key={stage}>
          {i > 0 && <Div className={`h-0.5 w-6 ${i <= currentIndex ? "bg-primary" : "bg-[var(--appkit-color-border)]"}`} />}
          <Span
            size="xs"
            weight={i === currentIndex ? "bold" : "medium"}
            className={i <= currentIndex ? "text-primary" : "text-[var(--appkit-color-text-muted)]"}
          >
            {stage[0].toUpperCase() + stage.slice(1)}
          </Span>
        </React.Fragment>
      ))}
    </Row>
  );
}

export type SellerPayoutsViewProps = ListingLayoutProps;

export function SellerPayoutsView({ children, ...props }: SellerPayoutsViewProps) {
  const { showToast } = useToast();
  const [selectedPayout, setSelectedPayout] = useState<Record<string, unknown> | null>(null);
  const [reminderPending, setReminderPending] = useState(false);
  // Mirrors the raw API record per row id so the detail panel can open
  // instantly from data already in memory (list already fetched it) —
  // matches AdminProductsView's rawByIdRef pattern.
  const rawByIdRef = React.useRef<Record<string, Record<string, unknown>>>({});

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="seller" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const handleExport = (rows: Record<string, unknown>[]) => {
    const header = ["id", "amount", "currency", "status", "requestedAt", "processedAt", "transactionId"];
    const lines = [header.join(",")];
    for (const p of rows) {
      lines.push(header.map((k) => JSON.stringify(p[k] ?? "")).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payouts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleToggleReminder = async (next: boolean) => {
    if (!selectedPayout) return;
    setReminderPending(true);
    try {
      await apiClient.patch(SELLER_ENDPOINTS.PAYOUT_BY_ID(String(selectedPayout.id)), {
        sellerReminderFlag: next,
      });
      setSelectedPayout((prev) => (prev ? { ...prev, sellerReminderFlag: next } : prev));
      showToast(next ? "Reminder set." : "Reminder cleared.", "success");
    } catch (err) {
      void normalizeError(err);
      showToast("Failed to update reminder.", "error");
    } finally {
      setReminderPending(false);
    }
  };

  const config: ListingViewConfig<SellerPayoutsResponse, PayoutRow> = {
    portal: "seller",
    title: "Payouts",
    searchPlaceholder: "Search payouts by payout # or amount",
    emptyLabel: "No payouts found",
    filterKeys: ["status", "showAllPayouts"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["seller", "payouts", "listing"],
    endpoint: SELLER_ENDPOINTS.PAYOUTS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
    ],
    mapRows: (response) =>
      toRecordArray(response.payouts).map((item, index) => {
        const id = toStringValue(item.id, `payout-${index}`);
        rawByIdRef.current[id] = item;
        return {
          id,
          primary: `Payout #${toStringValue(item.payoutNumber ?? item.id, "Unknown")}`,
          secondary: [
            toCurrency(item.amount ?? item.totalAmount),
            `Requested: ${toRelativeDate(item.requestedAt ?? item.createdAt)}`,
          ].join(" · "),
          status: toStringValue(item.status, "Pending"),
          updatedAt: toRelativeDate(item.processedAt ?? item.updatedAt ?? item.createdAt),
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number"
        ? response.meta.total
        : mappedRows.length,
    buildFilters: (state) => {
      // An explicit status chip always wins. Otherwise, hide already-paid
      // payouts by default — mirrors the isSold-hide-by-default precedent.
      // Pipe-joined EQ (not !=) — see AdminPayoutsView.tsx for why.
      if (state.status && state.status !== "All") return sieveFilter("status", SIEVE_OP.EQ, state.status);
      return state.showAllPayouts !== "true"
        ? sieveFilter("status", SIEVE_OP.EQ, "pending|processing|failed|cancelled")
        : undefined;
    },
    // Rule #7: bulk-action array sourced from the SELLER_BULK_ACTIONS preset.
    buildBulkActions: (selection): BulkActionItem[] =>
      SELLER_BULK_ACTIONS.payouts.map((id) => ({
        id,
        label: ROW_ACTION_META[id].label,
        onClick: () => {
          const rows = selection.selectedIds
            .map((rowId) => rawByIdRef.current[rowId])
            .filter((r): r is Record<string, unknown> => Boolean(r));
          handleExport(rows);
          selection.clearSelection();
        },
      })),
    // Mirrors the "View" row action below so table rows and cards both open
    // the payout detail drawer on click.
    onRowClick: (row) => setSelectedPayout(rawByIdRef.current[row.id] ?? { id: row.id }),
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          {
            label: ACTIONS.STORE["view-payout"].label,
            onClick: () => setSelectedPayout(rawByIdRef.current[row.id] ?? { id: row.id }),
          },
          {
            label: ACTIONS.STORE["export-payout"].label,
            onClick: () => handleExport([rawByIdRef.current[row.id] ?? { id: row.id }]),
          },
        ]}
      />
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <>
      <FilterChipGroup
        label="Status"
        tabs={ADMIN_PAYOUT_STATUS_TABS}
        value={pendingFilters.status ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
      />
      <FilterChipGroup
        label="Paid payouts"
        tabs={[
          { id: "", label: "Hide paid" },
          { id: "true", label: "Show all" },
        ]}
        value={pendingFilters.showAllPayouts ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, showAllPayouts: id }))}
        allId=""
      />
      </>
    ),
  };

  const expectedByDate = selectedPayout?.requestedAt
    ? new Date(new Date(selectedPayout.requestedAt as string).getTime() + PAYOUT_CYCLE_DAYS * 24 * 60 * 60 * 1000)
    : null;
  const orderIds = Array.isArray(selectedPayout?.orderIds) ? (selectedPayout!.orderIds as string[]) : [];

  return (
    <>
      <DataListingView config={config} />
      <SideDrawer
        isOpen={Boolean(selectedPayout)}
        onClose={() => setSelectedPayout(null)}
        title={selectedPayout ? `Payout #${toStringValue(selectedPayout.payoutNumber ?? selectedPayout.id, "")}` : "Payout"}
        mode="view"
      >
        {selectedPayout && (
          <Stack gap="lg">
            <StatusProgress status={toStringValue(selectedPayout.status, "pending")} />

            <Stack gap="xs">
              <Text size="xs" color="muted">Amount</Text>
              <Text size="xl" weight="bold">{toCurrency(selectedPayout.amount ?? selectedPayout.totalAmount)}</Text>
            </Stack>

            {selectedPayout.transactionId ? (
              <Stack gap="xs">
                <Text size="xs" color="muted">Transaction / reference ID</Text>
                <Text size="sm" className="font-mono">{String(selectedPayout.transactionId)}</Text>
              </Stack>
            ) : null}

            <Row gap="lg" wrap>
              <Stack gap="xs">
                <Text size="xs" color="muted">Requested</Text>
                <Text size="sm">{formatDate(selectedPayout.requestedAt ?? selectedPayout.createdAt)}</Text>
              </Stack>
              {selectedPayout.status === "paid" ? (
                <Stack gap="xs">
                  <Text size="xs" color="muted">Paid on</Text>
                  <Text size="sm">{formatDate(selectedPayout.processedAt)}</Text>
                </Stack>
              ) : (
                <Stack gap="xs">
                  <Text size="xs" color="muted">Expected by</Text>
                  <Text size="sm">{expectedByDate ? formatDate(expectedByDate.toISOString()) : "—"}</Text>
                </Stack>
              )}
              <Stack gap="xs">
                <Text size="xs" color="muted">Payment method</Text>
                <Text size="sm" className="capitalize">{toStringValue(selectedPayout.paymentMethod, "—").replace("_", " ")}</Text>
              </Stack>
            </Row>

            {orderIds.length > 0 && (
              <Stack gap="xs">
                <Text size="xs" color="muted">Orders included ({orderIds.length})</Text>
                <Div className="max-h-40" overflow="y-auto">
                  <Stack gap="xs">
                    {orderIds.map((oid) => (
                      <Text key={oid} size="xs" className="font-mono" color="muted">{oid}</Text>
                    ))}
                  </Stack>
                </Div>
              </Stack>
            )}

            <Row align="center" justify="between" border="default" rounded="lg" padding="inline">
              <Stack gap="none">
                <Text size="sm" weight="medium">Remind me</Text>
                <Text size="xs" color="muted">Flag this payout for a personal follow-up</Text>
              </Stack>
              <Toggle
                checked={Boolean(selectedPayout.sellerReminderFlag)}
                onChange={handleToggleReminder}
                disabled={reminderPending}
                size="md"
                aria-label={ACTIONS.STORE["set-payout-reminder"].ariaLabel}
              />
            </Row>
          </Stack>
        )}
      </SideDrawer>
    </>
  );
}
