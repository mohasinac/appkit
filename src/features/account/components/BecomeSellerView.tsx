import React from "react";
import { Div } from "../../../ui/components/Div";
import { Heading } from "../../../ui/components/Typography";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

export interface BecomeSellerViewLabels {
  title?: string;
  applyButton?: string;
  alreadySeller?: string;
}

/**
 * 🛑 `create-store` is a real state, not a variant of `already-seller`.
 *
 * Applying and owning a storefront are two different things, and the gap
 * between them was invisible: a user who applied became `role: "seller"` with
 * no store, and this shell's `already-seller` slot told them to "head over to
 * your Store Dashboard" — a dashboard with no store behind it. There was no
 * step anywhere in the product that created one. This state is that step.
 */
export type BecomeSellerState = "guide" | "success" | "create-store" | "already-seller";

export interface BecomeSellerViewProps {
  labels?: BecomeSellerViewLabels;
  renderGuide?: () => React.ReactNode;
  renderSuccess?: () => React.ReactNode;
  /** Seller with no store yet — renders the store-creation form. */
  renderCreateStore?: () => React.ReactNode;
  renderAlreadySeller?: () => React.ReactNode;
  /** Which state to render. Shell exposes all four slots; consumer controls which is active. */
  state?: BecomeSellerState;
  className?: string;
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

export function BecomeSellerView({
  labels = {},
  renderGuide,
  renderSuccess,
  renderCreateStore,
  renderAlreadySeller,
  state = "guide",
  className = "",
  pageRegionCards = [],
}: BecomeSellerViewProps) {
  return (
    <Div className={className}>
      {labels.title && state === "guide" && (
        <Heading level={1} className="mb-6" size="2xl" weight="bold">
          {labels.title}
        </Heading>
      )}
      {state === "guide" && renderGuide?.()}
      {state === "success" && renderSuccess?.()}
      {state === "create-store" && renderCreateStore?.()}
      {state === "already-seller" && renderAlreadySeller?.()}
      <AdminComposableRegion pageId="user-become-seller" initialCards={pageRegionCards} />
    </Div>
  );
}
