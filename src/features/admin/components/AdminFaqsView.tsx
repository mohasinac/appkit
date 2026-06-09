"use client";

import { sortBy } from "@mohasinac/appkit";
import React, { useMemo } from "react";
import { Div, Heading, ListingLayout, Span, Text } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
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
  items?: unknown[];
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
      <Div className="space-y-1">
        <Text className="font-semibold text-zinc-900 dark:text-zinc-100">
          {row.primary}
        </Text>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          {row.secondary}
        </Text>
      </Div>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-32",
    render: (row) => (
      <Span size="xs" weight="medium" className="inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-primary-800 dark:bg-secondary-900/30 dark:text-secondary-300">
        {row.status}
      </Span>
    ),
  },
  {
    key: "updatedAt",
    header: "Updated",
    className: "w-32",
    render: (row) => (
      <Text className="text-sm text-zinc-500 dark:text-zinc-400">{row.updatedAt}</Text>
    ),
  },
];

export interface AdminFaqsViewProps extends ListingLayoutProps {
  actionHref?: string;
  getRowHref?: (row: AdminListingScaffoldRow) => string;
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
      searchPlaceholder: "Search questions, categories, or tokens",
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
        state.isActive ? `isActive==${state.isActive}` : undefined,
      primaryAction: {
        label: "Add FAQ",
        onClick: ({ openCreatePanel }) => openCreatePanel(),
      },
      buildBulkActions: (selection) =>
        [
          ...(onBulkArchive
            ? [
                buildBulkAction(ACTIONS.ADMIN["archive-faq"], async () => {
                  await onBulkArchive(selection.selectedIds);
                  selection.clearSelection();
                }),
              ]
            : []),
          ...(onBulkDelete
            ? [
                buildBulkAction(ACTIONS.ADMIN["delete-faq"], async () => {
                  await onBulkDelete(selection.selectedIds);
                  selection.clearSelection();
                }),
              ]
            : []),
        ] satisfies BulkActionItem[],
      renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
        <Div className="space-y-2">
          <Text className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Status
          </Text>
          <Div className="flex flex-wrap gap-2">
            {[
              { label: "All", value: "" },
              { label: "Published", value: "true" },
              { label: "Draft", value: "false" },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() =>
                  setPendingFilters((p) => ({ ...p, isActive: opt.value }))
                }
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  (pendingFilters.isActive || "") === opt.value
                    ? "bg-primary text-white border-primary"
                    : "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </Div>
        </Div>
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
