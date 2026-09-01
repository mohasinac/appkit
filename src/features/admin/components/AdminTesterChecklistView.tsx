"use client";

import { SIEVE_OP, Stack, sieveFilter, type JsonArray } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React, { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FilterChipGroup, Heading, ListingLayout, RowActionMenu, Span, Text } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { apiClient } from "../../../http";
import { useApiMutation } from "../../../client";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_BULK_ACTIONS, ROW_ACTION_META, ROW_ACTION_ID } from "../../products/constants/action-defs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { AdminTesterChecklistItemEditorView } from "./AdminTesterChecklistItemEditorView";
import type { AdminTableColumn } from "../types";

const LISTING_QUERY_KEY = ["admin", "tester-checklist-items", "listing"];

interface AdminTesterChecklistItemsResponse {
  items?: JsonArray;
  total?: number;
}

interface ChecklistItemRow {
  id: string;
  primary: string;
  secondary: string;
  phase: number;
  status: string;
  updatedAt: string;
  bugConfirmed: boolean;
  supersededByItemId?: string;
}

const COLUMNS: AdminTableColumn<ChecklistItemRow>[] = [
  {
    key: "primary",
    header: "Test case",
    sortable: true,
    render: (row) => (
      <Stack gap="xs">
        <Text weight="semibold" color="primary">
          {row.primary}
        </Text>
        <Text size="xs" color="muted">
          {row.secondary}
        </Text>
      </Stack>
    ),
  },
  {
    key: "phase",
    header: "Phase",
    className: "w-20",
    render: (row) => <Text size="sm" color="muted">{row.phase}</Text>,
  },
  {
    key: "status",
    header: "Status",
    className: "w-32",
    render: (row) => (
      <Span size="xs" weight="medium" className="inline-flex bg-primary-50 text-primary-800 dark:bg-secondary-900/30 dark:text-secondary-300" rounded="full" padding="pill-sm-tall">
        {row.status}
      </Span>
    ),
  },
  {
    key: "updatedAt",
    header: "Updated",
    className: "w-32",
    render: (row) => (
      <Text size="sm" color="muted">{row.updatedAt}</Text>
    ),
  },
];

