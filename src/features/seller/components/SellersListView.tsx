import React from "react";
import { SlottedListingView } from "../../../ui/components/SlottedListingView";
import type { SlottedListingViewProps } from "../../../ui/components/SlottedListingView";

export type SellersListViewProps = SlottedListingViewProps;

export function SellersListView(props: SellersListViewProps) {
  return <SlottedListingView portal="public" {...props} manageSearch manageSelection />;
}
