import React from "react";

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
    <div className={className}>
      {renderTabBar ? (
        renderTabBar(activeTab, setActiveTab, tabs)
      ) : (
        <div className="flex gap-4 border-b mb-4">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setActiveTab(t.value)}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.value
                  ? "border-current text-current"
                  : "border-transparent text-neutral-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {activeTab === "description" && renderDescription?.()}
      {activeTab === "specs" && renderSpecs?.()}
      {activeTab === "reviews" && renderReviews?.()}
      {renderExtraTab?.(activeTab)}
    </div>
  );
}
