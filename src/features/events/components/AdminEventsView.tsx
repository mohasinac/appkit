import React from "react";
import { SlottedListingView } from "../../../ui";
import type { SlottedListingViewProps } from "../../../ui";

export interface AdminEventsViewProps extends Omit<
  SlottedListingViewProps,
  "renderTable"
> {
  /** Toolbar: search + sort controls */
  renderToolbar?: () => React.ReactNode;
  /** Data table / grid */
  renderTable: () => React.ReactNode;
  /** Create / edit event form drawer */
  renderFormDrawer?: () => React.ReactNode;
}

export function AdminEventsView({
  renderToolbar,
  renderTable,
  renderFormDrawer,
  ...rest
}: AdminEventsViewProps) {
  return (
    <SlottedListingView
      {...rest}
      renderSearch={renderToolbar ? () => renderToolbar() : undefined}
      renderTable={renderTable}
      overlays={
        <>
          {rest.overlays}
          {renderFormDrawer?.()}
        </>
      }
    />
  );
}
