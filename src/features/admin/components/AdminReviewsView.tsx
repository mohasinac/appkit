"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListingViewShell, Modal, RowActionMenu, Button, useToast } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";
import { ViewReviewModal } from "../../reviews/components/ReviewModal";
import type { Review, ReviewStatus } from "../../reviews/types";
import { apiClient } from "../../../http";

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

export function AdminReviewsView({
  renderDetailView,
  children,
  ...props
}: AdminReviewsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const hasDetailView = Boolean(renderDetailView);
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [ratingFilter, setRatingFilter] = React.useState("");

  const [viewReview, setViewReview] = React.useState<Review | null>(null);
  const [replyOpen, setReplyOpen] = React.useState(false);
  const [replyTarget, setReplyTarget] = React.useState<ReviewRow | null>(null);
  const [replyText, setReplyText] = React.useState("");

  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const filterParts: string[] = [];
  if (statusFilter && statusFilter !== "All") filterParts.push(`status==${statusFilter}`);
  if (ratingFilter && ratingFilter !== "All") filterParts.push(`rating==${ratingFilter}`);
  const filters = filterParts.join(",") || undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminReviewsResponse,
    ReviewRow
  >({
    queryKey: ["admin", "reviews", "listing", q, filters ?? ""],
    endpoint: ADMIN_ENDPOINTS.REVIEWS,
    filters,
    q,
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
      await apiClient.patch(ADMIN_ENDPOINTS.REVIEW_BY_ID(replyTarget!.id), {
        adminReply: replyText,
      });
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

  if (hasChildren || hasDetailView) {
    return <ListingViewShell portal="admin" {...props} detailView={renderDetailView?.()}>{children}</ListingViewShell>;
  }

  const rowActions = (row: ReviewRow) => [
    {
      label: "Approve",
      onClick: () => patchMutation.mutate({ id: row.id, payload: { status: "approved" } }),
    },
    {
      label: "Reject",
      onClick: () => patchMutation.mutate({ id: row.id, payload: { status: "rejected" } }),
    },
    {
      label: row.isFeatured ? "Unfeature" : "Feature",
      onClick: () => patchMutation.mutate({ id: row.id, payload: { featured: !row.isFeatured } }),
    },
    {
      label: "Reply",
      onClick: () => {
        setReplyTarget(row);
        setReplyText("");
        setReplyOpen(true);
      },
    },
    {
      label: "View",
      onClick: () => {
        const raw = row._raw ?? {};
        const rating = Math.min(5, Math.max(1, Number(raw.rating ?? 1))) as 1 | 2 | 3 | 4 | 5;
        setViewReview({
          id: row.id,
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
  ];

  return (
    <>
      <AdminListingScaffold
        portal="admin"
        {...props}
        title="Review Moderation"
        subtitle="Moderate customer feedback, seller responses, and featured review placement from one queue."
        actionLabel="Review policies"
        searchPlaceholder="Search reviews, products, or seller names"
        onSearch={setQ}
        searchValue={q}
        rows={rows}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyLabel="No reviews found"
        resultSummary={`Showing ${rows.length} of ${total} reviews`}
        filterGroups={[
          {
            title: "Status",
            options: ["All", "approved", "pending", "rejected"],
            active: statusFilter || "All",
            onSelect: (opt) => setStatusFilter(opt === "All" ? "" : opt),
          },
          {
            title: "Rating",
            options: ["All", "5", "4", "3", "2", "1"],
            active: ratingFilter || "All",
            onSelect: (opt) => setRatingFilter(opt === "All" ? "" : opt),
          },
        ]}
        renderRowActions={(row) => (
          <RowActionMenu actions={rowActions(row as ReviewRow)} />
        )}
      />

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
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Admin reply
            </label>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              placeholder="Write a public reply to this review…"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-2">
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
          </div>
        </div>
      </Modal>
    </>
  );
}
