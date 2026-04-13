"use client";

import React from "react";
import { Div, Heading } from "../../../ui";
import type { Review } from "../../reviews/types";

export interface StoreReviewsViewProps {
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
  className?: string;
}

export function StoreReviewsView({
  labels = {},
  renderReviews,
  renderSummary,
  renderPagination,
  items = [],
  total = 0,
  isLoading = false,
  className = "",
}: StoreReviewsViewProps) {
  return (
    <Div className={`py-4 ${className}`}>
      {labels.title && (
        <Heading level={2} className="text-xl font-semibold mb-4">
          {labels.title}
        </Heading>
      )}

      {renderSummary?.()}
      {renderReviews(items, isLoading)}
      {renderPagination?.(total)}
    </Div>
  );
}