export interface AdminTesterChecklistViewProps extends ListingLayoutProps {
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

export function AdminTesterChecklistView({
  children,
  onBulkDelete,
  ...props
}: AdminTesterChecklistViewProps) {
  const queryClient = useQueryClient();

  const reopenMutation = useApiMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(ADMIN_ENDPOINTS.TESTER_CHECKLIST_ITEM_REOPEN(id), {});
    },
    successMessage: "Case reopened for retest.",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LISTING_QUERY_KEY });
    },
  });

  const config = useMemo<ListingViewConfig<AdminTesterChecklistItemsResponse, ChecklistItemRow>>(
    () => ({
      portal: "admin",
      title: "Tester Checklist",
      search: {
        placeholder: "Search test cases, descriptions, groups or pages",
        // `TesterChecklistItemRepository` builds `searchTxt` from label,
        // description, groupLabel and pageLabel.
        fields: ["label", "description", "groupLabel", "pageLabel"],
      },
      emptyLabel: "No checklist items found",
      filterKeys: ["isActive", "bugConfirmed"],
      // Bug-confirmed (and reopened-away) cases are always isActive:false —
      // default to Active so they don't clutter the catalog; "Inactive" /
      // "All" remain an explicit escape hatch via the filter chips below.
      filterDefaults: { isActive: "true" },
      defaultSort: sortBy("order", "ASC"),
      queryKey: LISTING_QUERY_KEY,
      endpoint: ADMIN_ENDPOINTS.TESTER_CHECKLIST_ITEMS,
      sortOptions: [
        { value: "order", label: "Order" },
        { value: "phase", label: "Phase" },
        { value: sortBy("createdAt", "DESC"), label: "Newest" },
        { value: "label", label: "Test case A–Z" },
      ],
      columns: COLUMNS,
      mapRows: (response) =>
        toRecordArray(response.items).map((item, index) => {
          const bugConfirmed = item.bugConfirmed === true;
          const version = typeof item.version === "number" ? item.version : 1;
          const status = bugConfirmed
            ? "Bug Confirmed"
            : toStringValue(
                typeof item.isActive === "boolean"
                  ? item.isActive
                    ? "Active"
                    : "Inactive"
                  : item.status,
                "Active",
              );
          const secondary = bugConfirmed
            ? `${toStringValue(item.groupLabel, "Uncategorized")} / ${toStringValue(item.pageLabel, "")} — 🐛 found by ${toStringValue(item.bugHunterName, "unknown tester")} (v${version})`
            : `${toStringValue(item.groupLabel, "Uncategorized")} / ${toStringValue(item.pageLabel, "")}`;
          return {
            id: toStringValue(item.id, `checklist-${index}`),
            primary: toStringValue(item.label, "Untitled test case"),
            secondary,
            phase: typeof item.phase === "number" ? item.phase : 1,
            status,
            updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
            bugConfirmed,
            supersededByItemId: item.supersededByItemId
              ? toStringValue(item.supersededByItemId, "")
              : undefined,
          };
        }),
      getTotal: (response, mappedRows) =>
        typeof response.total === "number" ? response.total : mappedRows.length,
      buildFilters: (state) => {
        const parts: string[] = [];
        if (state.isActive && state.isActive !== "All") {
          parts.push(sieveFilter("isActive", SIEVE_OP.EQ, state.isActive));
        }
        if (state.bugConfirmed && state.bugConfirmed !== "All") {
          parts.push(sieveFilter("bugConfirmed", SIEVE_OP.EQ, state.bugConfirmed));
        }
        return parts.join(",") || undefined;
      },
      primaryAction: {
        label: "Add Test Case",
        onClick: ({ openCreatePanel }) => openCreatePanel(),
      },
      // Rule #7: bulk-action array sourced from the ADMIN_BULK_ACTIONS preset.
      buildBulkActions: (selection) => {
        const handlers: Partial<Record<(typeof ADMIN_BULK_ACTIONS.testerChecklistItems)[number], () => Promise<void>>> = {
          [ROW_ACTION_ID.DELETE]: onBulkDelete
            ? async () => { await onBulkDelete(selection.selectedIds); selection.clearSelection(); }
            : undefined,
        };
        return ADMIN_BULK_ACTIONS.testerChecklistItems
          .filter((id) => handlers[id])
          .map((id) => ({
            id,
            label: ROW_ACTION_META[id].label,
            destructive: ROW_ACTION_META[id].destructive,
            onClick: handlers[id]!,
          })) satisfies BulkActionItem[];
      },
      renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
        <Stack gap="md">
          <FilterChipGroup
            label="Status"
            tabs={[
              { id: "All", label: "All" },
              { id: "true", label: "Active" },
              { id: "false", label: "Inactive" },
            ]}
            value={pendingFilters.isActive || ""}
            onChange={(v) => setPendingFilters((p) => ({ ...p, isActive: v }))}
          />
          <FilterChipGroup
            label="Bug status"
            tabs={[
              { id: "All", label: "All" },
              { id: "true", label: "Bug Confirmed" },
            ]}
            value={pendingFilters.bugConfirmed || ""}
            onChange={(v) => setPendingFilters((p) => ({ ...p, bugConfirmed: v }))}
          />
        </Stack>
      ),
      renderRowActions: (row) => (
        <RowActionMenu
          actions={[
            {
              label: ACTIONS.ADMIN["reopen-checklist-item"].label,
              disabled: !row.bugConfirmed || !!row.supersededByItemId,
              onClick: () => reopenMutation.mutate(row.id),
            },
          ]}
        />
      ),
      renderEditor: ({ editId, closePanel }) => (
        <AdminTesterChecklistItemEditorView
          itemId={editId ?? undefined}
          onSaved={closePanel}
          onDeleted={closePanel}
          embedded
        />
      ),
      resolveEditorTitle: ({ isCreate }) => (isCreate ? "Add Test Case" : "Edit Test Case"),
    }),
    [onBulkDelete, reopenMutation],
  );

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        <Heading level={1} className="sr-only">
          Tester Checklist
        </Heading>
        {children}
      </ListingLayout>
    );
  }
  return (
    <>
      <Heading level={1} className="sr-only">
        Tester Checklist
      </Heading>
      <DataListingView config={config} />
    </>
  );
}
