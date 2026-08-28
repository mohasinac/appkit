"use client";

import { sortBy, type JsonArray, type JsonValue, type JsonObject } from "@mohasinac/appkit/client";
import React, { useState } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Div, FilterChipGroup, Span, Stack, Text, useToast,
  RecordDetailModal,
} from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { toRecordArray, toRelativeDate, toStringValue } from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import type { AdminTableColumn } from "../types";
import { apiClient } from "../../../http";
import { useApiMutation } from "@mohasinac/appkit/client";
import { QuickEditMenu } from "./QuickEditMenu";

const BAN_STATUS_TABS = [
  { id: "", label: "All" },
  { id: "banned", label: "Banned" },
  { id: "suspicious", label: "Suspicious" },
];

const STATUS_BADGE: Record<string, "danger" | "warning" | "secondary"> = {
  banned: "danger",
  suspicious: "secondary",
};

interface AdminPaymentMethodsResponse {
  items?: JsonArray;
  total?: number;
}

interface PaymentMethodRow {
  /**
   * The raw document, so the detail modal can render it.
   *
   * The row's other fields are display COMPOSITES — `primary` already
   * joins several values — so a modal built from them could only repeat
   * the row. Same approach as AdminOffersView; the response already
   * contains the document, so it costs nothing.
   */
  detail: JsonObject;
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw?: Record<string, JsonValue>;
}

const PM_COLUMNS: AdminTableColumn<PaymentMethodRow>[] = [
  {
    key: "primary",
    header: "Payment Method",
    render: (row) => (
      <Stack gap="none">
        <Text weight="medium" color="primary">{row.primary}</Text>
        {row.secondary ? <Text size="xs" color="muted">{row.secondary}</Text> : null}
      </Stack>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-36",
    render: (row) => {
      if (!row.status) return <Span size="xs" color="muted">—</Span>;
      const variant = STATUS_BADGE[row.status] ?? "secondary";
      return <Badge variant={variant} size="sm">{row.status.replace(/_/g, " ")}</Badge>;
    },
  },
  {
    key: "updatedAt",
    header: "Flagged",
    className: "w-32",
    render: (row) => <Span size="sm" color="muted">{row.updatedAt}</Span>,
  },
];

function buildConfig(
  onAction: (id: string, action: string) => void,
  // Threaded in rather than closed over: this factory sits OUTSIDE the
  // component, so the component's state setter is not in scope here.
  onOpen: (row: PaymentMethodRow) => void,
): ListingViewConfig<AdminPaymentMethodsResponse, PaymentMethodRow> {
  return {
    portal: "admin",
    title: "Payment Methods",
    // Search intentionally absent: this endpoint does not read `q`, so the box accepted typing and changed nothing. Restore it when the collection gains searchTxt — audit-listing-search-capability tracks it.
    emptyLabel: "No payment methods found",
    // URL-synced via filterKeys (2026-08-21) — see the matching note in
    // AdminAddressesView. banStatus is a query param, not a Sieve clause,
    // hence buildExtraParams rather than buildFilters.
    filterKeys: ["banStatus"],
    defaultSort: sortBy("bannedAt", "DESC"),
    queryKey: ["admin", "payment-methods"],
    endpoint: ADMIN_ENDPOINTS.PAYMENT_METHODS,
    buildExtraParams: (state) =>
      state.banStatus ? { banStatus: state.banStatus } : undefined,
    sortOptions: [
      // -bannedAt (newest flagged first) to match defaultSort — the option was
      // "bannedAt" (oldest first), so the dropdown opened with nothing selected.
      { value: sortBy("bannedAt", "DESC"), label: "Flagged Date" },
      { value: "type", label: "Type" },
    ],
    columns: PM_COLUMNS,
    // Opening a row is what makes the destructive actions beside it
    // safe to offer at all.
    onRowClick: onOpen,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `pm-${index}`),
        primary: `${toStringValue(item.type, "unknown").toUpperCase()} · ${toStringValue(item.displayLabel, "—")}`,
        secondary: `User: ${toStringValue(item.userId, "unknown")}${item.banReason ? ` · ${toStringValue(item.banReason, "")}` : ""}`,
        status: toStringValue(item.banStatus, ""),
        updatedAt: toRelativeDate(item.bannedAt ?? item.updatedAt),
        _raw: item,
        detail: item as JsonObject,
      })),
    getTotal: (response, rows) =>
      typeof response.total === "number" ? response.total : rows.length,
    buildFilters: () => undefined,
    renderRowActions: (row) => {
      const actions = [];
      if (row.status !== "banned") {
        actions.push({
          label: ACTIONS.ADMIN["ban-payment-method"].label,
          destructive: true,
          onClick: () => onAction(row.id, "ban"),
        });
      }
      if (row.status === "banned") {
        actions.push({
          label: ACTIONS.ADMIN["approve-payment-unban"].label,
          onClick: () => onAction(row.id, "approve_unban"),
        });
        actions.push({
          label: ACTIONS.ADMIN["reject-payment-unban"].label,
          onClick: () => onAction(row.id, "reject_unban"),
        });
      }
      if (row.status !== "suspicious") {
        actions.push({
          label: "Flag Suspicious",
          onClick: () => onAction(row.id, "flag_suspicious"),
        });
      }
      if (row.status) {
        actions.push({
          label: "Clear Flag",
          onClick: () => onAction(row.id, "clear_ban"),
        });
      }
      return <QuickEditMenu actions={actions} />;
    },
  };
}

