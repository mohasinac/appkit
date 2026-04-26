"use client";
import React, { useState } from "react";

const TABS = [
  { id: "description", label: "Description" },
  { id: "specs", label: "Specifications" },
  { id: "reviews", label: "Reviews" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export interface ProductTabsShellProps {
  /** Pre-rendered description content (server RSC node) */
  descriptionContent?: React.ReactNode;
  /** Pre-rendered specifications content (server RSC node) */
  specsContent?: React.ReactNode;
  /** Pre-rendered reviews content (server RSC node) */
  reviewsContent?: React.ReactNode;
  className?: string;
}

/**
 * RSC-safe tab shell for product detail pages.
 *
 * Accepts pre-rendered ReactNode children instead of render functions so the
 * component can be used inside a server component tree. (Functions cannot cross
 * the RSC serialisation boundary to a "use client" component.)
 */
export function ProductTabsShell({
  descriptionContent,
  specsContent,
  reviewsContent,
  className = "",
}: ProductTabsShellProps) {
  const visibleTabs = TABS.filter(
    (t) =>
      (t.id === "description" && descriptionContent != null) ||
      (t.id === "specs" && specsContent != null) ||
      (t.id === "reviews" && reviewsContent != null),
  );

  const [activeTab, setActiveTab] = useState<TabId>(
    visibleTabs[0]?.id ?? "description",
  );

  if (visibleTabs.length === 0) return null;

  return (
    <div className={className}>
      <div className="mb-6 flex gap-4 border-b border-zinc-200 dark:border-zinc-700">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`-mb-px pb-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>
        {activeTab === "description" && descriptionContent}
        {activeTab === "specs" && specsContent}
        {activeTab === "reviews" && reviewsContent}
      </div>
    </div>
  );
}
