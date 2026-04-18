import React from "react";
import { SlottedListingView } from "../../../ui";
import type { SlottedListingViewProps } from "../../../ui";

export interface SellerOffersViewProps extends SlottedListingViewProps {}

export function SellerOffersView(props: SellerOffersViewProps) {
  return <SlottedListingView {...props} manageSearch manageSelection />;
}
