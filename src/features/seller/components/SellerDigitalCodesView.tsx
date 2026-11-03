"use client";

/**
 * SellerDigitalCodesView — seller browse/manage of digital code listings.
 *
 * A named wrapper, kept so the page, the barrel and every existing import path
 * stay unchanged. All behaviour is `SellerListingTypeView`; everything this
 * type does differently is one entry in `SELLER_LISTING_TYPE_SPECS`.
 *
 * This file was 213 lines of a component that four siblings also contained
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

export type SellerDigitalCodesViewProps = SellerListingTypeViewProps & {
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
};

export function SellerDigitalCodesView({ pageRegionCards = [], ...props }: SellerDigitalCodesViewProps) {
  return (
    <>
      <SellerListingTypeView type="digital-code" {...props} />
      <AdminComposableRegion pageId="store-digital-codes" initialCards={pageRegionCards} />
    </>
  );
}
