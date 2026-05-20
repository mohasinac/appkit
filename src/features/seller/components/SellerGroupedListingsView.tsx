"use client";

import React, { useState, useCallback } from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { Badge, BulkActionBar, Button, ListingToolbar, Pagination } from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useSellerListingData,
} from "../hooks/useSellerListingData";
import { DataTable } from "../../admin/components/DataTable";
import type { AdminTableColumn } from "../../admin/types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;
const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
  { value: "title", label: "Title A–Z" },
  { value: "-title", label: "Title Z–A" },
];

const THEME_LABELS: Record<string, string> = {
  related: "Related",
  character: "Character",
  lineage: "Lineage",
  set: "Set",
  generic: "Generic",
};

const VISIBILITY_BADGE: Record<string, "success" | "warning"> = {
  visible: "success",
  hidden: "warning",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GroupedRow {
  id: string;
  title: string;
  groupTheme: string;
  productCount: number;
  isActive: boolean;
  visibilityStatus: string;
  createdAt: string;
}

interface GroupedListingsResponse {
  items?: unknown[];
  meta?: { total: number };
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const COLUMNS: AdminTableColumn<GroupedRow>[] = [
  {
    key: "title",
    header: "Title",
    render: (r) => <span className="font-medium text-zinc-900 dark:text-zinc-100">{r.title}</span>,
  },
  {
    key: "groupTheme",
    header: "Theme",
    render: (r) => (
      <Badge variant="default">{THEME_LABELS[r.groupTheme] ?? r.groupTheme}</Badge>
    ),
  },
  {
    key: "productCount",
    header: "Products",
    render: (r) => <span className="text-sm text-zinc-600 dark:text-zinc-400">{r.productCount}</span>,
  },
  {
    key: "visibilityStatus",
    header: "Visibility",
    render: (r) => (
      <Badge variant={VISIBILITY_BADGE[r.visibilityStatus] ?? "default"}>
        {r.visibilityStatus === "visible" ? "Visible" : "Hidden"}
      </Badge>
    ),
  },
  {
    key: "isActive",
    header: "Status",
    render: (r) => (
      <Badge variant={r.isActive ? "success" : "default"}>
        {r.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    key: "createdAt",
    header: "Created",
    render: (r) => <span className="text-xs text-zinc-500 dark:text-zinc-400">{r.createdAt}</span>,
  },
];

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export interface SellerGroupedListingsViewProps {
  onCreateClick?: () => void;
  onEditClick?: (id: string) => void;
  onDeleteClick?: (id: string) => void;
}

export function SellerGroupedListingsView({
  onCreateClick,
  onEditClick,
  onDeleteClick,
}: SellerGroupedListingsViewProps) {
  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");

  const resetAll = useCallback(() => {
    table.setMany({ q: "", sort: "" });
    setSearchInput("");
  }, [table]);

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
  }, [searchInput, table]);

  const hasActiveState = !!table.get("q") || table.get("sort") !== DEFAULT_SORT;

  const { rows, total, isLoading, errorMessage } = useSellerListingData<
    GroupedListingsResponse,
    GroupedRow
  >({
    queryKey: ["seller", "grouped-listings"],
    endpoint: SELLER_ENDPOINTS.GROUPED_LISTINGS,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    q: table.get("q") || undefined,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `group-${index}`),
        title: toStringValue(item.title, "Untitled group"),
        groupTheme: toStringValue(item.groupTheme, "generic"),
        productCount: Array.isArray(item.productIds) ? item.productIds.length : 0,
        isActive: item.isActive === true,
        visibilityStatus: toStringValue(item.visibilityStatus, "hidden"),
        createdAt: toRelativeDate(item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
  });

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selection = useBulkSelection({ items: rows, keyExtractor: (r) => r.id });

  const bulkActions: BulkActionItem[] = [
    {
      id: "delete",
      label: "Delete selected",
      variant: "danger",
      onClick: () => {
        for (const id of selection.selectedIds) onDeleteClick?.(id);
        selection.clearSelection();
      },
    },
  ];

  return (
    <div className="min-h-screen">
      <ListingToolbar
        searchValue={searchInput}
        searchPlaceholder="Search grouped listings"
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get("sort") || DEFAULT_SORT}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => { table.set("sort", v); }}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
        extra={
          onCreateClick ? (
            <Button size="sm" onClick={onCreateClick}>
              + New Group
            </Button>
          ) : null
        }
      />

      {selection.selectedCount > 0 && (
        <BulkActionBar
          selectedCount={selection.selectedCount}
          actions={bulkActions}
          onClearSelection={selection.clearSelection}
        />
      )}

      {totalPages > 1 && (
        <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
        </div>
      )}

      <DataTable
        columns={COLUMNS}
        rows={rows}
        isLoading={isLoading}
        emptyLabel={errorMessage ?? "No grouped listings yet"}
        selectedIds={selection.selectedIdSet}
        onToggleSelect={(id, _selected) => selection.toggle(id)}
        onToggleSelectAll={(_next) => selection.toggleAll()}
        renderRowActions={(row: GroupedRow) => (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => onEditClick?.(row.id)}>Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => onDeleteClick?.(row.id)}>Delete</Button>
          </div>
        )}
      />
    </div>
  );
}
