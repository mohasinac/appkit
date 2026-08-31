"use client";

/**
 * SellerStickersView — seller browse/manage of sticker listings.
 *
 * A named wrapper, kept so the page, the barrel and every existing import path
 * stay unchanged. All behaviour is `SellerListingTypeView`; everything this
 * type does differently is one entry in `SELLER_LISTING_TYPE_SPECS`.
 *
 * This file was 194 lines of a component that four siblings also contained
 * verbatim — see that file's header for why the duplication mattered rather
 * than merely being untidy.
 */

import React from "react";
import {
  SellerListingTypeView,
  type SellerListingTypeViewProps,
} from "./SellerListingTypeView";

export type SellerStickersViewProps = SellerListingTypeViewProps;

export function SellerStickersView(props: SellerStickersViewProps) {
  return <SellerListingTypeView type="stickers" {...props} />;
}
