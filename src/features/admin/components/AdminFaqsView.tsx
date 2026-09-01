"use client";

import { SIEVE_OP, Stack, sieveFilter, type JsonArray } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
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
import { AdminFaqEditorView } from "./AdminFaqEditorView";
import type { AdminTableColumn } from "../types";

interface AdminFaqsResponse {
  items?: JsonArray;
  total?: number;
}

interface FaqRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

const COLUMNS: AdminTableColumn<FaqRow>[] = [
  {
    key: "primary",
    header: "Question",
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

export interface AdminFaqsViewProps extends ListingLayoutProps {
  actionHref?: string;
  onBulkArchive?: (ids: string[]) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

export function AdminFaqsView({
  children,
  onBulkArchive,
  onBulkDelete,
  ...props
}: AdminFaqsViewProps) {
  const config = useMemo<ListingViewConfig<AdminFaqsResponse, FaqRow>>(
    () => ({
      portal: "admin",
      title: "FAQs",
      search: {
        placeholder: "Search questions, answers, categories or tags",
        /*
         * `buildFaqSearchTxt` indexes the question, the category, every tag AND
         * the answer body, all prefix-expanded. The old placeholder said
         * "tokens" — the name of the implementation — and omitted the answer,
         * which is the largest thing it searches.
         */
        fields: ["question", "answer", "category", "tags"],
      },
      emptyLabel: "No FAQs found",
      filterKeys: ["isActive"],
      defaultSort: sortBy("priority", "ASC"),
      queryKey: ["admin", "faqs", "listing"],
      endpoint: ADMIN_ENDPOINTS.FAQS,
      sortOptions: [
        { value: "priority", label: "Priority" },
        { value: sortBy("createdAt", "DESC"), label: "Newest" },
        { value: "question", label: "Question A–Z" },
      ],
      columns: COLUMNS,
      mapRows: (response) =>
        toRecordArray(response.items).map((item, index) => ({
          id: toStringValue(item.id, `faq-${index}`),
          primary: toStringValue(item.question, "Untitled question"),
          secondary: toStringValue(item.category, "Uncategorized"),
          status: toStringValue(
            typeof item.isActive === "boolean"
              ? item.isActive
                ? "Published"
                : "Draft"
              : item.status,
            "Draft",
          ),
          updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        })),
      getTotal: (response, mappedRows) =>
        typeof response.total === "number" ? response.total : mappedRows.length,
      buildFilters: (state) =>
        state.isActive ? sieveFilter("isActive", SIEVE_OP.EQ, state.isActive) : undefined,
      primaryAction: {
        label: "Add FAQ",
        onClick: ({ openCreatePanel }) => openCreatePanel(),
      },
      // Rule #7: bulk-action array sourced from the ADMIN_BULK_ACTIONS preset.
      buildBulkActions: (selection) => {
        const handlers: Partial<Record<(typeof ADMIN_BULK_ACTIONS.faqs)[number], () => Promise<void>>> = {
          [ROW_ACTION_ID.ARCHIVE]: onBulkArchive
            ? async () => { await onBulkArchive(selection.selectedIds); selection.clearSelection(); }
            : undefined,
          [ROW_ACTION_ID.DELETE]: onBulkDelete
            ? async () => { await onBulkDelete(selection.selectedIds); selection.clearSelection(); }
            : undefined,
        };
        return ADMIN_BULK_ACTIONS.faqs
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
            { id: "true", label: "Published" },
            { id: "false", label: "Draft" },
          ]}
          value={pendingFilters.isActive || ""}
          onChange={(v) => setPendingFilters((p) => ({ ...p, isActive: v }))}
        />
      ),
      renderEditor: ({ editId, closePanel }) => (
        <AdminFaqEditorView
          faqId={editId ?? undefined}
          onSaved={closePanel}
          onDeleted={closePanel}
          embedded
        />
      ),
      resolveEditorTitle: ({ isCreate }) => (isCreate ? "Add FAQ" : "Edit FAQ"),
    }),
    [onBulkArchive, onBulkDelete],
  );

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        <Heading level={1} className="sr-only">
          FAQs
        </Heading>
        {children}
      </ListingLayout>
    );
  }
  return (
    <>
      <Heading level={1} className="sr-only">
        FAQs
      </Heading>
      <DataListingView config={config} />
    </>
  );
}
