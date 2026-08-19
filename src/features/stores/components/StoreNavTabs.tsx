"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Button, Div, Select, TextLink } from "../../../ui";

const CLS_ACTIVE_TAB = "border-primary text-primary";

export interface StoreTab {
  value: string;
  label: string;
  href?: string;
}

export interface StoreNavTabsProps {
  tabs: StoreTab[];
  /**
   * Listing-type tabs (Products/Auctions/Pre-Orders/.../Art & Stickers) —
   * rendered as a single dropdown ahead of `tabs` instead of one row entry
   * each, so the bar can't overflow no matter how many listing types are
   * enabled. Picking an option navigates to its `href`.
   */
  dropdownTabs?: StoreTab[];
  /** Label shown in the dropdown when the active tab isn't a listing type (e.g. on Reviews/About). */
  dropdownPlaceholder?: string;
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
  dropdownTabs = [],
  dropdownPlaceholder = "Browse listings",
  activeValue,
  onTabChange,
  renderTabBar,
  className = "",
}: StoreNavTabsProps) {
  const router = useRouter();
  const handleChange = (v: string) => onTabChange?.(v);

  if (renderTabBar) {
    return <>{renderTabBar([...dropdownTabs, ...tabs], activeValue, handleChange)}</>;
  }

  const activeDropdownTab = dropdownTabs.find((tab) => tab.value === activeValue);

  const handleDropdownChange = (value: string) => {
    const tab = dropdownTabs.find((t) => t.value === value);
    if (!tab) return;
    if (tab.href) router.push(tab.href);
    handleChange(tab.value);
  };

  return (
    <Div layout="flex" gap="2" align="center"
      role="tablist"
      border="bottom"
      className={`overflow-x-auto ${className}`}
    >
      {dropdownTabs.length > 0 && (
        <Select
          bare
          aria-label={dropdownPlaceholder}
          options={dropdownTabs.map((tab) => ({ value: tab.value, label: tab.label }))}
          value={activeDropdownTab?.value ?? ""}
          placeholder={activeDropdownTab ? undefined : dropdownPlaceholder}
          onValueChange={handleDropdownChange}
          className={`max-w-[12rem] flex-shrink-0 whitespace-nowrap ${activeDropdownTab ? CLS_ACTIVE_TAB : ""}`}
        />
      )}
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
 ? CLS_ACTIVE_TAB
 : "border-transparent text-[var(--appkit-color-text-muted)] text-[var(--appkit-color-text-muted)] hover:text-neutral-800 hover:text-[var(--appkit-color-text-muted)]"
 }`}
          >
            {tab.label}
          </TextLink>
        ) : (
          <Button
            variant="ghost"
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeValue === tab.value}
            onClick={() => handleChange(tab.value)}
            paddingX="md"
            paddingY="sm"
            textSize="sm"
            weight="medium"
            rounded="none"
            className={`whitespace-nowrap border-b-2 -mb-px transition-colors ${
 activeValue === tab.value
 ? CLS_ACTIVE_TAB
 : "border-transparent text-[var(--appkit-color-text-muted)] text-[var(--appkit-color-text-muted)] hover:text-neutral-800 hover:text-[var(--appkit-color-text-muted)]"
 }`}
          >
            {tab.label}
          </Button>
        ),
      )}
    </Div>
  );
}
