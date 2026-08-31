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

export type SellerDigitalCodesViewProps = SellerListingTypeViewProps;

export function SellerDigitalCodesView(props: SellerDigitalCodesViewProps) {
  return <SellerListingTypeView type="digital-code" {...props} />;
}
