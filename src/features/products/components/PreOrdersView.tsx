import React from "react";
import { SlottedListingView } from "../../../ui";
import type { SlottedListingViewProps } from "../../../ui";

export interface PreOrdersViewProps extends Omit<
  SlottedListingViewProps,
  "renderTable"
> {
  renderGrid: (isLoading: boolean) => React.ReactNode;
}

export function PreOrdersView({ renderGrid, ...props }: PreOrdersViewProps) {
  return (
    <SlottedListingView
      portal="public"
      {...props}
      manageSearch
      renderTable={() => renderGrid(props.isLoading ?? false)}
    />
  );
}
