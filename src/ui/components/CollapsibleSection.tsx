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
  /**
   * Render the header as a STATIC heading with no toggle control, and the
   * body permanently open.
   *
   * Exists because `SectionForm` documents required sections as rendering
   * "without a collapse control so it can't be hidden" and had no way to say
   * so: it passed a no-op `onToggle` instead, while this component went on
   * rendering a full `<Button>` with a rotating chevron. Every required
   * section — ~73 `sectionRequired: true` annotations across the schemas —
   * therefore showed an interactive-looking control that did nothing when
   * clicked, which reads as a broken form rather than as an intentionally
   * permanent section.
   *
   * Not the same thing as `isCollapsed={false}`: that is an open section the
   * user may still close.
   */
  collapsible?: boolean;
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
  collapsible = true,
  renderHeaderExtra,
  keepMounted = false,
  id,
  className = "",
  children,
}: CollapsibleSectionProps) {
  /*
   * A static section is always open, whatever the caller passed. Honouring
   * `isCollapsed` here would produce a permanently hidden panel with no
   * control to reveal it — strictly worse than the dead chevron this replaces.
   */
  const open = collapsible ? !isCollapsed : true;
  const panelId = id ? `${id}-panel` : undefined;
  const headerId = id ? `${id}-header` : undefined;

  /*
   * Only wrap a STRING title. `SectionForm` passes phrasing content that
   * already carries its own weight/size, and wrapping that produced a nested
   * duplicate `<Span weight="semibold" size="sm">`.
   */
  const titleNode =
    typeof title === "string" ? (
      <Span weight="semibold" size="sm">{title}</Span>
    ) : (
      title
    );

  return (
    <Div id={id} className={className} rounded="xl" border="default" surface="default">
      <Row align="center" justify="between" paddingX="x-md" paddingY="y-sm">
        {collapsible ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onToggle}
            paddingX="none"
            paddingY="none"
            rounded="none"
            className="min-w-0 flex-1"
            aria-expanded={open}
            aria-controls={panelId}
            id={headerId}
          >
            <Span className="flex w-full items-center justify-between">
              {titleNode}
              <svg
                className={`w-4 h-4 transition-transform duration-150 ${open ? "rotate-180" : ""} shrink-0`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Span>
          </Button>
        ) : (
          // No <Button>, no chevron: nothing here is interactive, so nothing
          // should look interactive.
          <Div className="min-w-0 flex-1" id={headerId}>{titleNode}</Div>
        )}
        {/* Sibling of the toggle control, not nested inside it — renderHeaderExtra
            often renders a Link, and nesting an anchor inside a button is invalid HTML. */}
        {renderHeaderExtra && <Div className="ml-3 shrink-0">{renderHeaderExtra()}</Div>}
      </Row>
      {!collapsible ? (
        <Div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          padding="md"
          border="top"
        >
          {children}
        </Div>
      ) : keepMounted ? (
        // No <Collapse>: it unmounts on close, which would discard uncommitted
        // child state (see `keepMounted` docs). `hidden` keeps the subtree
        // mounted and removes it from the a11y tree at the same time.
        <Div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          padding="md"
          border="top"
          hidden={!open}
        >
          {children}
        </Div>
      ) : (
        <Collapse isOpen={open}>
          <Div
            id={panelId}
            role="region"
            aria-labelledby={headerId}
            padding="md"
            border="top"
          >
            {children}
          </Div>
        </Collapse>
      )}
    </Div>
  );
}
