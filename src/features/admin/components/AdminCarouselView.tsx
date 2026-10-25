"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import type { JsonValue } from "@mohasinac/appkit/client";
import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "../../../ui/components/Badge";
import { BulkActionBar } from "../../../ui/components/BulkActionBar";
import { Button } from "../../../ui/components/Button";
import { ConfirmDeleteModal } from "../../../ui/components/ConfirmDeleteModal";
import { Div } from "../../../ui/components/Div";
import { ListingFilterDrawer } from "../../../ui/components/ListingFilterDrawer";
import { ListingLayout } from "../../../ui/components/ListingLayout";
import { ListingToolbar } from "../../../ui/components/ListingToolbar";
import { Pagination } from "../../../ui/components/Pagination";
import { Row, Stack } from "../../../ui/components/Layout";
import { Span, Text } from "../../../ui/components/Typography";
import { TextLink } from "../../../ui/components/TextLink";
import { StickyToolbar } from "../../../ui/components/StickyToolbar";
import { Toggle } from "../../../ui/components/Toggle";
import { useToast } from "../../../ui/components/toast-context";
import { ROUTES } from "../../../next/routing/route-map";
import { useBottomActions } from "../../layout/hooks/useBottomActions";
import { MediaImage } from "../../media/MediaImage";
import type { BulkActionItem } from "../../../ui/components/BulkActionBar";
import type { ListingLayoutProps } from "../../../ui/components/ListingLayout";
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

import { RowActionMenu } from "../../../ui/components/RowActionMenu";
import { apiClient } from "../../../http";
import { normalizeError } from "../../../errors/normalize";
import type { AdminTableColumn } from "../types";
import { toUserMessage } from "../../../errors/error-display-map";

const PAGE_SIZE = 50;
const FILTER_KEYS = ["active"];
const DEFAULT_SORT = "order";

