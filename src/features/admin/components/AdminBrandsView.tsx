"use client";

import { SIEVE_OP, Stack, sieveFilter } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React from "react";
import { Div, ListingLayout, Text } from "../../../ui";
import type { ListingLayoutProps, BulkActionItem } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { AdminBrandEditorView } from "./AdminBrandEditorView";
import { Span } from "../../../ui";
import type { AdminTableColumn } from "../types";

interface AdminBrandsResponse {
  items?: unknown[];
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
  defaultSort: sortBy("displayOrder", "ASC"),
  queryKey: ["admin", "brands", "listing"],
  endpoint: ADMIN_ENDPOINTS.BRANDS,
  sortOptions: [
    { value: sortBy("displayOrder", "ASC"), label: "Display order" },
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
  buildBulkActions: (selection) =>
    [
      {
        id: "edit",
        label: ACTIONS.ADMIN["edit-brand"].label,
        variant: "primary",
        onClick: () => {
          const id = selection.selectedIds[0];
          if (id) selection.openEditPanel(id);
          selection.clearSelection();
        },
      },
    ] satisfies BulkActionItem[],
  renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
    <Stack gap="sm">
      <Text className="tracking-widest" color="muted" size="xs" weight="semibold" transform="uppercase">
        Status
      </Text>
      <Div className="flex flex-wrap gap-2">
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
      </Div>
    </Stack>
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
