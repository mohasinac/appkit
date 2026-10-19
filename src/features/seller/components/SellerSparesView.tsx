"use client";

/**
 * SellerSparesView — seller browse/manage of spares listings.
 *
 * A named wrapper, matching its five siblings exactly: all behaviour is
 * `SellerListingTypeView`, and everything this type does differently is one
 * entry in `SELLER_LISTING_TYPE_SPECS` (a colourway column instead of a size
 * column, and its own routes and copy).
 *
 * Written as a wrapper rather than as a sixth copy of the component on purpose
 * — see `SellerListingTypeView`'s header for what the five hand-written copies
 * cost, and note that the factory it adopts had existed with zero seller
 * callers the whole time.
 */

import React from "react";
import {
  SellerListingTypeView,
  type SellerListingTypeViewProps,
} from "./SellerListingTypeView";

export type SellerSparesViewProps = SellerListingTypeViewProps;

export function SellerSparesView(props: SellerSparesViewProps) {
  return <SellerListingTypeView type="spares" {...props} />;
}
