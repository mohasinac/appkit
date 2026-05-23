"use client";

import React, { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BulkActionBar, FilterChipGroup, ListingToolbar, Pagination, ListingLayout, Modal, RowActionMenu, Button, useToast, ListingFilterDrawer} from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ROW_ACTION_META, ROW_ACTION_ID } from "../../../features/products/constants/action-defs";
import { ADMIN_REVIEW_STATUS_TABS, ADMIN_REVIEW_RATING_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";
import { ViewReviewModal } from "../../reviews/components/ReviewModal";
import type { Review, ReviewStatus } from "../../reviews/types";
import { apiClient } from "../../../http";
import { useBottomActions } from "../../layout";

const PAGE_SIZE = 25;
const FILTER_KEYS = ["status", "rating"];
const DEFAULT_SORT = "-publishedAt";
const SORT_OPTIONS = [
  { value: "-publishedAt", label: "Newest" },
  { value: "publishedAt", label: "Oldest" },
  { value: "-rating", label: "Highest rating" },
  { value: "rating", label: "Lowest rating" },
];
const STATUS_OPTIONS = ADMIN_REVIEW_STATUS_TABS;
const RATING_OPTIONS = ADMIN_REVIEW_RATING_TABS;

export interface AdminReviewsViewProps extends ListingLayoutProps {
  /** @deprecated Use `detailView` instead. */
  renderDetailView?: () => React.ReactNode;
}

interface AdminReviewsResponse {
  items?: unknown[];
  total?: number;
}

interface ReviewRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  isFeatured?: boolean;
  _raw?: Record<string, unknown>;
}

