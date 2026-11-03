import React from "react";
import { StoreReviewsListing } from "./StoreReviewsListing";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

export interface StoreReviewsPageViewProps {
  storeSlug: string;
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

export function StoreReviewsPageView({ storeSlug, pageRegionCards = [] }: StoreReviewsPageViewProps) {
  return (
    <>
      <AdminComposableRegion pageId="stores-storeslug-reviews" initialCards={pageRegionCards} />
      <StoreReviewsListing storeSlug={storeSlug} />
    </>
  );
}
