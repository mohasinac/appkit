import React from "react";
import { SlottedListingView } from "../../../ui";
import type { SlottedListingViewProps } from "../../../ui";

export interface UserOrdersViewLabels {
  title?: string;
}

export interface UserOrdersViewProps extends Omit<
  SlottedListingViewProps,
  "renderTable"
> {
  labels?: UserOrdersViewLabels;
  /** @deprecated Use `renderSearch` instead. */
  renderToolbar?: () => React.ReactNode;
  renderTable?: () => React.ReactNode;
}

export function UserOrdersView({
  renderToolbar,
  renderTable,
  ...props
}: UserOrdersViewProps) {
  return (
    <SlottedListingView
      {...props}
      renderSearch={renderToolbar ? () => renderToolbar() : props.renderSearch}
      renderTable={renderTable ?? (() => null)}
    />
  );
}
