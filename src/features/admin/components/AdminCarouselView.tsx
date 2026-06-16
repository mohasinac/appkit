"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import type { JsonValue } from "@mohasinac/appkit";
import React, { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BulkActionBar, Button, ConfirmDeleteModal, Div, ListingFilterDrawer, ListingLayout, ListingToolbar, Pagination, Row, Span, Stack, Text } from "../../../ui";
import { useBottomActions } from "../../layout";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS, HOMEPAGE_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";
import { RowActionMenu } from "../../../ui/components/RowActionMenu";
import { apiClient } from "../../../http";
import type { AdminTableColumn } from "../types";

const PAGE_SIZE = 50;
const FILTER_KEYS = ["active"];
const DEFAULT_SORT = "order";

export interface AdminCarouselViewProps extends ListingLayoutProps {
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

interface AdminCarouselResponse {
  data?: unknown;
  items?: unknown[];
  total?: number;
}

interface CarouselRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  order: number;
  thumbnailUrl: string;
}


export function AdminCarouselView({ children, onBulkDelete, ...props }: AdminCarouselViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [localRows, setLocalRows] = useState<CarouselRow[]>([]);
  const queryClient = useQueryClient();

  const {
    view, setView, table, searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters, activeFilterCount, hasActiveState, resetAll,
    rows: fetchedRows, total, isLoading, errorMessage,
    currentPage, totalPages, selection,
  } = useAdminListing<AdminCarouselResponse, CarouselRow>({
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    pageSize: PAGE_SIZE,
    queryKey: ["admin", "carousel", "listing"],
    endpoint: `${HOMEPAGE_ENDPOINTS.CAROUSEL}?includeInactive=true`,
    mapRows: (response) => {
      const sourceItems = Array.isArray(response.data) ? response.data : response.items;
      return toRecordArray(sourceItems)
        .sort((a, b) => ((a.order as number) ?? 0) - ((b.order as number) ?? 0))
        .map((item, index) => {
          const bg = item.background as Record<string, JsonValue> | undefined;
          const legacyMedia = item.media as Record<string, JsonValue> | undefined;
          const thumbnailUrl = toStringValue(bg?.url, "") || toStringValue(legacyMedia?.url, "") || "";
          const orderValue = typeof item.order === "number" ? item.order : index + 1;
          const height = toStringValue((item.settings as Record<string, JsonValue> | undefined)?.height, "—");
          return {
            id: toStringValue(item.id, `slide-${index}`),
            primary: toStringValue(item.title, `Carousel slide ${index + 1}`),
            secondary: `Order: ${orderValue} · Height: ${height} · ${item.active ? "Active" : "Inactive"}`,
            status: typeof item.active === "boolean" ? (item.active ? "Active" : "Inactive") : "Inactive",
            updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
            order: orderValue,
            thumbnailUrl,
          };
        });
    },
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (filterState) => {
      const activeRaw = filterState.active;
      if (activeRaw === "true") return "active==true";
      if (activeRaw === "false") return "active==false";
      return undefined;
    },
  });

  React.useEffect(() => {
    setLocalRows(fetchedRows as CarouselRow[]);
  }, [fetchedRows]);

  const reorderMutation = useApiMutation({
    mutationFn: (ids: string[]) =>
      apiClient.post(ADMIN_ENDPOINTS.CAROUSEL_REORDER, { slideIds: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "carousel", "listing"] });
    },
  });

  const deleteMutation = useApiMutation({
    mutationFn: (id: string) => apiClient.delete(ADMIN_ENDPOINTS.CAROUSEL_BY_ID(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "carousel", "listing"] });
    },
  });

  const handleDeleteSlide = useCallback(
    (id: string) => setDeleteTargetId(id),
    [],
  );

  const handleDragStart = (id: string) => setDraggingId(id);

  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) { setDraggingId(null); return; }
    const from = localRows.findIndex((r) => r.id === draggingId);
    const to = localRows.findIndex((r) => r.id === targetId);
    if (from === -1 || to === -1) { setDraggingId(null); return; }
    const next = [...localRows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setLocalRows(next);
    setDraggingId(null);
    reorderMutation.mutate(next.map((r) => r.id));
  };

  const bulkActions: BulkActionItem[] = [
    ...(onBulkDelete ? [buildBulkAction(ACTIONS.ADMIN["delete-carousel"], async () => { await onBulkDelete(selection.selectedIds); selection.clearSelection(); })] : []),
  ];

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: bulkActions } } : {});

  if (hasChildren) {
    return <ListingLayout portal="admin" {...props}>{children}</ListingLayout>;
  }

  const displayRows = (localRows.length > 0 ? localRows : fetchedRows as CarouselRow[]).map((row) => ({
    ...row,
    secondary: (
      <Row align="center" gap="3">
        {row.thumbnailUrl && (
          <img src={row.thumbnailUrl} alt="" className="w-14 h-9 object-cover rounded flex-shrink-0 bg-zinc-200 dark:bg-zinc-800" />
        )}
        <Span size="sm" className="truncate" color="muted">{row.secondary}</Span>
      </Row>
    ) as unknown as string,
  }));

  const columns: AdminTableColumn<(typeof displayRows)[number]>[] = [
    {
      key: "drag",
      header: "",
      render: (row) => (
        <div
          draggable
          onDragStart={() => handleDragStart(row.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(row.id)}
          className="cursor-grab active:cursor-grabbing text-zinc-400 px-1 select-none"
          title="Drag to reorder"
        >
          ⠿
        </div>
      ),
    },
    {
      key: "primary",
      header: "Title",
      render: (row) => <Span weight="medium" color="primary">{row.primary}</Span>,
    },
    {
      key: "secondary",
      header: "Details",
      render: (row) => row.secondary as unknown as React.ReactNode,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Span size="xs" weight="medium" className={`inline-flex items-center ${row.status === "Active" ? "bg-success-surface text-success" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`} rounded="full" padding="pill-xs">
          {row.status}
        </Span>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      render: (row) => <Span size="sm" color="muted">{row.updatedAt}</Span>,
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <RowActionMenu
          actions={[
            { label: ACTIONS.ADMIN["edit-carousel"].label, onClick: () => { window.location.href = `/admin/carousel/${row.id}/edit`; } },
            {
              label: ACTIONS.ADMIN["delete-carousel"].label,
              destructive: true,
              onClick: () => handleDeleteSlide(row.id),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <Div className="min-h-screen">
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search slide titles"
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        showTableView
        view={view}
        onViewChange={(v) => setView(v)}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
      />

      {totalPages > 1 && (
        <Row border="bottom" className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 backdrop-blur-sm" surface="default" padding="toolbar" justify="center">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
        </Row>
      )}

      {selection.selectedCount > 0 && bulkActions.length > 0 && (
        <BulkActionBar
          selectedCount={selection.selectedCount}
          actions={bulkActions}
          onClearSelection={selection.clearSelection}
        />
      )}

      <Div className="px-3 sm:px-4" padding="y-md">
        {errorMessage && (
          <Div className="mb-4 border border-error/20 text-sm" color="error" surface="danger-surface" padding="inline" rounded="xl">
            {errorMessage}
          </Div>
        )}
        <DataTable
          rows={displayRows as any}
          columns={columns as any}
          isLoading={isLoading}
          emptyLabel="No carousel slides — use 'New slide' to add one"
          getRowHref={(row) => `/admin/carousel/${row.id}/edit`}
        />
      </Div>

      <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
          <Stack gap="sm">
            <Text className="tracking-widest" color="muted" size="xs" weight="semibold" transform="uppercase">Status</Text>
            <Div className="flex flex-wrap gap-2">
              {[{ label: "All", value: "" }, { label: "Active", value: "true" }, { label: "Inactive", value: "false" }].map((opt) => (
                <Button key={opt.label} variant="ghost" type="button"
                  onClick={() => setPendingFilters((p) => ({ ...p, active: opt.value }))}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors min-h-0 h-auto ${(pendingFilters.active || "") === opt.value ? "bg-primary text-white border-primary" : "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800"}`}
                >{opt.label}</Button>
              ))}
            </Div>
          </Stack>
      </ListingFilterDrawer>

      {deleteTargetId && (
        <ConfirmDeleteModal
          isOpen
          title="Delete Carousel Slide"
          message="Delete this carousel slide? This cannot be undone."
          onConfirm={() => { deleteMutation.mutate(deleteTargetId); setDeleteTargetId(null); }}
          onClose={() => setDeleteTargetId(null)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </Div>
  );
}
