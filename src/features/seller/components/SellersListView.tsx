import React from "react";
import { SlottedListingView } from "../../../ui";
import type { SlottedListingViewProps } from "../../../ui";

export interface SellersListViewProps extends SlottedListingViewProps {}

export function SellersListView(props: SellersListViewProps) {
  return <SlottedListingView portal="public" {...props} manageSearch manageSelection />;
}
