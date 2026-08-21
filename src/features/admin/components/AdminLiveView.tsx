"use client";

/**
 * AdminLiveView — admin browse of live items listings.
 *
 * A thin wrapper over the shared per-listing-type config. This file (and its
 * four siblings) used to carry a full hand-written ListingViewConfig; all five
 * were the same config with a different listingType, and all five shipped
 * an empty filterKeys array — no filter drawer at all — plus their own copy
 * of a three-option sort array. See listing-type-listing-config.ts.
 */

import React from "react";
import { ListingLayout } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { buildListingTypeListingConfig } from "../../products/config/listing-type-listing-config";
import { DataListingView } from "./DataListingView";

const CONFIG = buildListingTypeListingConfig("live", {
  title: "Live Items",
  searchPlaceholder: "Search live items",
  emptyLabel: "No live item listings",
});

export type AdminLiveViewProps = ListingLayoutProps;

export function AdminLiveView({ children, ...props }: AdminLiveViewProps) {
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }
  return <DataListingView config={CONFIG} />;
}
