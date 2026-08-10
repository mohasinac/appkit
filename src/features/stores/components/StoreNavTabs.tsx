import React from "react";
import { Div, TextLink } from "../../../ui";

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
    <Div layout="flex" gap="2"
      role="tablist"
      border="bottom"
      className={`overflow-x-auto ${className}`}
    >
      {tabs.map((tab) =>
        tab.href ? (
          <TextLink
            key={tab.value}
            variant="bare"
            href={tab.href}
            role="tab"
            aria-selected={activeValue === tab.value}
            paddingX="md"
            paddingY="xs"
            size="sm"
            weight="medium"
            className={`whitespace-nowrap border-b-2 -mb-px transition-colors ${
 activeValue === tab.value
 ? "border-primary text-primary"
 : "border-transparent text-[var(--appkit-color-text-muted)] text-[var(--appkit-color-text-muted)] hover:text-neutral-800 hover:text-[var(--appkit-color-text-muted)]"
 }`}
          >
            {tab.label}
          </TextLink>
        ) : (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeValue === tab.value}
            onClick={() => handleChange(tab.value)}
            className={`px-[var(--appkit-space-4)] py-[var(--appkit-space-2)] text-[length:var(--appkit-text-sm)] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
 activeValue === tab.value
 ? "border-primary text-primary"
 : "border-transparent text-[var(--appkit-color-text-muted)] text-[var(--appkit-color-text-muted)] hover:text-neutral-800 hover:text-[var(--appkit-color-text-muted)]"
 }`}
          >
            {tab.label}
          </button>
        ),
      )}
    </Div>
  );
}
