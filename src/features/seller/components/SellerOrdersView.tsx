import React from "react";
import { SlottedListingView } from "../../../ui";
import type { SlottedListingViewProps } from "../../../ui";

export interface SellerOrdersViewProps extends SlottedListingViewProps {}

export function SellerOrdersView(props: SellerOrdersViewProps) {
  return <SlottedListingView portal="seller" {...props} manageSearch manageSelection />;
}
