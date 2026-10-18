"use client"
import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import { TabBarShell } from "./TabBarShell";
import { OverflowRow, type OverflowRowItem } from "./OverflowRow";
import { useRowCollapse } from "./row-collapse";

const UI_TABS = {
  trigger: "appkit-tabs-trigger",
  content: "appkit-tabs-content",
  badge: "appkit-tabs-trigger__badge",
} as const;

/*
 * 🛑 THE COUNT THRESHOLD IS GONE. Do not reintroduce it.
 *
 * This used to be `TABS_DROPDOWN_THRESHOLD = 5` — past five tabs, render a
 * dropdown. A count cannot answer "does this fit", and it was wrong in both
 * directions: four long labels ("Pre-Orders 12", "Prize Draws 3") overflow a
 * 390px phone and stayed a row, while eight short ones ("All", "New", "Used")
 * fit a desktop with room to spare and collapsed anyway.
 *
 * `useRowCollapse` measures the rendered row against its container instead,
 * and re-measures on resize, on font swap, and whenever the tab set changes.
 */

interface TabsContextValue {
  active: string;
  setActive: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue>({
  active: "",
  setActive: () => {},
});

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export interface TabsListProps {
  className?: string;
  children?: React.ReactNode;
}

export interface TabsTriggerProps {
  value: string;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  /** Optional count badge rendered as a small pill after the label. */
  badge?: number;
  /**
   * Plain-text label to use for the collapsed mobile dropdown's option text
   * when `children` isn't a plain string (e.g. it renders a badge pill).
   * Falls back to `value` when omitted and `children` isn't a string.
   */
  label?: string;
}

export interface TabsContentProps {
  value: string;
  className?: string;
  children?: React.ReactNode;
}

export function Tabs({
  defaultValue = "",
  value,
  onChange,
  className = "",
  children,
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const active = value ?? internalValue;

  const contextValue = useMemo(
    () => ({
      active,
      setActive: (next: string) => {
        if (value == null) {
          setInternalValue(next);
        }
        onChange?.(next);
      },
    }),
    [active, onChange, value],
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={className} data-section="tabs-div-614">{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className = "", children }: TabsListProps) {
  const { active, setActive } = useContext(TabsContext);
  const shellRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const items = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<TabsTriggerProps> => React.isValidElement(child),
  );

  /*
   * The collapsed label must be PLAIN TEXT: `children` may render a badge
   * pill, and a ReactNode cannot be searched, measured as a signature, or put
   * in an option's accessible name. `label` is the explicit escape hatch for
   * that case; `value` is the last resort.
   */
  const overflowItems: OverflowRowItem[] = items.map((item) => ({
    id: item.props.value,
    label:
      item.props.label ??
      (typeof item.props.children === "string" ? item.props.children : item.props.value),
    count: item.props.badge,
    disabled: item.props.disabled,
    onSelect: () => setActive(item.props.value),
  }));

  const signature = overflowItems.map((i) => `${i.id}:${i.label}:${i.count ?? ""}`).join("|");
  const collapsed = useRowCollapse(shellRef, rowRef, signature);

  /*
   * Collapsed renders `OverflowRow` in its already-collapsed state rather than
   * the old `TabsNavSelect`, which was a native `<select>` — so the collapsed
   * tab bar is now SEARCHABLE and keyboard-navigable. That matters most
   * exactly where it collapses: a 30-tab bar on a phone was a 30-row native
   * picker with no way to type at it.
   *
   * The EXPANDED state deliberately stays `TabBarShell`, so the underline rail
   * every tab surface in the app shares is untouched. Only the overflow
   * behaviour changed, never the resting appearance.
   */
  if (collapsed) {
    return (
      <div ref={shellRef} className={className}>
        <OverflowRow
          items={overflowItems}
          ariaLabel="Tabs"
          activeId={active}
          alwaysCollapsed
          searchPlaceholder="Search tabs…"
        />
      </div>
    );
  }

  return (
    <div ref={shellRef}>
      <TabBarShell className={className} ariaLabel="Tabs" activeKey={active} listRef={rowRef}>
        {children}
      </TabBarShell>
    </div>
  );
}

export function TabsTrigger({
  value,
  disabled,
  className = "",
  children,
  badge,
}: TabsTriggerProps) {
  const { active, setActive } = useContext(TabsContext);
  const isActive = active === value;

  return (
    <button
      role="tab"
      type="button"
      disabled={disabled}
      aria-selected={isActive}
      onClick={() => setActive(value)}
      className={[UI_TABS.trigger, className].filter(Boolean).join(" ")}
    >
      {children}
      {typeof badge === "number" && badge > 0 && (
        <span className={UI_TABS.badge}>{badge > 99 ? "99+" : badge}</span>
      )}
    </button>
  );
}

export function TabsContent({
  value,
  className = "",
  children,
}: TabsContentProps) {
  const { active } = useContext(TabsContext);
  if (active !== value) return null;

  return (
    <div className={[UI_TABS.content, className].join(" ")} data-section="tabs-div-616">{children}</div>
  );
}

export default Tabs;
