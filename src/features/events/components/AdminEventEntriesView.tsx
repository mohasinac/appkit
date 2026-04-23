"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Input,
  Select,
  StackedViewShell,
  Text,
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { apiClient } from "../../../http";
import { DataTable } from "../../admin/components/DataTable";
import type { AdminTableColumn } from "../../admin/types";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import type { EventEntryItem, EventEntryListResponse } from "../types";

interface AdminEventStatsResponse {
  event?: {
    title?: string;
  };
  stats?: {
    totalEntries?: number;
    approvedEntries?: number;
    flaggedEntries?: number;
  };
}

type EntryReviewStatus = "pending" | "approved" | "flagged";

const REVIEW_STATUS_OPTIONS: Array<{ label: string; value: EntryReviewStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Flagged", value: "flagged" },
];

export interface AdminEventEntriesViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  eventId?: string;
  entriesEndpoint?: (eventId: string) => string;
  entryReviewEndpoint?: (eventId: string, entryId: string) => string;
  statsEndpoint?: (eventId: string) => string;
  children?: React.ReactNode;
  /** Back-link and event title header */
  renderHeader?: () => React.ReactNode;
  /** Stats banner (total / approved / flagged counts) */
  renderStats?: () => React.ReactNode;
  /** Filter bar (status dropdown, sort, search) */
  renderFilters?: () => React.ReactNode;
  /** Entries data table */
  renderTable?: () => React.ReactNode;
  /** Pagination footer */
  renderPagination?: () => React.ReactNode;
  /** Entry review side-drawer */
  renderReviewDrawer?: () => React.ReactNode;
}

export function AdminEventEntriesView({
  eventId,
  entriesEndpoint,
  entryReviewEndpoint,
  statsEndpoint,
  renderHeader,
  renderStats,
  renderFilters,
  renderTable,
  renderPagination,
  renderReviewDrawer,
  ...rest
}: AdminEventEntriesViewProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(20);
  const [statusFilter, setStatusFilter] = React.useState<EntryReviewStatus | "all">("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const resolvedEntriesEndpoint = React.useMemo(() => {
    if (!eventId) return "";
    return entriesEndpoint?.(eventId) ?? ADMIN_ENDPOINTS.EVENT_ENTRIES(eventId);
  }, [entriesEndpoint, eventId]);

  const resolvedStatsEndpoint = React.useMemo(() => {
    if (!eventId) return "";
    return statsEndpoint?.(eventId) ?? ADMIN_ENDPOINTS.EVENT_STATS(eventId);
  }, [eventId, statsEndpoint]);

  const entriesQuery = useQuery<EventEntryListResponse>({
    queryKey: [
      "admin-event-entries",
      eventId,
      resolvedEntriesEndpoint,
      page,
      pageSize,
      statusFilter,
      searchQuery,
    ],
    queryFn: () => {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("pageSize", String(pageSize));
      if (statusFilter !== "all") sp.set("reviewStatus", statusFilter);
      if (searchQuery.trim()) sp.set("q", searchQuery.trim());
      return apiClient.get<EventEntryListResponse>(`${resolvedEntriesEndpoint}?${sp.toString()}`);
    },
    enabled: Boolean(eventId && resolvedEntriesEndpoint),
    staleTime: 15_000,
  });

  const statsQuery = useQuery<AdminEventStatsResponse>({
    queryKey: ["admin-event-stats", eventId, resolvedStatsEndpoint],
    queryFn: () => apiClient.get<AdminEventStatsResponse>(resolvedStatsEndpoint),
    enabled: Boolean(eventId && resolvedStatsEndpoint),
    staleTime: 15_000,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      entryId,
      status,
    }: {
      entryId: string;
      status: "approved" | "flagged";
    }) => {
      if (!eventId) throw new Error("eventId is required");
      const endpoint =
        entryReviewEndpoint?.(eventId, entryId) ??
        ADMIN_ENDPOINTS.EVENT_ENTRY_BY_ID(eventId, entryId);
      await apiClient.patch(endpoint, { status });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-event-entries", eventId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-event-stats", eventId] }),
      ]);
    },
  });

  const rows = entriesQuery.data?.items ?? [];
  const columns = React.useMemo<AdminTableColumn<EventEntryItem>[]>(() => [
    {
      key: "submittedAt",
      header: "Submitted",
      render: (row) => new Date(row.submittedAt).toLocaleString(),
    },
    {
      key: "userDisplayName",
      header: "User",
      render: (row) => row.userDisplayName || row.userEmail || row.userId || "Anonymous",
    },
    {
      key: "reviewStatus",
      header: "Status",
      render: (row) => (
        <Text className="text-xs font-medium uppercase tracking-wide">{row.reviewStatus}</Text>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={reviewMutation.isPending || row.reviewStatus === "approved"}
            onClick={() => reviewMutation.mutate({ entryId: row.id, status: "approved" })}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={reviewMutation.isPending || row.reviewStatus === "flagged"}
            onClick={() => reviewMutation.mutate({ entryId: row.id, status: "flagged" })}
          >
            Flag
          </Button>
        </div>
      ),
    },
  ], [reviewMutation]);

  const statsSection = (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Alert variant="info" title="Total entries">
        {String(statsQuery.data?.stats?.totalEntries ?? 0)}
      </Alert>
      <Alert variant="success" title="Approved">
        {String(statsQuery.data?.stats?.approvedEntries ?? 0)}
      </Alert>
      <Alert variant="warning" title="Flagged">
        {String(statsQuery.data?.stats?.flaggedEntries ?? 0)}
      </Alert>
    </div>
  );

  const filtersSection = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Input
        label="Search entries"
        value={searchQuery}
        onChange={(event) => {
          setPage(1);
          setSearchQuery(event.target.value);
        }}
        placeholder="Search by user, email, or id"
      />
      <Select
        label="Review status"
        value={statusFilter}
        options={REVIEW_STATUS_OPTIONS}
        onChange={(event) => {
          setPage(1);
          setStatusFilter(event.target.value as EntryReviewStatus | "all");
        }}
      />
    </div>
  );

  const tableSection = (
    <DataTable
      columns={columns}
      rows={rows}
      isLoading={entriesQuery.isLoading}
      currentPage={entriesQuery.data?.page ?? page}
      totalPages={entriesQuery.data?.totalPages ?? 1}
      onPageChange={setPage}
      emptyLabel="No entries found"
    />
  );

  const eventTitle = statsQuery.data?.event?.title;

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={eventTitle ? `${eventTitle} Entries` : "Event Entries"}
      renderHeader={renderHeader}
      sections={[
        !eventId ? (
          <Alert variant="warning" title="Missing event id">
            Event id is required to load entries.
          </Alert>
        ) : null,
        entriesQuery.error ? (
          <Alert variant="error" title="Could not load entries">
            {entriesQuery.error instanceof Error ? entriesQuery.error.message : "Unknown error"}
          </Alert>
        ) : null,
        statsQuery.error ? (
          <Alert variant="error" title="Could not load event stats">
            {statsQuery.error instanceof Error ? statsQuery.error.message : "Unknown error"}
          </Alert>
        ) : null,
        renderStats?.() ?? statsSection,
        renderFilters?.() ?? filtersSection,
        renderTable?.() ?? tableSection,
        renderPagination?.(),
      ]}
      overlays={renderReviewDrawer?.()}
    />
  );
}
