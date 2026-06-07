"use client";
import React, { useState, type ReactNode } from "react";
import { Div } from "./Div";
import { Span } from "./Typography";

const __O = {
  xAuto: "overflow-x-auto",
} as const;

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
  activeTab: activeTabProp,
  defaultTab,
  onTabChange,
  className,
}: DetailPageTabsProps) {
  const [internalActive, setInternalActive] = useState(
    defaultTab ?? tabs[0]?.id ?? "",
  );
  const activeTab = activeTabProp ?? internalActive;
  const active = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  const handleChange = (id: string) => {
    if (activeTabProp === undefined) setInternalActive(id);
    onTabChange?.(id);
  };

  return (
    <Div
      className={[
        "appkit-detail-tabs",
        "space-y-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Div role="tablist" aria-orientation="horizontal" className={`flex gap-2 border-b border-zinc-200 dark:border-zinc-700 ${__O.xAuto}`}>
        {tabs.map((tab) => {
          const isActive = tab.id === active?.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`detail-tab-panel-${tab.id}`}
              id={`detail-tab-trigger-${tab.id}`}
              disabled={tab.disabled}
              onClick={() => handleChange(tab.id)}
              className={[
                "flex-shrink-0 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-[var(--appkit-color-primary)] text-zinc-900 dark:text-zinc-100"
                  : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200",
                tab.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
              ].join(" ")}
            >
              {tab.label}
              {typeof tab.count === "number" ? (
                <Span size="xs" className="ml-2 inline-flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5">
                  {tab.count}
                </Span>
              ) : null}
            </button>
          );
        })}
      </Div>

      {active ? (
        <Div
          role="tabpanel"
          id={`detail-tab-panel-${active.id}`}
          aria-labelledby={`detail-tab-trigger-${active.id}`}
        >
          {active.content}
        </Div>
      ) : null}
    </Div>
  );
}
