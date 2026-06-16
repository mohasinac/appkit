"use client";

import { SIEVE_OP, Stack, sieveFilter } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
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
        <Stack gap="xs">
          <Text weight="medium" color="primary">{row.primary}</Text>
          {row.secondary ? (
            <Text size="xs" color="muted">{row.secondary}</Text>
          ) : null}
          <Span
            className={`inline-flex py-0.5 ${ PRIORITY_BADGE[priority] ?? PRIORITY_BADGE.normal }`} size="xs" weight="medium" rounded="full" padding="x-xs"
          >
            {priority}
          </Span>
        </Stack>
      );
    },
  },
  {
    key: "status",
    header: "Status",
    className: "w-36",
    render: (row) => (
      <Span
        className={`inline-flex px-2.5 ${ STATUS_BADGE[row.status] ?? STATUS_BADGE.open }`} size="xs" weight="medium" rounded="full" padding="y-2xs"
      >
        {row.status.replace(/_/g, " ")}
      </Span>
    ),
  },
  {
    key: "updatedAt",
    header: "Updated",
    className: "w-32",
    render: (row) => (
      <Span size="sm" color="muted">{row.updatedAt}</Span>
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
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["admin", "support-tickets", "listing"],
    endpoint: ADMIN_ENDPOINTS.SUPPORT_TICKETS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
      { value: sortBy("updatedAt", "DESC"), label: "Recently updated" },
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
      if (f.status && f.status !== "All") parts.push(sieveFilter("status", SIEVE_OP.EQ, f.status));
      if (f.priority && f.priority !== "All") parts.push(sieveFilter("priority", SIEVE_OP.EQ, f.priority));
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
