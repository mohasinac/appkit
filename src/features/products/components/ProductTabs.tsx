"use client"
import { Button, Row } from "@mohasinac/appkit/ui";
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
        <Row gap="md" className="border-b mb-4">
          {tabs.map((t) => (
            <Button
              variant="ghost"
              key={t.value}
              type="button"
              onClick={() => setActiveTab(t.value)}
              paddingX="none"
              paddingY="xs"
              textSize="sm"
              weight="medium"
              rounded="none"
              className={`border-b-2 transition-colors ${
 activeTab === t.value
 ? "border-current text-current"
 : "border-transparent text-[var(--appkit-color-text-muted)]"
 }`}
            >
              {t.label}
            </Button>
          ))}
        </Row>
      )}
      {activeTab === "description" && renderDescription?.()}
      {activeTab === "specs" && renderSpecs?.()}
      {activeTab === "reviews" && renderReviews?.()}
      {renderExtraTab?.(activeTab)}
    </Div>
  );
}
