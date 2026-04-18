"use client";
import "client-only";

/**
 * ListingViewShell
 *
 * Thin wrapper around ListingLayout that adds overlay slots (drawer, modal)
 * and an optional detail-view short-circuit. Replaces the ~10 identical
 * Admin*View ListingLayout delegates and can be used by seller/account views
 * that need the full ListingLayout feature set.
 *
 * Usage:
 *   <ListingViewShell
 *     headerSlot={<PageHeader title="Products" />}
 *     searchSlot={<SearchInput />}
 *     overlays={<><ProductDrawer /><ConfirmDeleteModal /></>}
 *     isDashboard
 *   >
 *     <DataTable columns={cols} data={rows} />
 *   </ListingViewShell>
 */

import React, { type ReactNode } from "react";
import { ListingLayout } from "./ListingLayout";
import type { ListingLayoutProps } from "./ListingLayout";

export interface ListingViewShellProps extends Omit<
  ListingLayoutProps,
  "children"
> {
  /** Overlay elements rendered after the layout (drawers, modals, confirm dialogs). */
  overlays?: ReactNode;
  /** @deprecated Use `overlays` instead. Render-prop for a drawer overlay. */
  renderDrawer?: () => ReactNode;
  /** @deprecated Use `overlays` instead. Render-prop for a confirm modal overlay. */
  renderConfirmModal?: () => ReactNode;
  /** @deprecated Use `overlays` instead. Render-prop for a generic modal overlay. */
  renderModal?: () => ReactNode;
  /** When provided, the entire layout is replaced with this view (detail/edit mode). */
  detailView?: ReactNode;
  children: ReactNode;
}

export function ListingViewShell({
  overlays,
  renderDrawer,
  renderConfirmModal,
  renderModal,
  detailView,
  children,
  isDashboard = true,
  ...listingProps
}: ListingViewShellProps) {
  if (detailView) {
    return <>{detailView}</>;
  }

  return (
    <>
      <ListingLayout {...listingProps} isDashboard={isDashboard}>
        {children}
      </ListingLayout>
      {overlays}
      {renderDrawer?.()}
      {renderConfirmModal?.()}
      {renderModal?.()}
    </>
  );
}
