import React from "react";
import { StoreReviewsListing } from "./StoreReviewsListing";

export interface StoreReviewsPageViewProps {
  storeSlug: string;
}

export function StoreReviewsPageView({ storeSlug }: StoreReviewsPageViewProps) {
  return <StoreReviewsListing storeSlug={storeSlug} />;
}
