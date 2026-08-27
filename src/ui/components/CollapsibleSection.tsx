import React from "react";
import { Button } from "./Button";
import { Div } from "./Div";
import { Row } from "./Layout";
import { Span } from "./Typography";
import { Collapse } from "./Motion";

export interface CollapsibleSectionProps {
  title: React.ReactNode;
  isCollapsed: boolean;
  onToggle: () => void;
  /** Optional right-aligned content next to the title (badges, counts). */
  renderHeaderExtra?: () => React.ReactNode;
  /**
   * Keep collapsed children mounted (hidden via CSS) instead of unmounting them.
   *
   * `<Collapse>` renders `{isOpen && <motion.div>}` — collapsing therefore
   * UNMOUNTS the subtree and destroys any uncommitted state inside it. That is
   * harmless for inputs driven entirely off a parent `values` object, but it
   * discards in-flight work for anything holding its own: a `useMediaUpload`
   * transfer, a rich-text editor buffer, a partially-filled multi-select.
   *
   * Set this on any section that can hold uncommitted state. The trade-off is
   * that hidden children still render, so don't enable it for expensive
   * subtrees that are purely presentational.
   */
  keepMounted?: boolean;
  /** Anchor id on the section root — lets a caller scroll/link to it. */
  id?: string;
  className?: string;
  children?: React.ReactNode;
}

/** Dashboard-section wrapper backed by useCollapsedSections — a persisted,
 * per-user, accordion-scoped collapse state (see that hook for the
 * server-side merge/default-collapsed semantics). Purely presentational
 * here: isCollapsed/onToggle are always controlled by the caller. */
export function CollapsibleSection({
  title,
  isCollapsed,
  onToggle,
  renderHeaderExtra,
  keepMounted = false,
  id,
  className = "",
  children,
}: CollapsibleSectionProps) {
  return (
    <Div id={id} className={className} rounded="xl" border="default" surface="default">
      <Row align="center" justify="between" paddingX="x-md" paddingY="y-sm">
        <Button
          type="button"
          variant="ghost"
          onClick={onToggle}
          paddingX="none"
          paddingY="none"
          rounded="none"
          className="min-w-0 flex-1"
          aria-expanded={!isCollapsed}
        >
          <Row align="center" justify="between" className="w-full">
            <Span weight="semibold" size="sm">{title}</Span>
            <svg
              className={`w-4 h-4 transition-transform duration-150 ${isCollapsed ? "" : "rotate-180"} shrink-0`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Row>
        </Button>
        {/* Sibling of the toggle control, not nested inside it — renderHeaderExtra
            often renders a Link, and nesting an anchor inside a button is invalid HTML. */}
        {renderHeaderExtra && <Div className="ml-3 shrink-0">{renderHeaderExtra()}</Div>}
      </Row>
      {keepMounted ? (
        // No <Collapse>: it unmounts on close, which would discard uncommitted
        // child state (see `keepMounted` docs). `hidden` keeps the subtree
        // mounted and removes it from the a11y tree at the same time.
        <Div padding="md" border="top" hidden={isCollapsed}>{children}</Div>
      ) : (
        <Collapse isOpen={!isCollapsed}>
          <Div padding="md" border="top">{children}</Div>
        </Collapse>
      )}
    </Div>
  );
}
