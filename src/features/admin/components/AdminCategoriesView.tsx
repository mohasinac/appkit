"use client";

import { Row, SIEVE_OP, Stack, sieveFilter, type JsonArray, type JsonValue } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React from "react";
import { Div, Heading, ListingLayout, Span, Text } from "../../../ui";
import type { ListingLayoutProps, BulkActionItem } from "../../../ui";
import { CATEGORY_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { AdminCategoryEditorView } from "./AdminCategoryEditorView";
import type { AdminTableColumn } from "../types";

interface AdminCategoriesResponse {
  data?: JsonValue;
  items?: JsonArray;
  total?: number;
}

interface CategoryRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

const COLUMNS: AdminTableColumn<CategoryRow>[] = [
  {
    key: "primary",
    header: "Category",
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

const ADMIN_CATEGORIES_CONFIG: ListingViewConfig<AdminCategoriesResponse, CategoryRow> = {
  portal: "admin",
  title: "Categories",
  searchPlaceholder: "Search categories, slugs, or parent category",
  emptyLabel: "No categories found",
  filterKeys: ["isActive", "isFeatured"],
  defaultSort: sortBy("name", "ASC"),
  pageSize: 50,
  queryKey: ["admin", "categories", "listing"],
  endpoint: `${CATEGORY_ENDPOINTS.LIST}?flat=true`,
  sortOptions: [
    { value: sortBy("name", "ASC"), label: "Name A–Z" },
    { value: sortBy("name", "DESC"), label: "Name Z–A" },
    { value: sortBy("createdAt", "DESC"), label: "Newest" },
  ],
  columns: COLUMNS,
  mapRows: (response) => {
    const sourceItems = Array.isArray(response.data) ? response.data : response.items;
    return toRecordArray(sourceItems).map((item, index) => ({
      id: toStringValue(item.id, `category-${index}`),
      primary: toStringValue(item.name, "Untitled category"),
      secondary: `Slug: ${toStringValue(item.slug, "no-slug")} · Tier: ${typeof item.tier === "number" ? String(item.tier) : "-"} · Parent: ${toStringValue(item.parentId, "root")}`,
      status:
        typeof item.isActive === "boolean"
          ? item.isActive
            ? "Active"
            : "Inactive"
          : toStringValue(item.status, "Active"),
      updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
    }));
  },
  getTotal: (response, mappedRows) =>
    typeof response.total === "number" ? response.total : mappedRows.length,
  buildFilters: (state) => {
    const parts: string[] = [];
    if (state.isActive) parts.push(sieveFilter("isActive", SIEVE_OP.EQ, state.isActive));
    if (state.isFeatured === "true") parts.push("isFeatured==true");
    return parts.join(",") || undefined;
  },
  primaryAction: {
    label: "Add Category",
    onClick: ({ openCreatePanel }) => openCreatePanel(),
  },
  buildBulkActions: (selection) =>
    [
      {
        id: "edit",
        label: ACTIONS.ADMIN["edit-category"].label,
        variant: "primary",
        onClick: () => {
          const id = selection.selectedIds[0];
          if (id) selection.openEditPanel(id);
          selection.clearSelection();
        },
      },
    ] satisfies BulkActionItem[],
  renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
    <>
      <Stack gap="sm">
        <Text className="tracking-widest" color="muted" size="xs" weight="semibold" transform="uppercase">
          Active
        </Text>
        <Row wrap gap="sm">
          {[
            { label: "All", value: "" },
            { label: "Active", value: "true" },
            { label: "Inactive", value: "false" },
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
        </Row>
      </Stack>
      <Stack gap="sm">
        <Text className="tracking-widest" color="muted" size="xs" weight="semibold" transform="uppercase">
          Featured
        </Text>
        <Row wrap gap="sm">
          {[
            { label: "All", value: "" },
            { label: "Featured only", value: "true" },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() =>
                setPendingFilters((p) => ({ ...p, isFeatured: opt.value }))
              }
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
 (pendingFilters.isFeatured || "") === opt.value
 ? "bg-primary text-white border-primary"
 : "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800"
 }`}
            >
              {opt.label}
            </button>
          ))}
        </Row>
      </Stack>
    </>
  ),
  renderEditor: ({ editId, closePanel }) => (
    <AdminCategoryEditorView
      categoryId={editId ?? undefined}
      onSaved={closePanel}
      onDeleted={closePanel}
      embedded
    />
  ),
  resolveEditorTitle: ({ isCreate }) => (isCreate ? "Add Category" : "Edit Category"),
};

export interface AdminCategoriesViewProps extends ListingLayoutProps {
  getRowHref?: (row: { id: string }) => string;
}

export function AdminCategoriesView({
  children,
  getRowHref: _getRowHref,
  ...props
}: AdminCategoriesViewProps) {
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        <Heading level={1} className="sr-only">
          Categories
        </Heading>
        {children}
      </ListingLayout>
    );
  }
  return (
    <>
      <Heading level={1} className="sr-only">
        Categories
      </Heading>
      <DataListingView config={ADMIN_CATEGORIES_CONFIG} />
    </>
  );
}
