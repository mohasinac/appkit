"use client"
import React, { createContext, useContext, useMemo, useState } from "react";
import { Select } from "./Select";

const UI_TABS = {
  list: "appkit-tabs-list",
  listDropdown: "appkit-tabs-list--dropdown",
  trigger: "appkit-tabs-trigger",
  content: "appkit-tabs-content",
} as const;

/** Past this many items, TabsList renders a <Select> dropdown instead of a
 * horizontal row — a scrollable row of 6+ tabs is unreadable/unreachable on
 * mobile widths. */
const TABS_DROPDOWN_THRESHOLD = 5;

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

  const items = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<TabsTriggerProps> => React.isValidElement(child),
  );

  if (items.length > TABS_DROPDOWN_THRESHOLD) {
    const options = items.map((item) => ({
      value: item.props.value,
      label: typeof item.props.children === "string" ? item.props.children : item.props.value,
      disabled: item.props.disabled,
    }));
    return (
      <Select
        bare
        aria-label="Tabs"
        role="tablist"
        options={options}
        value={active}
        onValueChange={setActive}
        className={[UI_TABS.list, UI_TABS.listDropdown, className].filter(Boolean).join(" ")}
      />
    );
  }

  return (
    <div
      role="tablist"
      className={[UI_TABS.list, className].filter(Boolean).join(" ")}
     data-section="tabs-div-615">
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  disabled,
  className = "",
  children,
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