export interface AdminPaymentMethodsViewProps {
  children?: React.ReactNode;
}

export function AdminPaymentMethodsView(_props: AdminPaymentMethodsViewProps) {
  const [detail, setDetail] = useState<PaymentMethodRow | null>(null);
  // Independent useUrlTable() against the same URL param the listing reads
  // via filterKeys (Root Cause #35 pattern).
  const chipTable = useUrlTable({ defaults: {} });
  const banStatus = chipTable.get("banStatus");
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const actionMutation = useApiMutation({
    errorMessage: "Failed to update payment method.",
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      await apiClient.patch(ADMIN_ENDPOINTS.PAYMENT_METHOD_BY_ID(id), { action });
    },
    onSuccess: () => {
      showToast("Payment method updated.", "success");
      void queryClient.invalidateQueries({ queryKey: ["admin", "payment-methods"] });
    },
  });

  const handleAction = (id: string, action: string) => {
    actionMutation.mutate({ id, action });
  };

  const config = buildConfig(handleAction, setDetail);

  return (
    <Stack gap="md">
      {/*
        A row that could be seen and never opened. Two of these listings offered
        only DESTRUCTIVE row actions, which let an admin unsubscribe, ban or
        revoke a record they had no way to read first (Root Cause #56).
      */}
      <RecordDetailModal
        isOpen={detail !== null}
        onClose={() => setDetail(null)}
        title={toStringValue(detail?.detail?.displayLabel, "Payment method")}
        fields={(() => {
          const d = (detail?.detail ?? {}) as Record<string, JsonValue>;
          return detail ? [
                { label: "Type", value: toStringValue(d.type, "—").toUpperCase() },
                { label: "Label", value: toStringValue(d.displayLabel, "—") },
                { label: "Owner", value: toStringValue(d.userId, "—") },
                { label: "Ban status", value: toStringValue(d.banStatus, "Not banned") },
                { label: "Ban reason", value: toStringValue(d.banReason, "—") },
                { label: "Banned at", value: toRelativeDate(d.bannedAt) },
                { label: "Method ID", value: detail?.id ?? "—" },
              ] : undefined;
        })()}
      />

      <Div padding="inline" border="default" className="border-b">
        <FilterChipGroup
          label="Status"
          tabs={BAN_STATUS_TABS}
          value={banStatus}
          onChange={(v) => chipTable.set("banStatus", v)}
        />
      </Div>
      <DataListingView config={config} />
    </Stack>
  );
}
