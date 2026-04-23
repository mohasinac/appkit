/**
 * DetailViewShell
 *
 * View shell for entity detail pages (product, auction, event, order, blog post, etc.).
 * Provides loading/skeleton and not-found guards, an optional breadcrumb slot,
 * a configurable main content area, and sequential below-fold sections.
 *
 * Usage:
 *   <DetailViewShell
 *     layout="grid-3"
 *     renderBreadcrumb={() => <Breadcrumb ... />}
 *     renderSkeleton={() => <ProductSkeleton />}
 *     renderNotFound={() => <NotFound />}
 *     mainSlots={[renderGallery, renderInfo, renderActions]}
 *     belowFold={[renderTabs, renderRelated]}
 *   />
 */

import React, { type ReactNode } from "react";
import type { ViewPortal } from "./Layout";
import { Div } from "./Div";
import { Grid } from "./Layout";

export type DetailViewLayout =
  /** 3-column product grid (gallery | info | sidebar) */
  | "grid-3"
  /** 2-column split (media | content) */
  | "grid-2"
  /** Single column stacked */
  | "stacked"
  /** Narrow centered column (max-w-3xl) */
  | "narrow";

export interface DetailViewShellProps {
  /** Layout mode for the main content area. */
  layout?: DetailViewLayout;
  /** Portal context — extension point for future portal-specific detail layout defaults. */
  portal?: ViewPortal;
  /** Whether data is still loading. */
  isLoading?: boolean;
  /** Render a loading skeleton — shown when `isLoading` is true. */
  renderSkeleton?: () => ReactNode;
  /** Render a not-found / error state — when provided and `isLoading` is false, replaces entire view. */
  renderNotFound?: () => ReactNode;
  /** Breadcrumb slot — rendered above the main content. */
  renderBreadcrumb?: () => ReactNode;
  /** Main content slots — mapped into the chosen layout. */
  mainSlots?: (ReactNode | (() => ReactNode))[];
  /** Below-fold sections rendered sequentially after the main grid. */
  belowFold?: (ReactNode | (() => ReactNode))[];
  /** Extra content rendered between main grid and belowFold (e.g. mobile bid form). */
  afterMain?: ReactNode;
  /**
   * When true and `layout="grid-3"`, makes the 3rd column (action rail) sticky
   * on desktop. The sticky column stays fixed relative to the viewport as the
   * user scrolls, aligned to the top of the content area (below the title bar).
   * On mobile the action rail renders inline; the `BottomActions` bar handles
   * quick actions via `useBottomActions`.
   *
   * @default false
   */
  stickyActionRail?: boolean;
  /**
   * Top offset for the sticky action rail (e.g. `"top-16"` for a 64px title
   * bar). Defaults to `"top-6"` (24px, for pages without a sticky header).
   */
  stickyRailOffset?: string;
  className?: string;
}

function resolveSlot(slot: ReactNode | (() => ReactNode)): ReactNode {
  return typeof slot === "function" ? slot() : slot;
}

export function DetailViewShell({
  layout = "stacked",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  portal,
  isLoading = false,
  renderSkeleton,
  renderNotFound,
  renderBreadcrumb,
  mainSlots = [],
  belowFold = [],
  afterMain,
  stickyActionRail = false,
  stickyRailOffset = "top-6",
  className = "",
}: DetailViewShellProps) {
  if (isLoading && renderSkeleton) {
    return <>{renderSkeleton()}</>;
  }

  if (!isLoading && renderNotFound) {
    return <>{renderNotFound()}</>;
  }

  const mainContent = (() => {
    switch (layout) {
      case "grid-3":
        return (
          <Grid cols="productDetailTriplet" className="mt-6">
            {mainSlots.map((slot, i) => {
              const isRailSlot = i === 2 && stickyActionRail;
              return (
                <Div
                  key={i}
                  className={
                    isRailSlot
                      ? `self-start sticky ${stickyRailOffset}`
                      : undefined
                  }
                >
                  {resolveSlot(slot)}
                </Div>
              );
            })}
          </Grid>
        );
      case "grid-2":
        return (
          <Div className="flex gap-8 my-6">
            {mainSlots.map((slot, i) => (
              <Div key={i} className={i === 0 ? "w-1/2" : "flex-1"}>
                {resolveSlot(slot)}
              </Div>
            ))}
          </Div>
        );
      case "narrow":
        return (
          <Div className="max-w-3xl mx-auto space-y-6">
            {mainSlots.map((slot, i) => (
              <React.Fragment key={i}>{resolveSlot(slot)}</React.Fragment>
            ))}
          </Div>
        );
      case "stacked":
      default:
        return (
          <>
            {mainSlots.map((slot, i) => (
              <React.Fragment key={i}>{resolveSlot(slot)}</React.Fragment>
            ))}
          </>
        );
    }
  })();

  return (
    <Div className={className}>
      {renderBreadcrumb?.()}
      {mainContent}
      {afterMain}
      {belowFold.map((slot, i) => (
        <React.Fragment key={i}>{resolveSlot(slot)}</React.Fragment>
      ))}
    </Div>
  );
}
