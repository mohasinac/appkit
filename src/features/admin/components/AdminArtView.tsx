"use client";

/**
 * AdminArtView — admin browse of art listings.
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
import { useAvailabilityScope } from "../../products/hooks/useAvailabilityScope";
import type { ListingType } from "../../products/types";

const LISTING_TYPES: readonly ListingType[] = ["art"];
const CONFIG_OPTS = {
  title: "Art",
  searchPlaceholder: "Search art prints by name or seller",
  emptyLabel: "No art listings",
};

export type AdminArtViewProps = ListingLayoutProps;

export function AdminArtView({ children, ...props }: AdminArtViewProps) {
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
  return (
    <DataListingView
      config={buildListingTypeListingConfig("art", { ...CONFIG_OPTS, scope })}
    />
  );
}
