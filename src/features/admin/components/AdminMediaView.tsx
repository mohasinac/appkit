import React from "react";
import { SlottedListingView } from "../../../ui";
import type { SlottedListingViewProps } from "../../../ui";

export interface AdminMediaViewProps extends SlottedListingViewProps {
  /** @deprecated Use `overlays` instead. */
  renderDrawer?: () => React.ReactNode;
  /** @deprecated Use `overlays` instead. */
  renderModal?: () => React.ReactNode;
}

export function AdminMediaView({
  renderDrawer,
  renderModal,
  overlays,
  ...props
}: AdminMediaViewProps) {
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
