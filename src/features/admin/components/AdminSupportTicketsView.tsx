"use client";

import React, { useState } from "react";
import { Div, FilterChipGroup, ListingLayout, RowActionMenu, Span, Text } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROW_ACTION_META, ROW_ACTION_ID } from "../../../features/products/constants/action-defs";
import {
  ADMIN_SUPPORT_TICKET_STATUS_TABS,
  ADMIN_SUPPORT_TICKET_PRIORITY_TABS,
} from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import type { AdminTableColumn } from "../types";
import { AdminSupportTicketDetailView } from "./AdminSupportTicketDetailView";

const PRIORITY_BADGE: Record<string, string> = {
  urgent: "bg-error-surface text-error",
  high: "bg-warning-surface text-warning",
  normal: "bg-info-surface text-info",
  low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const STATUS_BADGE: Record<string, string> = {
  open: "bg-info-surface text-info",
  in_progress: "bg-warning-surface text-warning",
  waiting_on_user: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  resolved: "bg-success-surface text-success",
  closed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

interface AdminSupportTicketsResponse {
  tickets?: unknown[];
  meta?: { total?: number; filteredTotal?: number };
  total?: number;
}

interface TicketRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw?: Record<string, unknown>;
}

const TICKET_COLUMNS: AdminTableColumn<TicketRow>[] = [
  {
    key: "primary",
    header: "Subject",
    render: (row) => {
      const priority = toStringValue(row._raw?.priority, "normal");
      return (
        <Div className="space-y-1">
          <Text className="font-medium text-zinc-900 dark:text-zinc-100">{row.primary}</Text>
          {row.secondary ? (
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">{row.secondary}</Text>
          ) : null}
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              PRIORITY_BADGE[priority] ?? PRIORITY_BADGE.normal
            }`}
          >
            {priority}
          </span>
        </Div>
      );
    },
  },
  {
    key: "status",
    header: "Status",
    className: "w-36",
    render: (row) => (
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
          STATUS_BADGE[row.status] ?? STATUS_BADGE.open
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

export type AdminSupportTicketsViewProps = ListingLayoutProps;

export function AdminSupportTicketsView({ children, ...props }: AdminSupportTicketsViewProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<TicketRow | null>(null);

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminSupportTicketsResponse, TicketRow> = {
    portal: "admin",
    title: "Support Tickets",
    searchPlaceholder: "Search by subject",
    emptyLabel: "No support tickets found",
    filterKeys: ["status", "priority"],
    defaultSort: "-createdAt",
    queryKey: ["admin", "support-tickets", "listing"],
    endpoint: ADMIN_ENDPOINTS.SUPPORT_TICKETS,
    sortOptions: [
      { value: "-createdAt", label: "Newest" },
      { value: "createdAt", label: "Oldest" },
      { value: "-updatedAt", label: "Recently updated" },
    ],
    columns: TICKET_COLUMNS,
    mapRows: (response) =>
      toRecordArray(response.tickets).map((item, index) => ({
        id: toStringValue(item.id, `ticket-${index}`),
        primary: toStringValue(item.subject, "No subject"),
        secondary: [
          toStringValue(item.userDisplayName, "Unknown user"),
          toStringValue(item.category, "general"),
          item.orderId ? `Order: ${toStringValue(item.orderId, "")}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        status: toStringValue(item.status, "open"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        _raw: item,
      })),
    getTotal: (response, mappedRows) => {
      if (typeof response.meta?.filteredTotal === "number") return response.meta.filteredTotal;
      if (typeof response.meta?.total === "number") return response.meta.total;
      if (typeof response.total === "number") return response.total;
      return mappedRows.length;
    },
    buildFilters: (f) => {
      const parts: string[] = [];
      if (f.status && f.status !== "All") parts.push(`status==${f.status}`);
      if (f.priority && f.priority !== "All") parts.push(`priority==${f.priority}`);
      return parts.join(",") || undefined;
    },
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          {
            label: ROW_ACTION_META[ROW_ACTION_ID.VIEW].label,
            onClick: () => {
              setSelectedRow(row);
              setDrawerOpen(true);
            },
          },
        ]}
      />
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <>
        <FilterChipGroup
          label="Status"
          tabs={ADMIN_SUPPORT_TICKET_STATUS_TABS}
          value={pendingFilters.status ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
        />
        <FilterChipGroup
          label="Priority"
          tabs={ADMIN_SUPPORT_TICKET_PRIORITY_TABS}
          value={pendingFilters.priority ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, priority: id }))}
        />
      </>
    ),
  };

  return (
    <>
      <DataListingView config={config} />
      <AdminSupportTicketDetailView
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ticketId={selectedRow?.id}
        subject={selectedRow?.primary}
        userDisplayName={toStringValue(selectedRow?._raw?.userDisplayName, "")}
        category={toStringValue(selectedRow?._raw?.category, "general")}
        currentStatus={selectedRow?.status}
        currentPriority={toStringValue(selectedRow?._raw?.priority, "normal")}
        description={toStringValue(selectedRow?._raw?.description, "")}
        messages={
          Array.isArray(selectedRow?._raw?.messages)
            ? (selectedRow!._raw!.messages as Array<Record<string, unknown>>)
            : []
        }
        internalNotes={toStringValue(selectedRow?._raw?.internalNotes, "") || undefined}
        orderId={toStringValue(selectedRow?._raw?.orderId, "") || undefined}
        relatedParties={
          selectedRow?._raw?.relatedParties &&
          typeof selectedRow._raw.relatedParties === "object"
            ? (selectedRow._raw.relatedParties as Record<string, string>)
            : undefined
        }
      />
    </>
  );
}
