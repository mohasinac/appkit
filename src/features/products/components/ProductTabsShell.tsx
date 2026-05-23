"use client";
import React, { useState } from "react";

const STATIC_TABS = [
  { id: "description", label: "Description" },
  { id: "specs", label: "Specifications" },
  { id: "grading", label: "Grading" },
  { id: "ingredients", label: "Ingredients" },
  { id: "howToUse", label: "How to Use" },
  { id: "reviews", label: "Reviews" },
] as const;

type StaticTabId = (typeof STATIC_TABS)[number]["id"];

export interface CustomTabDef {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface ProductTabsShellProps {
  descriptionContent?: React.ReactNode;
  specsContent?: React.ReactNode;
  /** W1-34 — grading tab content (PSA/BGS/CGC etc). Pass non-null to surface the tab. */
  gradingContent?: React.ReactNode;
  ingredientsContent?: React.ReactNode;
  howToUseContent?: React.ReactNode;
  reviewsContent?: React.ReactNode;
  /** Additional tabs from custom sections — rendered after standard tabs */
  customTabs?: CustomTabDef[];
  className?: string;
}

export function ProductTabsShell({
  descriptionContent,
  specsContent,
  gradingContent,
  ingredientsContent,
  howToUseContent,
  reviewsContent,
  customTabs = [],
  className = "",
}: ProductTabsShellProps) {
  const staticContentMap: Record<StaticTabId, React.ReactNode | undefined> = {
    description: descriptionContent,
    specs: specsContent,
    grading: gradingContent,
    ingredients: ingredientsContent,
    howToUse: howToUseContent,
    reviews: reviewsContent,
  };

  const visibleStatic = STATIC_TABS.filter(
    (t) => staticContentMap[t.id] != null,
  );
  const visibleCustom = customTabs.filter((t) => t.content != null);

  const allTabs: { id: string; label: string; content: React.ReactNode }[] = [
    ...visibleStatic.map((t) => ({
      id: t.id,
      label: t.label,
      content: staticContentMap[t.id],
    })),
    ...visibleCustom,
  ];

  const [activeId, setActiveId] = useState<string>(allTabs[0]?.id ?? "");

  if (allTabs.length === 0) return null;

  const activeContent = allTabs.find((t) => t.id === activeId)?.content;

  return (
    <div className={`mt-8 ${className}`}>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-700 pb-px">
        {allTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveId(t.id)}
            className={`flex-shrink-0 -mb-px pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeId === t.id
                ? "border-[var(--appkit-color-primary,#6366f1)] text-[var(--appkit-color-primary,#6366f1)]"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{activeContent}</div>
    </div>
  );
}
