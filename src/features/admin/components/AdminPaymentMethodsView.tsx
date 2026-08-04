"use client";

import { sortBy, type JsonArray, type JsonValue } from "@mohasinac/appkit";
import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Div, FilterChipGroup, Row, Span, Stack, Text, useToast } from "../../../ui";
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
  banStatus: string,
  onAction: (id: string, action: string) => void,
): ListingViewConfig<AdminPaymentMethodsResponse, PaymentMethodRow> {
  return {
    portal: "admin",
    title: "Payment Methods",
    searchPlaceholder: "Search by type or owner",
    emptyLabel: "No payment methods found",
    filterKeys: [],
    defaultSort: sortBy("bannedAt", "DESC"),
    queryKey: ["admin", "payment-methods", banStatus],
    endpoint: banStatus
      ? `${ADMIN_ENDPOINTS.PAYMENT_METHODS}?banStatus=${encodeURIComponent(banStatus)}`
      : ADMIN_ENDPOINTS.PAYMENT_METHODS,
    sortOptions: [
      { value: "bannedAt", label: "Flagged Date" },
      { value: "type", label: "Type" },
    ],
    columns: PM_COLUMNS,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `pm-${index}`),
        primary: `${toStringValue(item.type, "unknown").toUpperCase()} · ${toStringValue(item.displayLabel, "—")}`,
        secondary: `User: ${toStringValue(item.userId, "unknown")}${item.banReason ? ` · ${toStringValue(item.banReason, "")}` : ""}`,
        status: toStringValue(item.banStatus, ""),
        updatedAt: toRelativeDate(item.bannedAt ?? item.updatedAt),
        _raw: item,
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
  const [banStatus, setBanStatus] = useState("");
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const actionMutation = useApiMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      await apiClient.patch(ADMIN_ENDPOINTS.PAYMENT_METHOD_BY_ID(id), { action });
    },
    onSuccess: () => {
      showToast("Payment method updated.", "success");
      void queryClient.invalidateQueries({ queryKey: ["admin", "payment-methods"] });
    },
    onError: (err: Error) => {
      showToast(err.message ?? "Failed to update payment method.", "error");
    },
  });

  const handleAction = (id: string, action: string) => {
    actionMutation.mutate({ id, action });
  };

  const config = buildConfig(banStatus, handleAction);

  return (
    <Stack gap="md">
      <Div padding="inline" border="default" className="border-b">
        <FilterChipGroup
          label="Status"
          tabs={BAN_STATUS_TABS}
          value={banStatus}
          onChange={(v) => setBanStatus(v)}
        />
      </Div>
      <DataListingView config={config} />
    </Stack>
  );
}
