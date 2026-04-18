"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

const UI_TABS = {
  list: "appkit-tabs-list",
  trigger: "appkit-tabs-trigger",
  content: "appkit-tabs-content",
} as const;

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
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className = "", children }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={[UI_TABS.list, className].filter(Boolean).join(" ")}
    >
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
    <div className={[UI_TABS.content, className].join(" ")}>{children}</div>
  );
}

export default Tabs;
