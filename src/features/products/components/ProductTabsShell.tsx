"use client";
import React, { useState } from "react";

const ALL_TABS = [
  { id: "description", label: "Description" },
  { id: "specs", label: "Specifications" },
  { id: "ingredients", label: "Ingredients" },
  { id: "howToUse", label: "How to Use" },
  { id: "reviews", label: "Reviews" },
] as const;

type TabId = (typeof ALL_TABS)[number]["id"];

export interface ProductTabsShellProps {
  descriptionContent?: React.ReactNode;
  specsContent?: React.ReactNode;
  ingredientsContent?: React.ReactNode;
  howToUseContent?: React.ReactNode;
  reviewsContent?: React.ReactNode;
  className?: string;
}

export function ProductTabsShell({
  descriptionContent,
  specsContent,
  ingredientsContent,
  howToUseContent,
  reviewsContent,
  className = "",
}: ProductTabsShellProps) {
  const contentMap: Record<TabId, React.ReactNode | undefined> = {
    description: descriptionContent,
    specs: specsContent,
    ingredients: ingredientsContent,
    howToUse: howToUseContent,
    reviews: reviewsContent,
  };

  const visibleTabs = ALL_TABS.filter((t) => contentMap[t.id] != null);
  const [activeTab, setActiveTab] = useState<TabId>(
    visibleTabs[0]?.id ?? "description",
  );

  if (visibleTabs.length === 0) return null;

  return (
    <div className={`mt-8 ${className}`}>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-700 pb-px">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`flex-shrink-0 -mb-px pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>
        {visibleTabs.map((t) => (
          <div key={t.id} hidden={activeTab !== t.id}>
            {contentMap[t.id]}
          </div>
        ))}
      </div>
    </div>
  );
}
