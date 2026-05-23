"use client";

import React, { useState } from "react";
import { FilterChipGroup, ListingToolbar, ListingLayout, Pagination, RowActionMenu, Text, ListingFilterDrawer} from "../../../ui";
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
import { useAdminListing } from "../hooks/useAdminListing";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";
import { AdminSupportTicketDetailView } from "./AdminSupportTicketDetailView";

const PAGE_SIZE = 25;
const FILTER_KEYS = ["status", "priority"];
const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
  { value: "-updatedAt", label: "Recently updated" },
];

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

export interface AdminSupportTicketsViewProps extends ListingLayoutProps {}

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

function buildTicketColumns(
  setSelectedRow: (row: TicketRow) => void,
  setDrawerOpen: (v: boolean) => void,
) {
  return [
    {
      key: "primary",
      header: "Subject",
      render: (row: TicketRow) => {
        const priority = toStringValue(row._raw?.priority, "normal");
        return (
          <div className="space-y-1">
            <Text className="font-medium text-zinc-900 dark:text-zinc-100">{row.primary}</Text>
            {row.secondary ? <Text className="text-xs text-zinc-500 dark:text-zinc-400">{row.secondary}</Text> : null}
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[priority] ?? PRIORITY_BADGE.normal}`}>
              {priority}
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      className: "w-36",
      render: (row: TicketRow) => (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.open}`}>
          {row.status.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      className: "w-32",
      render: (row: TicketRow) => (
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{row.updatedAt}</span>
      ),
    },
  ] as const;
}

export function AdminSupportTicketsView({ children, ...props }: AdminSupportTicketsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<TicketRow | null>(null);

  const {
    view, setView, table, searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters, activeFilterCount, hasActiveState, resetAll,
    rows, total, isLoading, errorMessage,
    currentPage, totalPages, selection, defaultSort,
  } = useAdminListing<AdminSupportTicketsResponse, TicketRow>({
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    pageSize: PAGE_SIZE,
    queryKey: ["admin", "support-tickets", "listing"],
    endpoint: ADMIN_ENDPOINTS.SUPPORT_TICKETS,
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
  });

  if (hasChildren) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  return (
    <>
      <div className="min-h-screen">
        <ListingToolbar
          filterCount={activeFilterCount}
          onFiltersClick={openFilters}
          searchValue={searchInput}
          searchPlaceholder="Search by subject"
          onSearchChange={setSearchInput}
          onSearchCommit={commitSearch}
          sortValue={table.get("sort") || defaultSort}
          sortOptions={SORT_OPTIONS}
          onSortChange={(v) => {
            table.set("sort", v);
          }}
        showTableView
        view={view}
        onViewChange={(v) => setView(v)}
          onResetAll={resetAll}
          hasActiveState={hasActiveState}
        />

        {totalPages > 1 && (
          <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => table.setPage(p)}
            />
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
            emptyLabel="No support tickets found"
            renderRowActions={(row) => (
              <RowActionMenu
                actions={[
                  { label: ROW_ACTION_META[ROW_ACTION_ID.VIEW].label, onClick: () => { setSelectedRow(row as TicketRow); setDrawerOpen(true); } },
                ]}
              />
            )}
            columns={buildTicketColumns(setSelectedRow, setDrawerOpen) as any}
          />
        </div>

        <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
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
      </ListingFilterDrawer>
      </div>

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
      />
    </>
  );
}
