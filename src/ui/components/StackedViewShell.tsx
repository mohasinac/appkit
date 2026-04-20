/**
 * StackedViewShell
 *
 * Minimal view shell for pages that stack named render-slots vertically
 * with an optional title heading. Covers dashboards, form pages, settings,
 * account hub pages, and any view whose layout is simply "heading + sections".
 *
 * Supports an `isEmpty` guard to swap the main content for an empty-state slot,
 * and an `overlays` catch-all for modals/drawers rendered outside the flow.
 *
 * Usage:
 *   <StackedViewShell
 *     title="Seller Dashboard"
 *     sections={[renderStats, renderCharts, renderActivity]}
 *   />
 *
 *   <StackedViewShell
 *     title="My Addresses"
 *     isEmpty={addresses.length === 0}
 *     renderEmpty={() => <EmptyState />}
 *     sections={[renderToolbar, renderAddresses]}
 *     overlays={<DeleteModal />}
 *   />
 */

import React, { type ReactNode } from "react";
import type { ViewPortal } from "./Layout";
import { Div } from "./Div";
import { Heading } from "./Typography";

export interface StackedViewShellLabels {
  title?: string;
}

export interface StackedViewShellProps {
  /** Page title rendered as H1 unless `renderHeader` is provided. */
  title?: string;
  labels?: StackedViewShellLabels;
  /** Portal context — controls styling defaults (admin / seller / user / public). */
  portal?: ViewPortal;
  /** Custom header replacing the default title heading. */
  renderHeader?: () => ReactNode;
  /** Sequential content sections. Functions are called; ReactNodes are rendered as-is. */
  sections?: (ReactNode | (() => ReactNode))[];
  /** When true, `renderEmpty` replaces `sections`. */
  isEmpty?: boolean;
  /** Empty state slot. */
  renderEmpty?: () => ReactNode;
  /** Overlay portal (modals, drawers, confirm dialogs). */
  overlays?: ReactNode;
  isLoading?: boolean;
  className?: string;
}

function resolveSlot(slot: ReactNode | (() => ReactNode)): ReactNode {
  return typeof slot === "function" ? slot() : slot;
}

export function StackedViewShell({
  title,
  labels = {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  portal,
  renderHeader,
  sections = [],
  isEmpty = false,
  renderEmpty,
  overlays,
  className = "",
}: StackedViewShellProps) {
  const displayTitle = title ?? labels?.title;

  return (
    <Div className={className}>
      {renderHeader ? (
        renderHeader()
      ) : displayTitle ? (
        <Heading level={1} className="text-2xl font-bold mb-6">
          {displayTitle}
        </Heading>
      ) : null}
      {isEmpty && renderEmpty ? (
        renderEmpty()
      ) : (
        <>
          {sections.map((slot, i) => (
            <React.Fragment key={i}>{resolveSlot(slot)}</React.Fragment>
          ))}
        </>
      )}
      {overlays}
    </Div>
  );
}
