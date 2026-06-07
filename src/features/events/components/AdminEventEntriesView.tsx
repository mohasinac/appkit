"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Div,
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

const __P = {
  p4: "p-4",
} as const;

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

  const [expandedEntryId, setExpandedEntryId] = React.useState<string | null>(null);
  const [pointsInputs, setPointsInputs] = React.useState<Record<string, string>>({});

  const reviewMutation = useMutation({
    mutationFn: async ({
      entryId,
      status,
      points,
    }: {
      entryId: string;
      status: "approved" | "flagged";
      points?: number;
    }) => {
      if (!eventId) throw new Error("eventId is required");
      const endpoint =
        entryReviewEndpoint?.(eventId, entryId) ??
        ADMIN_ENDPOINTS.EVENT_ENTRY_BY_ID(eventId, entryId);
      await apiClient.patch(endpoint, { status, ...(points !== undefined ? { points } : {}) });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-event-entries", eventId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-event-stats", eventId] }),
      ]);
    },
  });

  const pointsMutation = useMutation({
    mutationFn: async ({ entryId, points, currentStatus }: { entryId: string; points: number; currentStatus: string }) => {
      if (!eventId) throw new Error("eventId is required");
      const endpoint =
        entryReviewEndpoint?.(eventId, entryId) ??
        ADMIN_ENDPOINTS.EVENT_ENTRY_BY_ID(eventId, entryId);
      const status = currentStatus === "flagged" ? "flagged" : "approved";
      await apiClient.patch(endpoint, { status, points });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-event-entries", eventId] });
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
      key: "points",
      header: "Points",
      render: (row) => (
        <Div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            className="w-20 rounded border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm px-2 py-1 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="0"
            value={pointsInputs[row.id] ?? (row.points !== undefined ? String(row.points) : "")}
            onChange={(e) =>
              setPointsInputs((prev) => ({ ...prev, [row.id]: e.target.value }))
            }
          />
          <Button
            size="sm"
            variant="outline"
            disabled={pointsMutation.isPending || !(row.id in pointsInputs)}
            onClick={() => {
              const val = Number(pointsInputs[row.id]);
              if (!isNaN(val)) {
                pointsMutation.mutate({ entryId: row.id, points: val, currentStatus: row.reviewStatus });
                setPointsInputs((prev) => { const next = { ...prev }; delete next[row.id]; return next; });
              }
            }}
          >
            Save
          </Button>
        </Div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <Div className="flex items-center gap-2 flex-wrap">
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
          {row.formResponses && Object.keys(row.formResponses).length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpandedEntryId((prev) => (prev === row.id ? null : row.id))}
            >
              {expandedEntryId === row.id ? "Hide" : "Responses"}
            </Button>
          )}
        </Div>
      ),
    },
  ], [reviewMutation, pointsMutation, pointsInputs, expandedEntryId]);

  const statsSection = (
    <Div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Alert variant="info" title="Total entries">
        {String(statsQuery.data?.stats?.totalEntries ?? 0)}
      </Alert>
      <Alert variant="success" title="Approved">
        {String(statsQuery.data?.stats?.approvedEntries ?? 0)}
      </Alert>
      <Alert variant="warning" title="Flagged">
        {String(statsQuery.data?.stats?.flaggedEntries ?? 0)}
      </Alert>
    </Div>
  );

  const filtersSection = (
    <Div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
    </Div>
  );

  const expandedEntry = expandedEntryId ? rows.find((r) => r.id === expandedEntryId) : null;

  const responsesPanelSection = expandedEntry?.formResponses && Object.keys(expandedEntry.formResponses).length > 0 ? (
    <Div className={`rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 ${__P.p4} space-y-3`}>
      <Text className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
        Responses — {expandedEntry.userDisplayName || expandedEntry.userId || "Anonymous"}
      </Text>
      <Div className="space-y-2">
        {Object.entries(expandedEntry.formResponses).map(([key, value]) => (
          <Div key={key} className="space-y-0.5">
            <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{key}</Text>
            <Text className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words">
              {Array.isArray(value) ? (value as unknown[]).join(", ") : String(value ?? "—")}
            </Text>
          </Div>
        ))}
      </Div>
    </Div>
  ) : null;

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
        responsesPanelSection,
        renderPagination?.(),
      ]}
      overlays={renderReviewDrawer?.()}
    />
  );
}
