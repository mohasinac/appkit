"use client";
import React from "react";
import { ReviewsListingPanel } from "./ReviewsListingPanel";
import type { ReviewListResponse } from "../types";

export interface ReviewsIndexListingProps {
  initialData?: ReviewListResponse;
  variant?: "admin" | "seller" | "public";
}

/**
 * The public `/reviews` index. Everything below the props is `ReviewsListingPanel` —
 * this file and `StoreReviewsListing` used to be near-identical copies of the same
 * toolbar + sticky pagination + filter drawer + card grid, and the detail-page reviews
 * tab would have been a third. See the Duplication Decision Framework (Rule of Three).
 */
export function ReviewsIndexListing({
  initialData,
  variant = "public",
}: ReviewsIndexListingProps) {
  return (
    <ReviewsListingPanel
      source={{ kind: "all" }}
      stateMode="url"
      initialData={initialData}
      variant={variant}
      showSummary={false}
      className="min-h-screen"
    />
  );
}
