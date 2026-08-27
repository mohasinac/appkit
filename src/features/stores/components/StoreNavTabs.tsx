"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { TabBarButton, TabBarShell, TabsNavSelect, TextLink } from "../../../ui";

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

  /*
   * The listing-type picker goes in `leading` — i.e. INSIDE the shell but
   * OUTSIDE the role="tablist" element. It used to be a direct child of the
   * tablist, which is invalid ARIA: a <select> is not a role="tab". Its old
   * `max-w-[12rem] flex-shrink-0` sizing also went onto the inner <select>,
   * the wrong element for sizing utilities (Root Cause #29); those now live
   * on `.appkit-tabs-dropdown` in Tabs.style.css.
   */
  const leading =
    dropdownTabs.length > 0 ? (
      <TabsNavSelect
        ariaLabel={dropdownPlaceholder}
        options={dropdownTabs.map((tab) => ({ value: tab.value, label: tab.label }))}
        value={activeDropdownTab?.value ?? ""}
        placeholder={activeDropdownTab ? undefined : dropdownPlaceholder}
        selected={Boolean(activeDropdownTab)}
        onValueChange={handleDropdownChange}
      />
    ) : undefined;

  /*
   * Triggers carry `.appkit-tabs-trigger` and NOTHING else — no padding /
   * size / weight props, no conditional colour classes. `important: true` is
   * set in both tailwind configs, so any surviving utility would beat the
   * component CSS unconditionally. The old inactive string also contained
   * contradictory duplicates (`hover:text-neutral-800` immediately overridden
   * by `hover:text-…text-muted`), so hover had been a no-op.
   */
  return (
    <TabBarShell
      className={className}
      ariaLabel="Store sections"
      leading={leading}
      activeKey={activeValue}
    >
      {tabs.map((tab) =>
        tab.href ? (
          <TextLink
            key={tab.value}
            variant="bare"
            href={tab.href}
            role="tab"
            aria-selected={activeValue === tab.value}
            className="appkit-tabs-trigger"
          >
            {tab.label}
          </TextLink>
        ) : (
          <TabBarButton
            key={tab.value}
            selected={activeValue === tab.value}
            onClick={() => handleChange(tab.value)}
          >
            {tab.label}
          </TabBarButton>
        ),
      )}
    </TabBarShell>
  );
}
