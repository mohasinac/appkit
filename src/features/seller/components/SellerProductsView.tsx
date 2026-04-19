import React from "react";
import { SlottedListingView } from "../../../ui";
import type { SlottedListingViewProps } from "../../../ui";

export interface SellerProductsViewProps extends Omit<
  SlottedListingViewProps,
  "renderHeader"
> {
  renderHeader?: (onAdd: () => void) => React.ReactNode;
}

export function SellerProductsView({
  renderHeader,
  ...props
}: SellerProductsViewProps) {
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
