"use client";

import { useApiMutation, type JsonArray } from "../../../client";
import { SIEVE_OP, sieveFilter } from "../../../utils/sieve-builder";
import { sortBy } from "../../../constants/sort";
import { TESTER_CHECKLIST_RESPONSE_FIELDS } from "../schemas/firestore";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FilterChipGroup, RowActionMenu, Stack, Text } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../../admin/hooks/useAdminListingData";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";
import type { AdminTableColumn } from "../../admin/types";
import { apiClient } from "../../../http";

interface AdminTesterFeedbackResponse {
  items?: JsonArray;
  total?: number;
}

interface FeedbackRow {
  id: string;
  primary: string;
  secondary: string;
  answer: string;
  status: string;
  updatedAt: string;
  screenshotUrl?: string;
}

const COLUMNS: AdminTableColumn<FeedbackRow>[] = [
  {
    key: "primary",
    header: "Tester / Case",
    sortable: true,
    render: (row) => (
      <Stack gap="xs">
        <Text weight="semibold" color="primary">{row.primary}</Text>
        <Text size="xs" color="muted">{row.secondary}</Text>
      </Stack>
    ),
  },
  {
    key: "answer",
    header: "Answer",
    className: "w-24",
    render: (row) => (
      <Text weight="medium" color={row.answer === "no" ? "error" : "success"}>
        {row.answer === "no" ? "No" : row.answer === "yes" ? "Yes" : "—"}
      </Text>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-28",
    render: (row) => <Text size="sm" color="muted">{row.status}</Text>,
  },
  {
    key: "updatedAt",
    header: "Updated",
    className: "w-32",
    render: (row) => <Text size="sm" color="muted">{row.updatedAt}</Text>,
  },
];

export type AdminTesterFeedbackListViewProps = Record<string, never>;

export function AdminTesterFeedbackListView(_props: AdminTesterFeedbackListViewProps) {
  const queryClient = useQueryClient();

  const patchMutation = useApiMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(ADMIN_ENDPOINTS.TESTER_FEEDBACK_BY_ID(id), {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tester-feedback"] });
    },
  });

  const confirmBugMutation = useApiMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(ADMIN_ENDPOINTS.TESTER_FEEDBACK_CONFIRM_BUG(id), {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tester-feedback"] });
    },
  });

  const config: ListingViewConfig<AdminTesterFeedbackResponse, FeedbackRow> = {
    portal: "admin",
    title: "All Submissions",
    searchPlaceholder: "Search tester, comment, or case",
    emptyLabel: "No feedback submitted yet",
    filterKeys: ["answer", "status"],
    defaultSort: sortBy(TESTER_CHECKLIST_RESPONSE_FIELDS.CREATED_AT, "DESC"),
    queryKey: ["admin", "tester-feedback", "listing"],
    endpoint: ADMIN_ENDPOINTS.TESTER_FEEDBACK,
    sortOptions: [
      { value: sortBy(TESTER_CHECKLIST_RESPONSE_FIELDS.CREATED_AT, "DESC"), label: "Newest" },
      { value: sortBy(TESTER_CHECKLIST_RESPONSE_FIELDS.CREATED_AT, "ASC"), label: "Oldest" },
      { value: sortBy(TESTER_CHECKLIST_RESPONSE_FIELDS.PHASE, "ASC"), label: "Phase" },
    ],
    columns: COLUMNS,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `feedback-${index}`),
        primary: toStringValue(item.testerDisplayName, "Unknown tester"),
        secondary: `Phase ${toStringValue(item.phase, "?")} — ${toStringValue(item.groupKey, "")} / ${toStringValue(item.pageKey, "")}${item.comment ? " — " + toStringValue(item.comment, "") : ""}`,
        answer: toStringValue(item.answer, ""),
        status: toStringValue(item.status, "new"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        screenshotUrl: item.screenshotUrl ? toStringValue(item.screenshotUrl, "") : undefined,
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (state) => {
      const parts: string[] = [];
      if (state.answer && state.answer !== "All") parts.push(sieveFilter("answer", SIEVE_OP.EQ, state.answer));
      if (state.status && state.status !== "All") parts.push(sieveFilter("status", SIEVE_OP.EQ, state.status));
      return parts.join(",") || undefined;
    },
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <>
        <FilterChipGroup
          label="Answer"
          tabs={[
            { id: "All", label: "All" },
            { id: "yes", label: "Yes" },
            { id: "no", label: "No" },
          ]}
          value={pendingFilters.answer || ""}
          onChange={(v) => setPendingFilters((p) => ({ ...p, answer: v }))}
        />
        <FilterChipGroup
          label="Status"
          tabs={[
            { id: "All", label: "All" },
            { id: "new", label: "New" },
            { id: "reviewed", label: "Reviewed" },
          ]}
          value={pendingFilters.status || ""}
          onChange={(v) => setPendingFilters((p) => ({ ...p, status: v }))}
        />
      </>
    ),
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          {
            label: ACTIONS.ADMIN["mark-feedback-reviewed"].label,
            disabled: row.status === "reviewed",
            onClick: () => patchMutation.mutate(row.id),
          },
          {
            label: ACTIONS.ADMIN["confirm-bug"].label,
            disabled: row.answer !== "no",
            onClick: () => confirmBugMutation.mutate(row.id),
          },
        ]}
      />
    ),
  };

  return <DataListingView config={config} />;
}
