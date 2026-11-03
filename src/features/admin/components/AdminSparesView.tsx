"use client";

/**
 * AdminSparesView — admin browse of spares listings.
 *
 * A thin wrapper over the shared per-listing-type config, matching its five
 * siblings exactly. Nothing about spares needs a bespoke ListingViewConfig:
 * the difference between this and `AdminStickersView` is one string, which is
 * precisely why those five were collapsed onto one builder in the first place.
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

const LISTING_TYPES: readonly ListingType[] = ["spares"];
const CONFIG_OPTS = {
  title: "Spares",
  searchPlaceholder: "Search spares by part, colour or seller",
  emptyLabel: "No spare-part listings",
};

export type AdminSparesViewProps = ListingLayoutProps & {
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
};

export function AdminSparesView({ children, pageRegionCards = [], ...props }: AdminSparesViewProps) {
  const scope = useAvailabilityScope(LISTING_TYPES);
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }
  // Built per-render rather than at module scope: the availability scope reads
  // the URL through a hook, which cannot run outside a component.
  return (
    <>
      <AdminComposableRegion pageId="admin-spares" initialCards={pageRegionCards} />
      <DataListingView
        config={buildListingTypeListingConfig("spares", { ...CONFIG_OPTS, scope })}
      />
    </>
  );
}
