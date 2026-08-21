"use client";

/**
 * AdminAuditLogView — read-only list of admin action audit entries.
 * Entries are written exclusively via `recordAdminAction()` from the
 * instrumented privileged-action call sites (bans, checkout bypass, coupon
 * edits, payout mark-paid, store status changes, role changes) — this view
 * has no create/edit/delete affordance, only "view details".
 */

import React, { useState } from "react";
import { sieveFilter, SIEVE_OP, type JsonArray, type JsonValue } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import { FilterChipGroup, Input, ListingLayout, RowActionMenu, Stack } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_AUDIT_LOG_ACTION_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { ViewAuditLogEntryModal, type AuditLogEntryDetail } from "./ViewAuditLogEntryModal";

interface AdminAuditLogResponse {
  entries?: JsonArray;
  meta?: { total?: number };
}

interface AuditLogRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw: Record<string, JsonValue>;
}

const ACTION_LABELS: Record<string, string> = {
  user_hard_ban: "User hard-banned",
  user_soft_ban: "User soft-banned",
  user_unban: "User unbanned",
  checkout_bypass: "Admin checkout bypass",
  coupon_update: "Coupon updated",
  payout_mark_paid: "Payout marked paid",
  store_status_change: "Store status changed",
  user_role_change: "User role changed",
};

export type AdminAuditLogViewProps = ListingLayoutProps;

export function AdminAuditLogView({ children, ...props }: AdminAuditLogViewProps) {
  const [viewEntry, setViewEntry] = useState<AuditLogEntryDetail | null>(null);

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const openEntry = (row: AuditLogRow) => {
    const raw = row._raw;
    setViewEntry({
      id: row.id,
      actorUid: toStringValue(raw.actorUid, ""),
      actorName: toStringValue(raw.actorName, "") || undefined,
      action: toStringValue(raw.action, ""),
      targetType: toStringValue(raw.targetType, ""),
      targetId: toStringValue(raw.targetId, ""),
      targetLabel: toStringValue(raw.targetLabel, "") || undefined,
      reason: toStringValue(raw.reason, "") || undefined,
      metadata: (raw.metadata as Record<string, JsonValue>) ?? undefined,
      createdAt: toStringValue(raw.createdAt, "") || undefined,
    });
  };

  const config: ListingViewConfig<AdminAuditLogResponse, AuditLogRow> = {
    portal: "admin",
    title: "Audit Log",
    searchPlaceholder: "Search by actor uid",
    emptyLabel: "No audit log entries found",
    filterKeys: ["action", "actorUid"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["admin", "audit-log", "listing"],
    endpoint: ADMIN_ENDPOINTS.AUDIT_LOG,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
    ],
    mapRows: (response) =>
      toRecordArray(response.entries).map((item, index) => {
        const action = toStringValue(item.action, "unknown");
        return {
          id: toStringValue(item.id, `audit-${index}`),
          primary: ACTION_LABELS[action] ?? action,
          secondary: [
            toStringValue(item.actorName ?? item.actorUid, "Unknown actor"),
            `${toStringValue(item.targetType, "")}: ${toStringValue(item.targetLabel ?? item.targetId, "")}`,
          ].join(" · "),
          status: action,
          updatedAt: toRelativeDate(item.createdAt),
          _raw: item,
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
    onRowClick: (row) => openEntry(row),
    buildFilters: (state) => {
      const parts: string[] = [];
      if (state.action && state.action !== "All") parts.push(sieveFilter("action", SIEVE_OP.EQ, state.action));
      if (state.actorUid) parts.push(sieveFilter("actorUid", SIEVE_OP.EQ, state.actorUid));
      return parts.length > 0 ? parts.join(",") : undefined;
    },
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          {
            label: "View details",
            onClick: () => openEntry(row),
          },
        ]}
      />
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <Stack gap="md">
        <FilterChipGroup
          label="Action"
          tabs={ADMIN_AUDIT_LOG_ACTION_TABS}
          value={pendingFilters.action ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, action: id }))}
        />
        <Input
          label="Actor UID"
          value={pendingFilters.actorUid ?? ""}
          onChange={(e) => setPendingFilters((p) => ({ ...p, actorUid: e.target.value }))}
          placeholder="Filter by actor uid"
        />
      </Stack>
    ),
  };

  return (
    <>
      <DataListingView config={config} />
      <ViewAuditLogEntryModal
        entry={viewEntry}
        isOpen={Boolean(viewEntry)}
        onClose={() => setViewEntry(null)}
      />
    </>
  );
}
