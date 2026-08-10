"use client";

import { SIEVE_OP, Stack, sieveFilter, type JsonArray, type JsonValue } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React from "react";
import { FilterChipGroup, Heading, ListingLayout, Span, Text } from "../../../ui";
import type { ListingLayoutProps, BulkActionItem } from "../../../ui";
import { CATEGORY_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { AdminCategoryEditorView } from "./AdminCategoryEditorView";
import { ADMIN_BULK_ACTIONS, ROW_ACTION_META } from "../../products/constants/action-defs";
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
  // Rule #7: bulk-action array sourced from the ADMIN_BULK_ACTIONS preset.
  buildBulkActions: (selection) =>
    ADMIN_BULK_ACTIONS.categories.map((id) => ({
      id,
      label: ROW_ACTION_META[id].label,
      variant: "primary" as const,
      onClick: () => {
        const rowId = selection.selectedIds[0];
        if (rowId) selection.openEditPanel(rowId);
        selection.clearSelection();
      },
    })) satisfies BulkActionItem[],
  renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
    <>
      <FilterChipGroup
        label="Active"
        tabs={[
          { id: "All", label: "All" },
          { id: "true", label: "Active" },
          { id: "false", label: "Inactive" },
        ]}
        value={pendingFilters.isActive || ""}
        onChange={(v) => setPendingFilters((p) => ({ ...p, isActive: v }))}
      />
      <FilterChipGroup
        label="Featured"
        tabs={[
          { id: "All", label: "All" },
          { id: "true", label: "Featured only" },
        ]}
        value={pendingFilters.isFeatured || ""}
        onChange={(v) => setPendingFilters((p) => ({ ...p, isFeatured: v }))}
      />
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
