import React from "react";
import { SlottedListingView } from "../../../ui";
import type { SlottedListingViewProps } from "../../../ui";

export interface AdminSectionsViewProps extends SlottedListingViewProps {
  /** @deprecated Use `overlays` instead. */
  renderDrawer?: () => React.ReactNode;
  /** @deprecated Use `overlays` instead. */
  renderModal?: () => React.ReactNode;
}

export function AdminSectionsView({
  renderDrawer,
  renderModal,
  overlays,
  ...props
}: AdminSectionsViewProps) {
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
