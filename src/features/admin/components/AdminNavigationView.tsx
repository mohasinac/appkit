import React from "react";
import { SlottedListingView } from "../../../ui";
import type { SlottedListingViewProps } from "../../../ui";

export interface AdminNavigationViewProps extends SlottedListingViewProps {
  /** @deprecated Use `overlays` instead. */
  renderDrawer?: () => React.ReactNode;
  /** @deprecated Use `overlays` instead. */
  renderModal?: () => React.ReactNode;
}

export function AdminNavigationView({
  renderDrawer,
  renderModal,
  overlays,
  ...props
}: AdminNavigationViewProps) {
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
