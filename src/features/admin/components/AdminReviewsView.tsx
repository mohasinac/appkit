"use client";

import { sortBy } from "@mohasinac/appkit";
import React, { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Div, FilterChipGroup, Label, ListingLayout, Modal, RowActionMenu, useToast } from "../../../ui";
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
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { ViewReviewModal } from "../../reviews/components/ReviewModal";
import type { Review, ReviewStatus } from "../../reviews/types";
import { apiClient } from "../../../http";

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

export type AdminReviewsViewProps = ListingLayoutProps;

export function AdminReviewsView({ children, ...props }: AdminReviewsViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [viewReview, setViewReview] = useState<Review | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReviewRow | null>(null);
  const [replyText, setReplyText] = useState("");

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
      status: toStringValue(raw.status, "pending") as ReviewStatus,
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

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminReviewsResponse, ReviewRow> = {
    portal: "admin",
    title: "Reviews",
    searchPlaceholder: "Search reviews, products, or seller names",
    emptyLabel: "No reviews found",
    filterKeys: ["status", "rating"],
    defaultSort: sortBy("publishedAt", "DESC"),
    queryKey: ["admin", "reviews", "listing"],
    endpoint: ADMIN_ENDPOINTS.REVIEWS,
    sortOptions: [
      { value: sortBy("publishedAt", "DESC"), label: "Newest" },
      { value: "publishedAt", label: "Oldest" },
      { value: sortBy("rating", "DESC"), label: "Highest rating" },
      { value: sortBy("rating", "ASC"), label: "Lowest rating" },
    ],
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
    buildBulkActions: (selection): BulkActionItem[] => [
      {
        id: "approve",
        label: `${ACTIONS.ADMIN["approve-review"].label} Selected`,
        variant: "primary",
        onClick: () => selection.clearSelection(),
      },
      {
        id: "reject",
        label: `${ACTIONS.ADMIN["reject-review"].label} Selected`,
        variant: "secondary",
        onClick: () => selection.clearSelection(),
      },
    ],
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          {
            label: ACTIONS.ADMIN["approve-review"].label,
            onClick: () => patchMutation.mutate({ id: row.id, payload: { status: "approved" } }),
          },
          {
            label: ACTIONS.ADMIN["reject-review"].label,
            destructive: true,
            onClick: () => patchMutation.mutate({ id: row.id, payload: { status: "rejected" } }),
          },
          {
            label: row.isFeatured
              ? ACTIONS.ADMIN["unfeature-review"].label
              : ACTIONS.ADMIN["feature-review"].label,
            onClick: () =>
              patchMutation.mutate({ id: row.id, payload: { featured: !row.isFeatured } }),
          },
          {
            label: ROW_ACTION_META[ROW_ACTION_ID.REPLY].label,
            onClick: () => {
              setReplyTarget(row);
              setReplyText("");
              setReplyOpen(true);
            },
          },
          {
            label: ROW_ACTION_META[ROW_ACTION_ID.VIEW].label,
            onClick: () => handleViewReview(row),
          },
        ]}
      />
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <>
        <FilterChipGroup
          label="Status"
          tabs={ADMIN_REVIEW_STATUS_TABS}
          value={pendingFilters.status ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
        />
        <FilterChipGroup
          label="Rating"
          tabs={ADMIN_REVIEW_RATING_TABS}
          value={pendingFilters.rating ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, rating: id }))}
        />
      </>
    ),
  };

  return (
    <>
      <DataListingView config={config} />
      <ViewReviewModal
        review={viewReview}
        isOpen={Boolean(viewReview)}
        onClose={() => setViewReview(null)}
      />
      <Modal
        isOpen={replyOpen}
        onClose={() => {
          setReplyOpen(false);
          setReplyText("");
          setReplyTarget(null);
        }}
        title="Reply to review"
      >
        <Div className="space-y-4">
          <Div className="flex flex-col gap-1">
            <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Admin reply
            </Label>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              placeholder="Write a public reply to this review…"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </Div>
          <Div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setReplyOpen(false);
                setReplyText("");
                setReplyTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => replyMutation.mutate()}
              isLoading={replyMutation.isPending}
              disabled={!replyText.trim() || replyMutation.isPending}
            >
              Save reply
            </Button>
          </Div>
        </Div>
      </Modal>
    </>
  );
}
