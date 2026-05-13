"use client";

import React, { useState, useCallback } from "react";
import { X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { FilterChipGroup, ListingToolbar, Pagination, ListingViewShell, Modal, RowActionMenu, Button, useToast } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_REVIEW_STATUS_TABS, ADMIN_REVIEW_RATING_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { DataTable } from "./DataTable";
import { ViewReviewModal } from "../../reviews/components/ReviewModal";
import type { Review, ReviewStatus } from "../../reviews/types";
import { apiClient } from "../../../http";

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

export interface AdminReviewsViewProps extends ListingViewShellProps {
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

  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<Record<string, string>>(
    () => Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])),
  );

  const openFilters = useCallback(() => {
    setPendingFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])));
    setFilterOpen(true);
  }, [table]);

  const applyFilters = useCallback(() => {
    const updates: Record<string, string> = { page: "1" };
    for (const k of FILTER_KEYS) updates[k] = pendingFilters[k] ?? "";
    table.setMany(updates);
    setFilterOpen(false);
  }, [pendingFilters, table]);

  const clearFilters = useCallback(() => {
    setPendingFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])));
  }, []);

  const resetAll = useCallback(() => {
    const updates: Record<string, string> = { q: "", sort: "" };
    for (const k of FILTER_KEYS) updates[k] = "";
    table.setMany(updates);
    setSearchInput("");
  }, [table]);

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
  }, [searchInput, table]);

  const activeFilterCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;
  const hasActiveState = !!table.get("q") || table.get("sort") !== DEFAULT_SORT || activeFilterCount > 0;

  const filterParts: string[] = [];
  const statusRaw = table.get("status");
  if (statusRaw && statusRaw !== "All") filterParts.push(`status==${statusRaw}`);
  const ratingRaw = table.get("rating");
  if (ratingRaw && ratingRaw !== "All") filterParts.push(`rating==${ratingRaw}`);
  const filters = filterParts.join(",") || undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<AdminReviewsResponse, ReviewRow>({
    queryKey: ["admin", "reviews", "listing"],
    endpoint: ADMIN_ENDPOINTS.REVIEWS,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    filters,
    q: table.get("q") || undefined,
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

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (hasChildren || hasDetailView) {
    return (
      <ListingViewShell portal="admin" {...props} detailView={renderDetailView?.()}>
        {children}
      </ListingViewShell>
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
          sortValue={table.get("sort") || DEFAULT_SORT}
          sortOptions={SORT_OPTIONS}
          onSortChange={(v) => { table.set("sort", v); table.setPage(1); }}
          hideViewToggle
          onResetAll={resetAll}
          hasActiveState={hasActiveState}
        />

        {totalPages > 1 && (
          <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
          </div>
        )}

        <div className="py-4 px-3 sm:px-4">
          {errorMessage && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              {errorMessage}
            </div>
          )}
          <DataTable
            rows={rows}
            isLoading={isLoading}
            emptyLabel="No reviews found"
            renderRowActions={(row) => {
              const rr = row as ReviewRow;
              return (
                <RowActionMenu
                  actions={[
                    { label: "Approve", onClick: () => patchMutation.mutate({ id: rr.id, payload: { status: "approved" } }) },
                    { label: "Reject", onClick: () => patchMutation.mutate({ id: rr.id, payload: { status: "rejected" } }) },
                    {
                      label: rr.isFeatured ? "Unfeature" : "Feature",
                      onClick: () => patchMutation.mutate({ id: rr.id, payload: { featured: !rr.isFeatured } }),
                    },
                    {
                      label: "Reply",
                      onClick: () => { setReplyTarget(rr); setReplyText(""); setReplyOpen(true); },
                    },
                    {
                      label: "View",
                      onClick: () => {
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
                      },
                    },
                  ]}
                />
              );
            }}
          />
        </div>

        {filterOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" onClick={() => setFilterOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white dark:bg-slate-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-700 px-4 py-3.5">
                <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Filters</span>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button type="button" onClick={clearFilters} className="text-xs text-zinc-500 hover:text-rose-500 dark:text-zinc-400 transition-colors">Clear all</button>
                  )}
                  <button type="button" onClick={() => setFilterOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
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
              </div>
              <div className="border-t border-zinc-200 dark:border-slate-700 px-4 py-3.5">
                <button type="button" onClick={applyFilters} className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors active:scale-[0.98]">
                  Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </button>
              </div>
            </div>
          </>
        )}
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
