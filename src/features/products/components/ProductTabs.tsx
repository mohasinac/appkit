"use client"
import { Tabs, TabsList, TabsTrigger } from "@mohasinac/appkit/ui";
import React from "react";
import { Div } from "../../../ui/components/Div";

export interface ProductTab {
  value: string;
  label: string;
}

export interface ProductTabsProps {
  /** Render the description tab content */
  renderDescription?: () => React.ReactNode;
  /** Render the specifications / details tab content */
  renderSpecs?: () => React.ReactNode;
  /** Render the reviews tab content */
  renderReviews?: () => React.ReactNode;
  /** Render custom extra tabs; provide renderTabContent for each */
  extraTabs?: ProductTab[];
  renderExtraTab?: (value: string) => React.ReactNode;
  /** Render the tab strip itself — when provided, replaces the default tab bar */
  renderTabBar?: (
    activeTab: string,
    onChange: (t: string) => void,
    tabs: ProductTab[],
  ) => React.ReactNode;
  defaultTab?: string;
  className?: string;
}

const DEFAULT_TABS: ProductTab[] = [
  { value: "description", label: "Description" },
  { value: "specs", label: "Specifications" },
  { value: "reviews", label: "Reviews" },
];

export function ProductTabs({
  renderDescription,
  renderSpecs,
  renderReviews,
  extraTabs = [],
  renderExtraTab,
  renderTabBar,
  defaultTab = "description",
  className = "",
}: ProductTabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultTab);

  const allTabs: ProductTab[] = [
    ...(renderDescription
      ? [{ value: "description", label: "Description" }]
      : []),
    ...(renderSpecs ? [{ value: "specs", label: "Specifications" }] : []),
    ...(renderReviews ? [{ value: "reviews", label: "Reviews" }] : []),
    ...extraTabs,
  ];

  const tabs = allTabs.length > 0 ? allTabs : DEFAULT_TABS;

  return (
    <Div className={className}>
      {renderTabBar ? (
        renderTabBar(activeTab, setActiveTab, tabs)
      ) : (
        // Was a hand-rolled <Row> of ghost <Button>s whose ACTIVE state was
        // `border-current text-current` — the inherited colour, i.e. visually
        // identical to inactive. It also had no role="tablist"/role="tab"/
        // aria-selected at all; routing through Tabs supplies all three.
        <Tabs value={activeTab} onChange={setActiveTab} className="mb-4">
          <TabsList>
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      {activeTab === "description" && renderDescription?.()}
      {activeTab === "specs" && renderSpecs?.()}
      {activeTab === "reviews" && renderReviews?.()}
      {renderExtraTab?.(activeTab)}
    </Div>
  );
}
