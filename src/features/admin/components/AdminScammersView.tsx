"use client";

import { sortBy } from "@mohasinac/appkit";
import React, { useState } from "react";
import { Div, FilterChipGroup, ListingLayout, RowActionMenu, Span, Text } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_SCAMMER_STATUS_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import type { AdminTableColumn } from "../types";
import { AdminScammerEditorView } from "./AdminScammerEditorView";

const STATUS_BADGE: Record<string, string> = {
  pending_review: "bg-warning-surface text-warning",
  verified: "bg-success-surface text-success",
  rejected: "bg-error-surface text-error",
  removed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

interface AdminScammersResponse {
  scammers?: unknown[];
  meta?: { total?: number; filteredTotal?: number };
  total?: number;
}

interface ScammerRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw?: Record<string, unknown>;
}

const SCAMMER_COLUMNS: AdminTableColumn<ScammerRow>[] = [
  {
    key: "primary",
    header: "Name / Aliases",
    render: (row) => (
      <Div className="space-y-0.5">
        <Text className="font-medium text-zinc-900 dark:text-zinc-100">{row.primary}</Text>
        {row.secondary ? (
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">{row.secondary}</Text>
        ) : null}
      </Div>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-36",
    render: (row) => (
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
          STATUS_BADGE[row.status] ?? STATUS_BADGE.pending_review
        }`}
      >
        {row.status.replace(/_/g, " ")}
      </span>
    ),
  },
  {
    key: "updatedAt",
    header: "Updated",
    className: "w-32",
    render: (row) => (
      <Span size="sm" className="text-zinc-500 dark:text-zinc-400">{row.updatedAt}</Span>
    ),
  },
];

export type AdminScammersViewProps = ListingLayoutProps;

export function AdminScammersView({ children, ...props }: AdminScammersViewProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ScammerRow | null>(null);

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminScammersResponse, ScammerRow> = {
    portal: "admin",
    title: "Scammers",
    searchPlaceholder: "Search by name, phone, UPI ID",
    emptyLabel: "No scammer profiles found",
    filterKeys: ["status"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["admin", "scammers", "listing"],
    endpoint: ADMIN_ENDPOINTS.SCAMMERS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
      { value: sortBy("views", "DESC"), label: "Most viewed" },
      { value: sortBy("incidentCount", "DESC"), label: "Most incidents" },
    ],
    columns: SCAMMER_COLUMNS,
    mapRows: (response) =>
      toRecordArray(response.scammers).map((item, index) => ({
        id: toStringValue(item.id, `scammer-${index}`),
        primary: Array.isArray(item.displayNames)
          ? (item.displayNames as string[]).join(", ")
          : toStringValue(item.displayNames, "Unknown"),
        secondary: [
          toStringValue(item.scamType, ""),
          Array.isArray(item.phones) ? `${(item.phones as string[]).length} phone(s)` : null,
          `${Number(item.incidentCount ?? 0)} incident(s)`,
        ]
          .filter(Boolean)
          .join(" · "),
        status: toStringValue(item.status, "pending_review"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        _raw: item,
      })),
    getTotal: (response, mappedRows) => {
      if (typeof response.meta?.filteredTotal === "number") return response.meta.filteredTotal;
      if (typeof response.meta?.total === "number") return response.meta.total;
      if (typeof response.total === "number") return response.total;
      return mappedRows.length;
    },
    buildFilters: (f) => (f.status && f.status !== "All" ? `status==${f.status}` : undefined),
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          {
            label: ACTIONS.ADMIN["review-scammer"].label,
            onClick: () => {
              setSelectedRow(row);
              setDrawerOpen(true);
            },
          },
        ]}
      />
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Status"
        tabs={ADMIN_SCAMMER_STATUS_TABS}
        value={pendingFilters.status ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
      />
    ),
  };

  return (
    <>
      <DataListingView config={config} />
      <AdminScammerEditorView
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        scammerId={selectedRow?.id}
        displayNames={
          Array.isArray(selectedRow?._raw?.displayNames)
            ? (selectedRow!._raw!.displayNames as string[])
            : [selectedRow?.primary ?? ""]
        }
        scamType={toStringValue(selectedRow?._raw?.scamType, "")}
        description={toStringValue(selectedRow?._raw?.description, "")}
        phones={
          Array.isArray(selectedRow?._raw?.phones)
            ? (selectedRow!._raw!.phones as string[])
            : []
        }
        upiIds={
          Array.isArray(selectedRow?._raw?.upiIds)
            ? (selectedRow!._raw!.upiIds as string[])
            : []
        }
        currentStatus={selectedRow?.status}
        verificationNote={toStringValue(selectedRow?._raw?.verificationNote, "") || undefined}
        reportedBy={toStringValue(selectedRow?._raw?.reportedBy, "")}
        reportedByAnon={Boolean(selectedRow?._raw?.reportedByAnon)}
      />
    </>
  );
}
