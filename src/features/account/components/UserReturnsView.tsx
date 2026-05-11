import React from "react";
import { SlottedListingView } from "../../../ui";
import type { SlottedListingViewProps } from "../../../ui";

export interface UserReturnsViewLabels {
  title?: string;
}

export interface UserReturnsViewProps extends Omit<
  SlottedListingViewProps,
  "renderTable"
> {
  labels?: UserReturnsViewLabels;
  renderTable?: () => React.ReactNode;
}

export function UserReturnsView({
  renderTable,
  ...props
}: UserReturnsViewProps) {
  return (
    <SlottedListingView
      portal="user"
      {...props}
      renderTable={renderTable ?? (() => null)}
    />
  );
}
