"use client";

import { SIEVE_OP, Stack, sieveFilter, type JsonArray } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React from "react";
import { FilterChipGroup, ListingLayout, Text } from "../../../ui";
import type { ListingLayoutProps, BulkActionItem } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { AdminBrandEditorView } from "./AdminBrandEditorView";
import { ADMIN_BULK_ACTIONS, ROW_ACTION_META } from "../../products/constants/action-defs";
import { Span } from "../../../ui";
import type { AdminTableColumn } from "../types";

interface AdminBrandsResponse {
  items?: JsonArray;
  total?: number;
}

interface BrandRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

const COLUMNS: AdminTableColumn<BrandRow>[] = [
  {
    key: "primary",
    header: "Brand",
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

const ADMIN_BRANDS_CONFIG: ListingViewConfig<AdminBrandsResponse, BrandRow> = {
  portal: "admin",
  title: "Brands",
  searchPlaceholder: "Search brands by name or slug",
  emptyLabel: "No brands found",
  filterKeys: ["isActive"],
  defaultSort: sortBy("order", "ASC"),
  queryKey: ["admin", "brands", "listing"],
  endpoint: ADMIN_ENDPOINTS.BRANDS,
  sortOptions: [
    { value: sortBy("order", "ASC"), label: "Display order" },
    { value: sortBy("name", "ASC"), label: "Name A–Z" },
    { value: sortBy("name", "DESC"), label: "Name Z–A" },
    { value: sortBy("createdAt", "DESC"), label: "Newest" },
  ],
  columns: COLUMNS,
  mapRows: (response) =>
    toRecordArray(response.items).map((item, index) => ({
      id: toStringValue(item.id, `brand-${index}`),
      primary: toStringValue(item.name, "Untitled brand"),
      secondary: `Slug: ${toStringValue(item.slug, "no-slug")}${item.website ? ` · ${item.website}` : ""}`,
      status:
        typeof item.isActive === "boolean"
          ? item.isActive
            ? "Active"
            : "Inactive"
          : "Active",
      updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
    })),
  getTotal: (response, mappedRows) =>
    typeof response.total === "number" ? response.total : mappedRows.length,
  buildFilters: (state) =>
    state.isActive ? sieveFilter("isActive", SIEVE_OP.EQ, state.isActive) : undefined,
  primaryAction: {
    label: "Add Brand",
    onClick: ({ openCreatePanel }) => openCreatePanel(),
  },
  // Rule #7: bulk-action array sourced from the ADMIN_BULK_ACTIONS preset.
  buildBulkActions: (selection) =>
    ADMIN_BULK_ACTIONS.brands.map((id) => ({
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
    <AdminBrandEditorView
      brandId={editId ?? undefined}
      onSaved={closePanel}
      onDeleted={closePanel}
      embedded
    />
  ),
  resolveEditorTitle: ({ isCreate }) => (isCreate ? "Add Brand" : "Edit Brand"),
};

export type AdminBrandsViewProps = ListingLayoutProps;

export function AdminBrandsView({ children, ...props }: AdminBrandsViewProps) {
  // Backward-compat passthrough — some page shims wrap with custom children.
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }
  return <DataListingView config={ADMIN_BRANDS_CONFIG} />;
}
