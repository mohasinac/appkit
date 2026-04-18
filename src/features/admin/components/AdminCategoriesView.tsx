import React from "react";
import { SlottedListingView } from "../../../ui";
import type { SlottedListingViewProps } from "../../../ui";

export interface AdminCategoriesViewProps extends SlottedListingViewProps {
  /** @deprecated Use `overlays` instead. */
  renderDrawer?: () => React.ReactNode;
  /** @deprecated Use `overlays` instead. */
  renderModal?: () => React.ReactNode;
}

export function AdminCategoriesView({
  renderDrawer,
  renderModal,
  overlays,
  ...props
}: AdminCategoriesViewProps) {
  return (
    <SlottedListingView
      {...props}
      overlays={
        <>
          {overlays}
          {renderDrawer?.()}
          {renderModal?.()}
        </>
      }
    />
  );
}
