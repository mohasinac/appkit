/**
 * DetailViewShell
 *
 * View shell for entity detail pages (product, collector drop, event, order, blog post, etc.).
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
  | "narrow"
  /**
   * Taxonomy hub pages (brand / category / franchise / store): a hero band,
   * tabs, and a browse grid, each slot already managing its own width (most
   * wrap themselves in their own `<Section>`/`<Container>`). Renders exactly
   * like `"stacked"` today — no shared wrapper is imposed — so a hub page's
   * existing section-by-section widths are preserved untouched. Kept as its
   * own named mode (rather than reusing `"stacked"` directly) so hub-specific
   * behaviour (e.g. a shared sticky tab bar) has somewhere to land later
   * without re-touching every adopter.
   */
  | "hub"
  /**
   * Single-column reference/wiki pages (bey, part) that want the WIDER
   * `Container size="lg"` measure (`max-w-5xl`) rather than `"narrow"`'s
   * `max-w-3xl` — these pages carry wide `SpecTable`s that would be cramped
   * at the narrower width.
   */
  | "wiki"
  /**
   * Long-form article pages (blog post): a full-bleed hero band followed by
   * a narrower prose column and a wider related-rail section, where each
   * slot already manages its own width internally. Renders like `"stacked"`
   * for the same reason `"hub"` does — see that mode's comment.
   */
  | "article";

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
   * Top offset for the sticky action rail. Defaults to
   * `"top-[var(--header-height,0px)]"` so the rail tracks the runtime header
   * height. Override only when the rail sits inside a scroll container with
   * its own header (e.g. modals).
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
  stickyRailOffset = "top-[var(--header-height,0px)]",
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
          <Grid cols="detailSplit" gap="lg" className="my-6">
            {mainSlots.map((slot, i) => (
              <Div key={i}>
                {resolveSlot(slot)}
              </Div>
            ))}
          </Grid>
        );
      case "narrow":
        return (
          <Div className="max-w-3xl mx-auto space-y-6">
            {mainSlots.map((slot, i) => (
              <React.Fragment key={i}>{resolveSlot(slot)}</React.Fragment>
            ))}
          </Div>
        );
      case "wiki":
        return (
          <Div className="max-w-5xl mx-auto space-y-6">
            {mainSlots.map((slot, i) => (
              <React.Fragment key={i}>{resolveSlot(slot)}</React.Fragment>
            ))}
          </Div>
        );
      case "hub":
      case "article":
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
