import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import type { Review } from "../../reviews/types";

export interface StoreReviewsViewProps extends Omit<
  StackedViewShellProps,
  "sections"
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
    <StackedViewShell
      portal="public"
      {...rest}
      title={labels.title}
      className={`py-4 ${rest.className ?? ""}`}
      sections={[
        renderSummary?.(),
        renderReviews(items, isLoading),
        renderPagination?.(total),
      ]}
    />
  );
}
