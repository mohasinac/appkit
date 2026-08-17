"use client";

import { SIEVE_OP, Stack, sieveFilter, type JsonArray } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React, { useMemo } from "react";
import { FilterChipGroup, Heading, ListingLayout, Span, Text } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_BULK_ACTIONS, ROW_ACTION_META, ROW_ACTION_ID } from "../../products/constants/action-defs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { AdminListingScaffoldRow, ListingViewConfig } from "./DataListingView";
import { AdminTesterChecklistItemEditorView } from "./AdminTesterChecklistItemEditorView";
import type { AdminTableColumn } from "../types";

interface AdminTesterChecklistItemsResponse {
  items?: JsonArray;
  total?: number;
}

interface ChecklistItemRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
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
  const config = useMemo<ListingViewConfig<AdminTesterChecklistItemsResponse, ChecklistItemRow>>(
    () => ({
      portal: "admin",
      title: "Tester Checklist",
      searchPlaceholder: "Search test cases, groups, or pages",
      emptyLabel: "No checklist items found",
      filterKeys: ["isActive"],
      defaultSort: sortBy("order", "ASC"),
      queryKey: ["admin", "tester-checklist-items", "listing"],
      endpoint: ADMIN_ENDPOINTS.TESTER_CHECKLIST_ITEMS,
      sortOptions: [
        { value: "order", label: "Order" },
        { value: sortBy("createdAt", "DESC"), label: "Newest" },
        { value: "label", label: "Test case A–Z" },
      ],
      columns: COLUMNS,
      mapRows: (response) =>
        toRecordArray(response.items).map((item, index) => ({
          id: toStringValue(item.id, `checklist-${index}`),
          primary: toStringValue(item.label, "Untitled test case"),
          secondary: `${toStringValue(item.groupLabel, "Uncategorized")} / ${toStringValue(item.pageLabel, "")}`,
          status: toStringValue(
            typeof item.isActive === "boolean"
              ? item.isActive
                ? "Active"
                : "Inactive"
              : item.status,
            "Active",
          ),
          updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        })),
      getTotal: (response, mappedRows) =>
        typeof response.total === "number" ? response.total : mappedRows.length,
      buildFilters: (state) =>
        state.isActive ? sieveFilter("isActive", SIEVE_OP.EQ, state.isActive) : undefined,
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
    [onBulkDelete],
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
