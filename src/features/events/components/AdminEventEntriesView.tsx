"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Div, Input, Row, Select, Stack, StackedViewShell, Text, useToast } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { apiClient } from "../../../http";
import { normalizeError } from "../../../errors/normalize";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { DataTable } from "../../admin/components/DataTable";
import type { AdminTableColumn } from "../../admin/types";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import type { EventEntryItem, EventEntryListResponse } from "../types";

const __P = {
  p4: "p-[var(--appkit-space-4)]",
} as const;

const CLS_RESPONSE_TEXT = "whitespace-pre-wrap break-words";

interface AdminEventStatsResponse {
  event?: {
    title?: string;
    type?: string;
    pollConfig?: { options?: { id: string; label: string }[] };
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
  const { showToast } = useToast();
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

  const reviewMutation = useApiMutation({
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

  const pointsMutation = useApiMutation({
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
        <Text className="tracking-wide" size="xs" weight="medium" transform="uppercase">{row.reviewStatus}</Text>
      ),
    },
    {
      key: "points",
      header: "Points",
      render: (row) => (
        <Row gap="xs" className="" align="center">
          <Input
            bare
            type="number"
            min={0}
            className="w-20"
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
        </Row>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <Row align="center" gap="sm" wrap>
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
          {((row.formResponses && Object.keys(row.formResponses).length > 0) ||
            (row.pollVotes && row.pollVotes.length > 0)) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpandedEntryId((prev) => (prev === row.id ? null : row.id))}
            >
              {expandedEntryId === row.id ? "Hide" : "Responses"}
            </Button>
          )}
        </Row>
      ),
    },
  ], [reviewMutation, pointsMutation, pointsInputs, expandedEntryId]);

  const handleExportReport = async () => {
    if (!eventId) return;
    try {
      const blob = await apiClient.blob(ADMIN_ENDPOINTS.EVENT_ENTRIES_EXPORT(eventId));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `event-entries-${eventId}-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_err) {
      void normalizeError(_err);
      showToast("Report export failed.", "error");
    }
  };

  const exportSection = eventId ? (
    <Row justify="end">
      <Button variant="ghost" action={ACTIONS.ADMIN["export-event-entries"]} onClick={handleExportReport} />
    </Row>
  ) : null;

  const statsSection = (
    <Div layout="grid" gap="3" className="grid-cols-1 sm:grid-cols-3">
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
    <Div layout="grid" gap="3" className="grid-cols-1 md:grid-cols-3">
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

  const pollOptionLabels = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of statsQuery.data?.event?.pollConfig?.options ?? []) {
      map.set(opt.id, opt.label);
    }
    return map;
  }, [statsQuery.data]);

  const expandedEntry = expandedEntryId ? rows.find((r) => r.id === expandedEntryId) : null;
  const expandedHasFormResponses = Boolean(
    expandedEntry?.formResponses && Object.keys(expandedEntry.formResponses).length > 0,
  );
  const expandedHasPollVotes = Boolean(expandedEntry?.pollVotes && expandedEntry.pollVotes.length > 0);

  const responsesPanelSection = expandedEntry && (expandedHasFormResponses || expandedHasPollVotes) ? (
    <Stack className={`${__P.p4}`} gap="3" rounded="xl" surface="muted" border="default">
      <Text size="sm" weight="semibold" color="primary">
        Responses — {expandedEntry.userDisplayName || expandedEntry.userId || "Anonymous"}
      </Text>
      {expandedHasPollVotes && (
        <Stack gap="sm">
          <Text size="xs" weight="medium" color="muted">Poll votes</Text>
          <Text className={CLS_RESPONSE_TEXT} color="primary" size="sm">
            {expandedEntry!.pollVotes!.map((id) => pollOptionLabels.get(id) ?? id).join(", ")}
          </Text>
          {expandedEntry!.pollComment && (
            <>
              <Text size="xs" weight="medium" color="muted">Comment</Text>
              <Text className={CLS_RESPONSE_TEXT} color="primary" size="sm">
                {expandedEntry!.pollComment}
              </Text>
            </>
          )}
        </Stack>
      )}
      {expandedHasFormResponses && (
        <Stack gap="sm">
          {Object.entries(expandedEntry!.formResponses!).map(([key, value]) => (
            <Stack gap="none" key={key} className="">
              <Text size="xs" weight="medium" color="muted">{key}</Text>
              <Text className={CLS_RESPONSE_TEXT} color="primary" size="sm">
                {Array.isArray(value) ? (value as unknown[]).join(", ") : String(value ?? "—")}
              </Text>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
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
        exportSection,
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
