"use client";
import React, { type ReactNode } from "react";
import { Div } from "./Div";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs";

export interface DetailPageTab {
  /** Stable tab id used for the URL `tab=` param and ARIA wiring. */
  id: string;
  /** Tab trigger label. */
  label: ReactNode;
  /** Optional count chip rendered next to the label. */
  count?: number;
  /** Tab panel content. */
  content: ReactNode;
  /** When true, the tab is rendered but disabled. */
  disabled?: boolean;
}

export interface DetailPageTabsProps {
  /** Tab definitions. */
  tabs: DetailPageTab[];
  /** Controlled active tab id (omit for uncontrolled). */
  activeTab?: string;
  /** Default tab id (uncontrolled). */
  defaultTab?: string;
  /** Change callback. */
  onTabChange?: (tabId: string) => void;
  /** Additional classes appended to the outer wrapper. */
  className?: string;
}

/**
 * `DetailPageTabs` — tab shell used by Product, Auction and Event detail
 * pages. Renders an accessible trigger strip + a single visible panel.
 * Animation and URL sync are intentionally not baked in so consumers can
 * wire those via the standard `useUrlTable` / `usePanelUrlSync` hooks.
 *
 * W1-14 — extracted 2026-05-23.
 */
export function DetailPageTabs({
  tabs,
  activeTab,
  defaultTab,
  onTabChange,
  className,
}: DetailPageTabsProps) {
  return (
    <Tabs
      value={activeTab}
      defaultValue={defaultTab ?? tabs[0]?.id ?? ""}
      onChange={onTabChange}
      className={["appkit-detail-tabs", "space-y-4", className].filter(Boolean).join(" ")}
    >
      <TabsList>
        {tabs.map((tab) => {
          const label = typeof tab.label === "string" ? tab.label : undefined;
          return (
            <TabsTrigger key={tab.id} value={tab.id} disabled={tab.disabled} badge={tab.count} label={label}>
              {tab.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id}>
          <Div>{tab.content}</Div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
