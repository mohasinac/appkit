"use client";

import { useApiMutation, sieveFilter, SIEVE_OP, sortBy } from "@mohasinac/appkit/client";
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Div, Input, Row, Select, Stack, Text, useToast,
  RecordDetailModal,
} from "../../../ui";
import { apiClient } from "../../../http";
import { normalizeError } from "../../../errors/normalize";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";
import type { AdminTableColumn } from "../../admin/types";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import type { EventEntryItem, EventEntryListResponse } from "../types";

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

export interface AdminEventEntriesViewProps {
  eventId?: string;
  entriesEndpoint?: (eventId: string) => string;
  entryReviewEndpoint?: (eventId: string, entryId: string) => string;
  statsEndpoint?: (eventId: string) => string;
}

export function AdminEventEntriesView({
  eventId,
  entriesEndpoint,
  entryReviewEndpoint,
  statsEndpoint,
}: AdminEventEntriesViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const resolvedEntriesEndpoint = React.useMemo(() => {
    if (!eventId) return "";
    return entriesEndpoint?.(eventId) ?? ADMIN_ENDPOINTS.EVENT_ENTRIES(eventId);
  }, [entriesEndpoint, eventId]);

  const resolvedStatsEndpoint = React.useMemo(() => {
    if (!eventId) return "";
    return statsEndpoint?.(eventId) ?? ADMIN_ENDPOINTS.EVENT_STATS(eventId);
  }, [eventId, statsEndpoint]);

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

  const pollOptionLabels = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of statsQuery.data?.event?.pollConfig?.options ?? []) {
      map.set(opt.id, opt.label);
    }
    return map;
  }, [statsQuery.data]);

  const columns: AdminTableColumn<EventEntryItem>[] = [
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
        <Row gap="xs" align="center">
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
      render: (row) => {
        const hasFormResponses = Boolean(row.formResponses && Object.keys(row.formResponses).length > 0);
        const hasPollVotes = Boolean(row.pollVotes && row.pollVotes.length > 0);
        const isExpanded = expandedEntryId === row.id;
        return (
          <Stack gap="sm">
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
              {(hasFormResponses || hasPollVotes) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setExpandedEntryId((prev) => (prev === row.id ? null : row.id))}
                >
                  {isExpanded ? "Hide" : "Responses"}
                </Button>
              )}
            </Row>
            {isExpanded && (hasFormResponses || hasPollVotes) && (
              <Stack className="p-[var(--appkit-space-3)]" gap="3" rounded="xl" surface="muted" border="default">
                {hasPollVotes && (
                  <Stack gap="sm">
                    <Text size="xs" weight="medium" color="muted">Poll votes</Text>
                    <Text className={CLS_RESPONSE_TEXT} color="primary" size="sm">
                      {row.pollVotes!.map((id) => pollOptionLabels.get(id) ?? id).join(", ")}
                    </Text>
                    {row.pollComment && (
                      <>
                        <Text size="xs" weight="medium" color="muted">Comment</Text>
                        <Text className={CLS_RESPONSE_TEXT} color="primary" size="sm">{row.pollComment}</Text>
                      </>
                    )}
                  </Stack>
                )}
                {hasFormResponses && (
                  <Stack gap="sm">
                    {Object.entries(row.formResponses!).map(([key, value]) => (
                      <Stack gap="none" key={key}>
                        <Text size="xs" weight="medium" color="muted">{key}</Text>
                        <Text className={CLS_RESPONSE_TEXT} color="primary" size="sm">
                          {Array.isArray(value) ? (value as unknown[]).join(", ") : String(value ?? "—")}
                        </Text>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Stack>
            )}
          </Stack>
        );
      },
    },
  ];

  const eventTitle = statsQuery.data?.event?.title;

  // Approve / Waitlist / Cancel were offered on an entry the admin could never
  // read — the poll vote, the comment and the survey answers were all invisible
  // (Root Cause #56, "acting blind"). The row already carries the whole entry.
  const [detail, setDetail] = useState<EventEntryItem | null>(null);

  const config: ListingViewConfig<EventEntryListResponse, EventEntryItem> = {
    portal: "admin",
    title: eventTitle ? `${eventTitle} Entries` : "Event Entries",
    searchPlaceholder: "Search by user, email, or id",
    emptyLabel: "No entries found",
    filterKeys: ["reviewStatus"],
    defaultSort: sortBy("submittedAt", "DESC"),
    queryKey: ["admin-event-entries", eventId, resolvedEntriesEndpoint],
    endpoint: resolvedEntriesEndpoint,
    sortOptions: [{ value: sortBy("submittedAt", "DESC"), label: "Most recent" }],
    columns,
    onRowClick: (row) => setDetail(row),
    mapRows: (response) => response.items ?? [],
    getTotal: (response) => response.total ?? (response.items ?? []).length,
    buildFilters: (state) =>
      state.reviewStatus ? sieveFilter("reviewStatus", SIEVE_OP.EQ, state.reviewStatus) : undefined,
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <Select
        label="Review status"
        value={pendingFilters.reviewStatus || "all"}
        options={REVIEW_STATUS_OPTIONS}
        onChange={(e) => setPendingFilters((p) => ({ ...p, reviewStatus: e.target.value === "all" ? "" : e.target.value }))}
      />
    ),
    toolbarExtra: eventId ? (
      <Button variant="ghost" action={ACTIONS.ADMIN["export-event-entries"]} onClick={handleExportReport} />
    ) : undefined,
    renderAboveContent: () => (
      <Stack gap="3" className="px-[var(--appkit-space-3)] pb-[var(--appkit-space-2)]">
        {!eventId ? (
          <Alert variant="warning" title="Missing event id">
            Event id is required to load entries.
          </Alert>
        ) : null}
        {statsQuery.error ? (
          <Alert variant="error" title="Could not load event stats">
            {statsQuery.error instanceof Error ? statsQuery.error.message : "Unknown error"}
          </Alert>
        ) : null}
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
      </Stack>
    ),
  };

  return (
    <>
      <DataListingView config={config} />
      <RecordDetailModal
        isOpen={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.userDisplayName || detail?.userEmail || "Entry"}
        badges={detail ? [{ label: detail.reviewStatus }] : undefined}
        description={detail?.pollComment}
        fields={
          detail
            ? [
                { label: "Entrant", value: detail.userDisplayName ?? detail.userId ?? "—" },
                { label: "Email", value: detail.userEmail ?? "—" },
                { label: "Review status", value: detail.reviewStatus },
                { label: "Points", value: detail.points != null ? String(detail.points) : "—" },
                { label: "Raffle eligible", value: detail.raffleEligible ? "Yes" : "No" },
                { label: "Poll votes", value: detail.pollVotes?.join(", ") || "—" },
                { label: "Reviewed by", value: detail.reviewedBy ?? "—" },
                { label: "Review note", value: detail.reviewNote ?? "—" },
                { label: "Entry ID", value: detail.id },
              ]
            : undefined
        }
        // The survey/feedback answers — the actual submission being judged.
        metadata={detail?.formResponses}
      />
    </>
  );
}
