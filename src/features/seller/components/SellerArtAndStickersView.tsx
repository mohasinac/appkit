"use client";

/**
 * SellerArtAndStickersView — seller browse/manage of art & sticker listings.
 *
 * A named wrapper over `SellerListingTypeView`; everything this type does
 * differently is one entry in `SELLER_LISTING_TYPE_SPECS`.
 *
 * 🛑 ONE view, not two. `SellerArtView` and `SellerStickersView` were separate
 * files for two separate union members; 1.34 merged the types, so the second
 * wrapper had nothing left to distinguish it.
 */

import React from "react";
import {
  SellerListingTypeView,
  type SellerListingTypeViewProps,
} from "./SellerListingTypeView";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

export type SellerArtAndStickersViewProps = SellerListingTypeViewProps & {
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
};

export function SellerArtAndStickersView({
  pageRegionCards = [],
  ...props
}: SellerArtAndStickersViewProps) {
  return (
    <>
      <SellerListingTypeView type="art-and-stickers" {...props} />
      <AdminComposableRegion pageId="store-art" initialCards={pageRegionCards} />
    </>
  );
}
