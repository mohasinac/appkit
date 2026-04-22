import React from "react";
import { SlottedListingView } from "../../../ui";
import type { SlottedListingViewProps } from "../../../ui";
import type { Review } from "../../reviews/types";

export interface StoreReviewsViewProps extends Omit<
  SlottedListingViewProps,
  "renderTable"
> {
  storeSlug: string;
  labels?: {
    title?: string;
    emptyTitle?: string;
  };
  renderReviews: (items: Review[], isLoading: boolean) => React.ReactNode;
  renderSummary?: () => React.ReactNode;
  renderPagination?: (total: number) => React.ReactNode;
  items?: Review[];
  total?: number;
  isLoading?: boolean;
}

export function StoreReviewsView({
  labels = {},
  renderReviews,
  renderSummary,
  renderPagination,
  items = [],
  total = 0,
  isLoading = false,
  ...rest
}: StoreReviewsViewProps) {
  return (
    <SlottedListingView
      portal="public"
      {...rest}
      title={labels.title}
      className={`py-4 ${rest.className ?? ""}`}
      renderFilters={() => renderSummary?.() ?? null}
      renderTable={() => renderReviews(items, isLoading)}
      renderPagination={() => renderPagination?.(total) ?? null}
      total={total}
      isLoading={isLoading}
    />
  );
}
