import React from "react";
import { Div } from "../../../ui";

export interface StoreTab {
  value: string;
  label: string;
  href?: string;
}

export interface StoreNavTabsProps {
  tabs: StoreTab[];
  activeValue?: string;
  onTabChange?: (value: string) => void;
  /** Render-prop for full custom tab bar */
  renderTabBar?: (
    tabs: StoreTab[],
    activeValue: string | undefined,
    onChange: (v: string) => void,
  ) => React.ReactNode;
  className?: string;
}

export function StoreNavTabs({
  tabs,
  activeValue,
  onTabChange,
  renderTabBar,
  className = "",
}: StoreNavTabsProps) {
  const handleChange = (v: string) => onTabChange?.(v);

  if (renderTabBar) {
    return <>{renderTabBar(tabs, activeValue, handleChange)}</>;
  }

  return (
    <Div
      role="tablist"
      className={`flex gap-2 border-b border-neutral-200 overflow-x-auto ${className}`}
    >
      {tabs.map((tab) =>
        tab.href ? (
          <a
            key={tab.value}
            href={tab.href}
            role="tab"
            aria-selected={activeValue === tab.value}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              activeValue === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {tab.label}
          </a>
        ) : (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeValue === tab.value}
            onClick={() => handleChange(tab.value)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              activeValue === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {tab.label}
          </button>
        ),
      )}
    </Div>
  );
}
