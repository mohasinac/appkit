"use client";
/*
 * WHY: Seven tab bars existed across this codebase, four of them hand-rolled
 *      copies of the same `border-b-2 / -mb-px` underline with a DIFFERENT
 *      active colour each. This is the one shell they all render through, so
 *      the look is shared by construction rather than by discipline.
 *
 * WHAT: The chrome around a `role="tablist"` — the rail, the overflow scroll
 *       arrows, and a `leading` slot for controls that are NOT tabs. Plus the
 *       two trigger flavours a folded bar needs: `TabBarButton` (a bare
 *       `role="tab"` button) and `TabsNavSelect` (the >5-tab dropdown,
 *       stripped of Select's input chrome).
 *
 * EXPORTS: TabBarShell, TabBarShellProps, TabBarButton, TabBarButtonProps,
 *          TabsNavSelect, TabsNavSelectProps
 *
 * @tag domain:ui
 * @tag layer:ui
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:Tabs,StoreNavTabs,EventTabBar
 * @tag sideEffects:none
 */

import React, { useRef } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Div } from "./Div";
import { Select, type SelectOption } from "./Select";
import { useTabsOverflow } from "./tabs-overflow";

const UI_TAB_BAR = {
  shell: "appkit-tabs-shell",
  arrow: "appkit-tabs-shell__arrow",
  list: "appkit-tabs-list",
  trigger: "appkit-tabs-trigger",
  dropdown: "appkit-tabs-dropdown",
  dropdownUnselected: "appkit-tabs-dropdown--unselected",
  dropdownSelect: "appkit-tabs-dropdown__select",
  dropdownCaret: "appkit-tabs-dropdown__caret",
} as const;

export interface TabBarShellProps {
  /**
   * Applied to the inner `role="tablist"` element — unchanged from the
   * pre-shell `TabsList` behaviour, so existing consumers keep getting it on
   * the element that actually holds the tabs. Note it is no longer the
   * OUTERMOST node: a margin or width passed here applies inside the shell's
   * flex row.
   */
  className?: string;
  /** Accessible name for the tablist. */
  ariaLabel?: string;
  /**
   * Rendered before the tablist, inside the shell but OUTSIDE the
   * `role="tablist"` element — for controls that are not tabs (StoreNavTabs'
   * listing-type picker). A `<select>` inside a tablist is invalid ARIA,
   * since it is not a `role="tab"`.
   */
  leading?: React.ReactNode;
  /**
   * The currently-selected tab's value. Keys the scroll-into-view effect, so a
   * selection that starts off-screen in an overflowing strip is scrolled to.
   * Omit and that repositioning simply does not happen — overflow detection
   * and the arrows work regardless.
   */
  activeKey?: string;
  children?: React.ReactNode;
}

/**
 * `TabBarShell` — the rail + overflow arrows around a `role="tablist"`.
 *
 * The arrows are SIBLINGS of the tablist, never children, so its accessibility
 * -tree children stay exactly the `role="tab"` elements — no `aria-owns`, no
 * invalid-child warnings.
 */
export function TabBarShell({
  className = "",
  ariaLabel = "Tabs",
  leading,
  activeKey = "",
  children,
}: TabBarShellProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const { hasArrows, atStart, atEnd, scrollByPage } = useTabsOverflow(listRef, activeKey);

  /*
   * The arrows are aria-hidden + tabIndex={-1} deliberately. They duplicate
   * scrolling that keyboard users already get for free: every trigger is a
   * natural tab stop and browsers scroll a focused element into view, so
   * WCAG 2.1.1 is satisfied by that path. Making them focusable would add two
   * extra tab stops to every tab bar in the app, in front of the content the
   * user is actually navigating to — a net keyboard regression for a
   * redundant affordance. (HorizontalScroller's arrows ARE focusable, and
   * correctly so: there they page through card content with no other
   * keyboard path.)
   */
  return (
    <Div className={UI_TAB_BAR.shell} data-arrows={hasArrows ? "true" : "false"}>
      {leading}
      {hasArrows && (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          disabled={atStart}
          onClick={() => scrollByPage(-1)}
          className={UI_TAB_BAR.arrow}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      <Div
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel}
        className={[UI_TAB_BAR.list, className].filter(Boolean).join(" ")}
      >
        {children}
      </Div>
      {hasArrows && (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          disabled={atEnd}
          onClick={() => scrollByPage(1)}
          className={UI_TAB_BAR.arrow}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </Div>
  );
}

export interface TabBarButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "role" | "aria-selected"> {
  selected: boolean;
}

/**
 * `TabBarButton` — a bare `role="tab"` button carrying `.appkit-tabs-trigger`.
 *
 * Exists because appkit's `<Button variant="ghost">` is NOT transparent: it
 * has a `--appkit-color-border-subtle` fill, a 44px min-height and a
 * `rounded-xl` radius, so the hand-rolled bars that used it were rendering
 * grey pill chips rather than text tabs. It also wraps children in
 * `.appkit-button__content` (Root Cause #68), which a tab does not want.
 */
export function TabBarButton({ selected, className = "", children, ...rest }: TabBarButtonProps) {
  return (
    <button
      {...rest}
      type={rest.type ?? "button"}
      role="tab"
      aria-selected={selected}
      className={[UI_TAB_BAR.trigger, className].filter(Boolean).join(" ")}
    >
      {children}
    </button>
  );
}

export interface TabsNavSelectProps {
  ariaLabel: string;
  options: SelectOption[];
  value: string;
  placeholder?: string;
  /**
   * `false` renders the `--unselected` modifier (transparent rail) — the
   * control is present but is making no "you are here" claim, which is
   * StoreNavTabs' state while a non-listing tab is active.
   */
  selected?: boolean;
  onValueChange: (value: string) => void;
  className?: string;
  role?: string;
}

/**
 * `TabsNavSelect` — the collapsed tab bar, past `TABS_DROPDOWN_THRESHOLD`.
 *
 * A `<select>` that reads as navigation rather than as a form field: the
 * enclosing rectangle is gone and the only chrome left is the same 2px brand
 * rail an active row-tab uses. See the block comment in Tabs.style.css for
 * the full reasoning, and the specificity warning above those rules.
 *
 * `variant="default"` and NOT `"ghost"` — ghost's `border-transparent
 * bg-transparent` are `!important` utilities that would pin the border to
 * transparent and block the indicator rail.
 */
export function TabsNavSelect({
  ariaLabel,
  options,
  value,
  placeholder,
  selected = true,
  onValueChange,
  className = "",
  role,
}: TabsNavSelectProps) {
  return (
    <Div
      className={[
        UI_TAB_BAR.dropdown,
        selected ? "" : UI_TAB_BAR.dropdownUnselected,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Select
        bare
        variant="default"
        aria-label={ariaLabel}
        role={role}
        options={options}
        value={value}
        placeholder={placeholder}
        onValueChange={onValueChange}
        className={UI_TAB_BAR.dropdownSelect}
      />
      <Div className={UI_TAB_BAR.dropdownCaret} aria-hidden="true">
        <ChevronDown className="w-4 h-4" />
      </Div>
    </Div>
  );
}