export function AdminReviewsView({ renderDetailView, children, ...props }: AdminReviewsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const hasDetailView = Boolean(renderDetailView);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [viewReview, setViewReview] = useState<Review | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReviewRow | null>(null);
  const [replyText, setReplyText] = useState("");

  const {
    view, setView, table, searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters, activeFilterCount, hasActiveState, resetAll,
    rows, total, isLoading, errorMessage,
    currentPage, totalPages, selection, defaultSort,
  } = useAdminListing<AdminReviewsResponse, ReviewRow>({
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    pageSize: PAGE_SIZE,
    queryKey: ["admin", "reviews", "listing"],
    endpoint: ADMIN_ENDPOINTS.REVIEWS,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `review-${index}`),
        primary: `${toStringValue(item.rating, "-")} star · ${toStringValue(item.productTitle ?? item.productName, "Unknown product")}`,
        secondary: toStringValue(item.userName ?? item.sellerName, "Unknown author"),
        status: toStringValue(item.status, "Pending"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        isFeatured: Boolean(item.featured ?? item.isFeatured),
        _raw: item,
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (f) => {
      const parts: string[] = [];
      if (f.status && f.status !== "All") parts.push(`status==${f.status}`);
      if (f.rating && f.rating !== "All") parts.push(`rating==${f.rating}`);
      return parts.join(",") || undefined;
    },
  });

  const patchMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      await apiClient.patch(ADMIN_ENDPOINTS.REVIEW_BY_ID(id), payload);
    },
    onSuccess: () => {
      showToast("Review updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to update review.", "error");
    },
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch(ADMIN_ENDPOINTS.REVIEW_BY_ID(replyTarget!.id), { adminReply: replyText });
    },
    onSuccess: () => {
      showToast("Reply saved.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
      setReplyOpen(false);
      setReplyText("");
      setReplyTarget(null);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to save reply.", "error");
    },
  });

  const handleViewReview = useCallback((rr: ReviewRow) => {
    const raw = rr._raw ?? {};
    const rating = Math.min(5, Math.max(1, Number(raw.rating ?? 1))) as 1 | 2 | 3 | 4 | 5;
    setViewReview({
      id: rr.id,
      productId: toStringValue(raw.productId, ""),
      userId: toStringValue(raw.buyerId ?? raw.userId, ""),
      status: (toStringValue(raw.status, "pending") as ReviewStatus),
      rating,
      title: toStringValue(raw.title, ""),
      comment: toStringValue(raw.body ?? raw.comment, ""),
      userName: toStringValue(raw.userName ?? raw.sellerName, "Unknown"),
      userAvatar: toStringValue(raw.userAvatar, "") || undefined,
      verified: Boolean(raw.isVerifiedPurchase),
      images: Array.isArray(raw.images)
        ? (raw.images as Array<{ url: string; thumbnailUrl?: string }>)
        : [],
      helpfulCount: Number(raw.helpfulCount ?? 0),
      createdAt: toStringValue(raw.createdAt ?? raw.publishedAt, "") || undefined,
    });
  }, []);

  if (hasChildren || hasDetailView) {
    return (
      <ListingLayout portal="admin" {...props} detailView={renderDetailView?.()}>
        {children}
      </ListingLayout>
    );
  }

  return (
    <>
      <div className="min-h-screen">
        <ListingToolbar
          filterCount={activeFilterCount}
          onFiltersClick={openFilters}
          searchValue={searchInput}
          searchPlaceholder="Search reviews, products, or seller names"
          onSearchChange={setSearchInput}
          onSearchCommit={commitSearch}
          sortValue={table.get("sort") || defaultSort}
          sortOptions={SORT_OPTIONS}
          onSortChange={(v) => { table.set("sort", v); }}
        showTableView
        view={view}
        onViewChange={(v) => setView(v)}
          onResetAll={resetAll}
          hasActiveState={hasActiveState}
        />

        <BulkActionBar
          selectedCount={selection.selectedCount}
          onClearSelection={selection.clearSelection}
          actions={([
            { id: "approve", label: `${ACTIONS.ADMIN["approve-review"].label} Selected`, variant: "primary", onClick: () => { selection.clearSelection(); } },
            { id: "reject", label: `${ACTIONS.ADMIN["reject-review"].label} Selected`, variant: "secondary", onClick: () => { selection.clearSelection(); } },
          ] satisfies BulkActionItem[])}
        />

        {totalPages > 1 && (
          <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
          </div>
        )}

        <div className="py-4 px-3 sm:px-4">
          {errorMessage && (
            <div className="mb-4 rounded-xl border border-red-200 bg-error-surface px-4 py-3 text-sm text-error dark:border-red-900/60">
              {errorMessage}
            </div>
          )}
          <DataTable
            rows={rows}
            isLoading={isLoading}
            emptyLabel="No reviews found"
            renderRowActions={(row) => {
              const rr = row as ReviewRow;
              useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: ([
            { id: "approve", label: `${ACTIONS.ADMIN["approve-review"].label} Selected`, variant: "primary", onClick: () => { selection.clearSelection(); } },
            { id: "reject", label: `${ACTIONS.ADMIN["reject-review"].label} Selected`, variant: "secondary", onClick: () => { selection.clearSelection(); } },
          ] satisfies BulkActionItem[]) } } : {});

  return (
                <RowActionMenu
                  actions={[
                    { label: ACTIONS.ADMIN["approve-review"].label, onClick: () => patchMutation.mutate({ id: rr.id, payload: { status: "approved" } }) },
                    { label: ACTIONS.ADMIN["reject-review"].label, destructive: true, onClick: () => patchMutation.mutate({ id: rr.id, payload: { status: "rejected" } }) },
                    {
                      label: rr.isFeatured ? ACTIONS.ADMIN["unfeature-review"].label : ACTIONS.ADMIN["feature-review"].label,
                      onClick: () => patchMutation.mutate({ id: rr.id, payload: { featured: !rr.isFeatured } }),
                    },
                    {
                      label: ROW_ACTION_META[ROW_ACTION_ID.REPLY].label,
                      onClick: () => { setReplyTarget(rr); setReplyText(""); setReplyOpen(true); },
                    },
                    {
                      label: ROW_ACTION_META[ROW_ACTION_ID.VIEW].label,
                      onClick: () => handleViewReview(rr),
                    },
                  ]}
                />
              );
            }}
          />
        </div>

        <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
        <FilterChipGroup
            label="Status"
            tabs={STATUS_OPTIONS}
            value={pendingFilters.status ?? ""}
            onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
          />
          <FilterChipGroup
            label="Rating"
            tabs={RATING_OPTIONS}
            value={pendingFilters.rating ?? ""}
            onChange={(id) => setPendingFilters((p) => ({ ...p, rating: id }))}
          />
      </ListingFilterDrawer>
      </div>

      <ViewReviewModal
        review={viewReview}
        isOpen={Boolean(viewReview)}
        onClose={() => setViewReview(null)}
      />

      <Modal
        isOpen={replyOpen}
        onClose={() => { setReplyOpen(false); setReplyText(""); setReplyTarget(null); }}
        title="Reply to review"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Admin reply</label>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              placeholder="Write a public reply to this review…"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setReplyOpen(false); setReplyText(""); setReplyTarget(null); }}>
              Cancel
            </Button>
            <Button
              onClick={() => replyMutation.mutate()}
              isLoading={replyMutation.isPending}
              disabled={!replyText.trim() || replyMutation.isPending}
            >
              Save reply
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
