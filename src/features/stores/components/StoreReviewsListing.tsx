"use client";
import React from "react";
import { ReviewsListingPanel } from "../../reviews/components/ReviewsListingPanel";

export interface StoreReviewsListingProps {
  storeSlug: string;
}

/**
 * The `/stores/[slug]/reviews` tab. Delegates to the shared `ReviewsListingPanel` —
 * see the note in `ReviewsIndexListing` for why the two were merged.
 */
export function StoreReviewsListing({ storeSlug }: StoreReviewsListingProps) {
  return (
    <ReviewsListingPanel
      source={{ kind: "store", storeSlug }}
      stateMode="url"
      context="store"
      className="min-h-screen"
    />
  );
}
