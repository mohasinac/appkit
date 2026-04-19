import React from "react";
import { SlottedListingView } from "../../../ui";
import type { SlottedListingViewProps } from "../../../ui";

export interface SellerAuctionsViewProps extends Omit<
  SlottedListingViewProps,
  "renderHeader"
> {
  renderHeader?: (onAdd: () => void) => React.ReactNode;
}

export function SellerAuctionsView({
  renderHeader,
  ...props
}: SellerAuctionsViewProps) {
  return (
    <SlottedListingView
      portal="seller"
      {...props}
      manageSearch
      manageSelection
      renderHeader={renderHeader ? () => renderHeader(() => {}) : undefined}
    />
  );
}
