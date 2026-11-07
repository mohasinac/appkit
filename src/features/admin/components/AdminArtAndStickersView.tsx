"use client";

/**
 * AdminArtAndStickersView — admin browse of art & sticker listings.
 *
 * A thin wrapper over the shared per-listing-type config. This file (and its
 * siblings) used to carry a full hand-written ListingViewConfig; all of them
 * were the same config with a different listingType, and all shipped an empty
 * filterKeys array — no filter drawer at all — plus their own copy of a
 * three-option sort array. See listing-type-listing-config.ts.
 *
 * 🛑 ONE view, not two. `AdminArtView` and `AdminStickersView` were separate
 * files for two separate union members; 1.34 merged the types.
 */

import React from "react";
import { ListingLayout } from "../../../ui/components/ListingLayout";
import type { ListingLayoutProps } from "../../../ui/components/ListingLayout";
import { buildListingTypeListingConfig } from "../../products/config/listing-type-listing-config";
import { DataListingView } from "./DataListingView";
import { useAvailabilityScope } from "../../products/hooks/useAvailabilityScope";
import type { ListingType } from "../../products/types";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

const LISTING_TYPES: readonly ListingType[] = ["art-and-stickers"];
const CONFIG_OPTS = {
  title: "Art & Stickers",
  searchPlaceholder: "Search art & stickers by name or seller",
  emptyLabel: "No art or sticker listings",
};

export interface AdminArtAndStickersViewProps extends ListingLayoutProps {
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

export function AdminArtAndStickersView({
  children,
  pageRegionCards = [],
  ...props
}: AdminArtAndStickersViewProps) {
  const scope = useAvailabilityScope(LISTING_TYPES);
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }
  // Built per-render rather than at module scope: the availability scope
  // reads the URL through a hook, which cannot run outside a component.
  const config = buildListingTypeListingConfig("art-and-stickers", { ...CONFIG_OPTS, scope });
  return (
    <DataListingView
      config={{
        ...config,
        renderAboveContent: () => (
          <>
            {config.renderAboveContent?.()}
            <AdminComposableRegion pageId="admin-art" initialCards={pageRegionCards} />
          </>
        ),
      }}
    />
  );
}