export interface AdminCarouselViewProps extends ListingLayoutProps {
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

/**
 * Same shape caveat as AdminCategoriesView: `apiClient.get()` unwraps the
 * `{success, data}` envelope, and `/api/carousel` returns its rows directly in
 * `data` — so `mapRows` receives the ARRAY, on which `.data` is undefined.
 */
type AdminCarouselResponse = JsonValue;

function extractCarouselRows(response: AdminCarouselResponse): JsonValue | undefined {
  if (Array.isArray(response)) return response;
  if (!response || typeof response !== "object") return undefined;
  const obj = response as { data?: JsonValue; items?: JsonValue };
  if (Array.isArray(obj.data)) return obj.data;
  return Array.isArray(obj.items) ? obj.items : undefined;
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
  const router = useRouter();
  const { showToast } = useToast();

  const {
    view, setView, table, searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters, activeFilterCount, hasActiveState, resetAll,
    rows: fetchedRows, isLoading, errorMessage,
    currentPage, totalPages, selection,
  } = useAdminListing<AdminCarouselResponse, CarouselRow>({
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    pageSize: PAGE_SIZE,
    queryKey: ["admin", "carousel", "listing"],
    endpoint: `${HOMEPAGE_ENDPOINTS.CAROUSEL}?includeInactive=true`,
    mapRows: (response) => {
      const sourceItems = extractCarouselRows(response);
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
    getTotal: (response, mappedRows) => {
      if (Array.isArray(response) || !response || typeof response !== "object") {
        return mappedRows.length;
      }
      const total = (response as { total?: JsonValue }).total;
      return typeof total === "number" ? total : mappedRows.length;
    },
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

  const setActiveMutation = useApiMutation({
    errorMessage: "Could not change that slide's status.",
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      // PUT, not PATCH: this route has no PATCH, and every field on
      // `updateSlideSchema` is optional, so a lone `{ active }` is a valid
      // partial update.
      apiClient.put(ADMIN_ENDPOINTS.CAROUSEL_BY_ID(id), { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "carousel", "listing"] });
      // The public hero carousel reads under its own key.
      queryClient.invalidateQueries({ queryKey: ["carousel"] });
    },
  });

  /*
   * 🛑 The bulk delete used to be gated entirely on an `onBulkDelete` PROP —
   * and the page renders `<AdminCarouselView />` with no props at all. So
   * `bulkActions` was always `[]`, the BulkActionBar never rendered, and
   * DataTable was handed no selection props either, which meant no checkbox
   * column existed to select with in the first place.
   * `ACTIONS.ADMIN["delete-carousel"]` and its confirmation dialog were
   * unreachable from this page.
   *
   * The prop is kept so an embedder can still override the behaviour, but it
   * no longer decides whether the action EXISTS — this view owns a delete
   * mutation already and can perfectly well call it N times.
   */
  const handleBulkDelete = useCallback(async () => {
    const ids = selection.selectedIds;
    try {
      if (onBulkDelete) {
        await onBulkDelete(ids);
      } else {
        await Promise.all(ids.map((id) => apiClient.delete(ADMIN_ENDPOINTS.CAROUSEL_BY_ID(id))));
        await queryClient.invalidateQueries({ queryKey: ["admin", "carousel", "listing"] });
      }
      selection.clearSelection();
      showToast(`${ids.length} slide${ids.length === 1 ? "" : "s"} deleted.`, "success");
    } catch (err) {
      const normalized = normalizeError(err);
      /*
       * The selection is deliberately NOT cleared on failure. `Promise.all`
       * rejects on the first error, so some of these ids may be gone and
       * some may not — clearing would hide which rows are still there and
       * leave the admin no way to retry the remainder.
       */
      showToast(toUserMessage(normalized.code, undefined, { fallback: "Could not delete the selected slides." }), "error");
    }
  }, [onBulkDelete, selection, queryClient, showToast]);

  const bulkActions: BulkActionItem[] = [
    buildBulkAction(ACTIONS.ADMIN["delete-carousel"], handleBulkDelete),
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
          <Div className="relative w-14 h-9 flex-shrink-0 bg-[var(--appkit-color-surface)]" rounded="default" overflow="hidden">
            <MediaImage src={row.thumbnailUrl} alt="" size="thumbnail" />
          </Div>
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
        <Div
          draggable
          onDragStart={() => handleDragStart(row.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(row.id)}
          className="cursor-grab active:cursor-grabbing text-zinc-400 px-[var(--appkit-space-1)] select-none"
          title="Drag to reorder"
        >
          ⠿
        </Div>
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
      /*
       * 🛑 Both preventDefault AND stopPropagation.
       *
       * `rowHrefTemplate` makes the whole row an anchor, so stopping
       * propagation alone leaves the anchor's DEFAULT action intact — the
       * toggle would flip and then navigate to the edit page, which reads as
       * "clicking the switch opens the editor". A normal column cell is also
       * outside the two `<Td>`s DataTable stops propagation on; only the
       * selection and row-action cells get that for free.
       */
      key: "active",
      header: "Active",
      className: "w-24",
      render: (row) => (
        <Row
          align="center"
          gap="sm"
          role="presentation"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Toggle
            size="sm"
            checked={row.status === "Active"}
            ariaLabel={
              row.status === "Active"
                ? `${ACTIONS.ADMIN["deactivate-carousel"].ariaLabel}: ${row.primary}`
                : `${ACTIONS.ADMIN["activate-carousel"].ariaLabel}: ${row.primary}`
            }
            onChange={(next) => setActiveMutation.mutate({ id: row.id, active: next })}
          />
        </Row>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={row.status === "Active" ? "active" : "inactive"} size="xs">
          {row.status}
        </Badge>
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
            // router.push, not window.location.href — a full page load to
            // reach a page the row already links to is strictly worse, and
            // this is the same navigation DataTable's row anchor performs.
            { label: ACTIONS.ADMIN["edit-carousel"].label, onClick: () => router.push(String(ROUTES.ADMIN.CAROUSEL_EDIT(row.id))) },
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
        // Search intentionally absent: this endpoint does not read `q`, so the box accepted typing and changed nothing. Restore it when the collection gains searchTxt — audit-listing-search-capability tracks it.
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        showTableView
        view={view}
        onViewChange={(v) => setView(v)}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
        /*
         * 🛑 The empty state named a button that did not exist: "No carousel
         * slides — use 'New slide' to add one", with no New slide control
         * anywhere on the page. `/admin/carousel/new` has always been a real
         * route and nothing linked to it.
         */
        extra={
          <Button gap="sm" size="sm" asChild>
            <TextLink variant="inherit" href={String(ROUTES.ADMIN.CAROUSEL_NEW)}>
              New slide
            </TextLink>
          </Button>
        }
      />

      {totalPages > 1 && (
        <StickyToolbar offset="header+pagination" tone="translucent" border padding="toolbar">
          <Row justify="center">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
          </Row>
        </StickyToolbar>
      )}

      {selection.selectedCount > 0 && bulkActions.length > 0 && (
        <BulkActionBar
          selectedCount={selection.selectedCount}
          actions={bulkActions}
          onClearSelection={selection.clearSelection}
        />
      )}

      <Div paddingX="x-sm-md" padding="y-md">
        {errorMessage && (
          <Div textSize="sm" className="mb-4 border border-error/20" color="error" surface="danger-surface" padding="inline" rounded="xl">
            {errorMessage}
          </Div>
        )}
        <DataTable
          rows={displayRows as any}
          columns={columns as any}
          isLoading={isLoading}
          emptyLabel="No carousel slides yet"
          emptyAction={
            <Button gap="sm" size="sm" asChild>
              <TextLink variant="inherit" href={String(ROUTES.ADMIN.CAROUSEL_NEW)}>
                New slide
              </TextLink>
            </Button>
          }
          rowHrefTemplate="/admin/carousel/{id}/edit"
          /*
           * Selection was destructured and a bulk-action array built from it,
           * and these three props were never passed — so no checkbox column
           * rendered and nothing could be selected to act on.
           */
          selectedIds={selection.selectedIdSet}
          onToggleSelect={(id) => selection.toggle(id)}
          onToggleSelectAll={() => selection.toggleAll()}
        />
      </Div>

      <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
          <Stack gap="sm">
            <Text className="tracking-widest" color="muted" size="xs" weight="semibold" transform="uppercase">Status</Text>
            <Row wrap gap="sm">
              {[{ label: "All", value: "" }, { label: "Active", value: "true" }, { label: "Inactive", value: "false" }].map((opt) => (
                <Button key={opt.label} variant="ghost" type="button"
                  onClick={() => setPendingFilters((p) => ({ ...p, active: opt.value }))}
                  className={`rounded-full px-[var(--appkit-space-3)] py-[var(--appkit-space-1)] text-[length:var(--appkit-text-xs)] font-medium border transition-colors min-h-0 h-auto ${(pendingFilters.active || "") === opt.value ? "bg-primary text-white border-primary" : "border-[var(--appkit-color-border)] text-[var(--appkit-color-text-muted)] hover:bg-surface-hover"}`}
                >{opt.label}</Button>
              ))}
            </Row>
          </Stack>
      </ListingFilterDrawer>

      {deleteTargetId && (
        <ConfirmDeleteModal
          isOpen
          /* Rule #7: confirmation copy lives on the ActionDef, not here. */
          title={ACTIONS.ADMIN["delete-carousel"].confirmation?.title}
          message={ACTIONS.ADMIN["delete-carousel"].confirmation?.body}
          confirmText={ACTIONS.ADMIN["delete-carousel"].confirmation?.confirmLabel}
          onConfirm={() => { deleteMutation.mutate(deleteTargetId); setDeleteTargetId(null); }}
          onClose={() => setDeleteTargetId(null)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </Div>
  );
}
