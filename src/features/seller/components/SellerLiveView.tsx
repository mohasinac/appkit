"use client";

/**
 * SellerLiveView — seller browse/manage of live item listings.
 *
 * A named wrapper, kept so the page, the barrel and every existing import path
 * stay unchanged. All behaviour is `SellerListingTypeView`; everything this
 * type does differently is one entry in `SELLER_LISTING_TYPE_SPECS`.
 *
 * This file was 224 lines of a component that four siblings also contained
 * verbatim — see that file's header for why the duplication mattered rather
 * than merely being untidy.
 */

import React from "react";
import {
  SellerListingTypeView,
  type SellerListingTypeViewProps,
} from "./SellerListingTypeView";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

export type SellerLiveViewProps = SellerListingTypeViewProps & {
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
};

export function SellerLiveView({ pageRegionCards = [], ...props }: SellerLiveViewProps) {
  return (
    <>
      <SellerListingTypeView type="live" {...props} />
      <AdminComposableRegion pageId="store-live" initialCards={pageRegionCards} />
    </>
  );
}

