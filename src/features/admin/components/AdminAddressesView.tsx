"use client";

import { sortBy, type JsonArray, type JsonValue } from "@mohasinac/appkit/client";
import React from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Div, FilterChipGroup, Span, Stack, Text, useToast } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { toRecordArray, toRelativeDate, toStringValue } from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import type { AdminTableColumn } from "../types";
import { apiClient } from "../../../http";
import { useApiMutation } from "@mohasinac/appkit/client";
import { QuickEditMenu } from "./QuickEditMenu";
import { ROUTES } from "../../../next/routing/route-map";

const BAN_STATUS_TABS = [
  { id: "", label: "All" },
  { id: "banned", label: "Banned" },
  { id: "unban_requested", label: "Unban Requested" },
  { id: "suspicious", label: "Suspicious" },
];

const STATUS_BADGE: Record<string, string> = {
  banned: "danger",
  unban_requested: "warning",
  suspicious: "secondary",
};

interface AdminAddressesResponse {
  items?: JsonArray;
  total?: number;
}

interface AddressRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw?: Record<string, JsonValue>;
}

const ADDRESS_COLUMNS: AdminTableColumn<AddressRow>[] = [
  {
    key: "primary",
    header: "Address",
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
      const variant = (STATUS_BADGE[row.status] ?? "secondary") as "danger" | "warning" | "secondary";
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

function buildAddressConfig(
  onAction: (id: string, action: string) => void,
): ListingViewConfig<AdminAddressesResponse, AddressRow> {
  return {
    portal: "admin",
    title: "Address Management",
    searchPlaceholder: "Search by city or owner",
    emptyLabel: "No addresses found",
    // URL-synced via filterKeys (2026-08-21). The ban-status chips used to
    // live outside this config in local useState, so the selection was not in
    // the URL, not shareable, not counted by activeFilterCount, and lost on
    // back-navigation. banStatus is a plain query param rather than a Sieve
    // clause, which is exactly what buildExtraParams is for.
    filterKeys: ["banStatus"],
    defaultSort: sortBy("bannedAt", "DESC"),
    queryKey: ["admin", "addresses"],
    endpoint: ADMIN_ENDPOINTS.ADDRESSES,
    buildExtraParams: (state) =>
      state.banStatus ? { banStatus: state.banStatus } : undefined,
    sortOptions: [
      // -bannedAt (newest flagged first) to match defaultSort — the option was
      // "bannedAt" (oldest first), so the dropdown opened with nothing selected.
      { value: sortBy("bannedAt", "DESC"), label: "Flagged Date" },
      { value: "city", label: "City" },
    ],
    columns: ADDRESS_COLUMNS,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `addr-${index}`),
        primary: [
          toStringValue(item.addressLine1, ""),
          toStringValue(item.city, ""),
          toStringValue(item.state, ""),
          toStringValue(item.postalCode, ""),
        ].filter(Boolean).join(", "),
        secondary: `Owner: ${toStringValue(item.ownerId, "unknown")} (${toStringValue(item.ownerType, "")})${item.banReason ? ` · ${toStringValue(item.banReason, "")}` : ""}`,
        status: toStringValue(item.banStatus, ""),
        updatedAt: toRelativeDate(item.bannedAt ?? item.updatedAt),
        _raw: item,
      })),
    getTotal: (response, rows) =>
      typeof response.total === "number" ? response.total : rows.length,
    buildFilters: () => undefined,
    // The full address record (owner, ban reason/history) lives on the
    // existing admin address edit page — reuse it instead of leaving a
    // banned-address row with no detail destination.
    rowHrefTemplate: String(ROUTES.ADMIN.ADDRESSES_EDIT("{id}")),
    renderRowActions: (row) => {
      const actions = [];
      if (row.status !== "banned") {
        actions.push({
          label: ACTIONS.ADMIN["ban-address"].label,
          destructive: true,
          onClick: () => onAction(row.id, "ban"),
        });
      }
      if (row.status === "banned") {
        actions.push({
          label: ACTIONS.ADMIN["approve-unban"].label,
          onClick: () => onAction(row.id, "approve_unban"),
        });
        actions.push({
          label: ACTIONS.ADMIN["reject-unban"].label,
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

export interface AdminAddressesViewProps {
  children?: React.ReactNode;
}

export function AdminAddressesView(_props: AdminAddressesViewProps) {
  // Independent useUrlTable() against the same URL param DataListingView's own
  // table reads via filterKeys — safe because useUrlTable holds no local state
  // (the documented Root Cause #35 pattern).
  const chipTable = useUrlTable({ defaults: {} });
  const banStatus = chipTable.get("banStatus");
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const actionMutation = useApiMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      await apiClient.patch(ADMIN_ENDPOINTS.ADDRESS_BY_ID(id), { action });
    },
    onSuccess: () => {
      showToast("Address updated.", "success");
      void queryClient.invalidateQueries({ queryKey: ["admin", "addresses"] });
    },
    onError: (err: Error) => {
      showToast(err.message ?? "Failed to update address.", "error");
    },
  });

  const handleAction = (id: string, action: string) => {
    actionMutation.mutate({ id, action });
  };

  const config = buildAddressConfig(handleAction);

  return (
    <Stack gap="md">
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
