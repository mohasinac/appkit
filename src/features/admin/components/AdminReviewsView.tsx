"use client";

import React from "react";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";

export interface AdminReviewsViewProps extends ListingViewShellProps {
  /** @deprecated Use `detailView` instead. */
  renderDetailView?: () => React.ReactNode;
}

interface AdminReviewsResponse {
  items?: unknown[];
  total?: number;
}

export function AdminReviewsView({
  renderDetailView,
  children,
  ...props
}: AdminReviewsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const hasDetailView = Boolean(renderDetailView);

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminReviewsResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["admin", "reviews", "listing"],
    endpoint: ADMIN_ENDPOINTS.REVIEWS,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `review-${index}`),
        primary: `${toStringValue(item.rating, "-")} star · ${toStringValue(item.productTitle ?? item.productName, "Unknown product")}`,
        secondary: toStringValue(item.userName ?? item.sellerName, "Unknown author"),
        status: toStringValue(item.status, "Pending"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });

  if (hasChildren || hasDetailView) {
    return <ListingViewShell portal="admin" {...props} detailView={renderDetailView?.()}>{children}</ListingViewShell>;
  }

  return (
    <AdminListingScaffold
      portal="admin"
      {...props}
      title="Review Moderation"
      subtitle="Moderate customer feedback, seller responses, and featured review placement from one queue."
      actionLabel="Review policies"
      searchPlaceholder="Search reviews, products, or seller names"
      rows={rows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No reviews found"
      resultSummary={`Showing ${rows.length} of ${total} reviews`}
    />
  );
}
