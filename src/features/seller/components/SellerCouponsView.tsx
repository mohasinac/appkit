import React from "react";
import { SlottedListingView } from "../../../ui";
import type { SlottedListingViewProps } from "../../../ui";

export interface SellerCouponsViewProps extends Omit<
  SlottedListingViewProps,
  "renderHeader"
> {
  renderHeader?: (onAdd: () => void) => React.ReactNode;
}

export function SellerCouponsView({
  renderHeader,
  ...props
}: SellerCouponsViewProps) {
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
