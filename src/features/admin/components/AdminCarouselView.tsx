import React from "react";
import { SlottedListingView } from "../../../ui";
import type { SlottedListingViewProps } from "../../../ui";

export interface AdminCarouselViewProps extends SlottedListingViewProps {
  /** @deprecated Use `overlays` instead. */
  renderDrawer?: () => React.ReactNode;
  /** @deprecated Use `overlays` instead. */
  renderModal?: () => React.ReactNode;
}

export function AdminCarouselView({
  renderDrawer,
  renderModal,
  overlays,
  ...props
}: AdminCarouselViewProps) {
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
