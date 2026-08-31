"use client";

/**
 * SellerClassifiedView — seller browse/manage of classified listings.
 *
 * A named wrapper, kept so the page, the barrel and every existing import path
 * stay unchanged. All behaviour is `SellerListingTypeView`; everything this
 * type does differently is one entry in `SELLER_LISTING_TYPE_SPECS`.
 *
 * This file was 208 lines of a component that four siblings also contained
 * verbatim — see that file's header for why the duplication mattered rather
 * than merely being untidy.
 */

import React from "react";
import {
  SellerListingTypeView,
  type SellerListingTypeViewProps,
} from "./SellerListingTypeView";

export type SellerClassifiedViewProps = SellerListingTypeViewProps;

export function SellerClassifiedView(props: SellerClassifiedViewProps) {
  return <SellerListingTypeView type="classified" {...props} />;
}
