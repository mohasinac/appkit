"use client";

import { Div, Heading, Span, Text, TextLink } from "../../../ui";
import type { FAQCategory } from "../types";

export interface FAQCategoryItem {
  key: FAQCategory;
  icon?: string;
  label: string;
  description?: string;
}

interface FAQCategorySidebarProps {
  selectedCategory: FAQCategory | "all";
  onCategorySelect?: (category: FAQCategory | "all") => void;
  categoryCounts: Record<FAQCategory, number>;
  categories: FAQCategoryItem[];
  allFaqsHref?: string;
  categoryHref: (category: FAQCategory) => string;
  contactHref?: string;
  labels?: {
    title?: string;
    allFaqs?: string;
    stillHaveQuestions?: string;
    contactSupport?: string;
  };
}

export function FAQCategorySidebar({
  selectedCategory,
  onCategorySelect,
  categoryCounts,
  categories,
  allFaqsHref = "/faqs",
  categoryHref,
  contactHref,
  labels,
}: FAQCategorySidebarProps) {
  const totalCount = Object.values(categoryCounts).reduce(
    (sum, count) => sum + count,
    0,
  );

  return (
    <Div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/60">
      <Heading level={2} className="mb-6 text-lg font-semibold">
        {labels?.title ?? "Categories"}
      </Heading>

      <TextLink
        href={allFaqsHref}
        onClick={() => onCategorySelect?.("all")}
        className={`mb-3 block w-full rounded-lg p-4 text-left transition-colors ${
          selectedCategory === "all"
            ? "bg-primary/10 text-zinc-900 dark:text-zinc-100"
            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-slate-700"
        }`}
      >
        <Div className="flex items-center justify-between">
          <Div className="flex items-center gap-3">
            <Span className="text-2xl">FAQ</Span>
            <Span className="text-sm font-medium">
              {labels?.allFaqs ?? "All FAQs"}
            </Span>
          </Div>
          <Span className="text-xs text-zinc-500 dark:text-zinc-400">
            {totalCount}
          </Span>
        </Div>
      </TextLink>

      <Div className="mt-4 border-t border-zinc-200 pt-4 dark:border-slate-700">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.key;
          const count = categoryCounts[category.key] || 0;

          return (
            <TextLink
              key={category.key}
              href={categoryHref(category.key)}
              onClick={() => onCategorySelect?.(category.key)}
              className={`mb-3 block w-full rounded-lg p-4 text-left transition-colors ${
                isSelected
                  ? "bg-primary/10 text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-slate-700"
              }`}
            >
              <Div className="mb-1 flex items-center justify-between">
                <Div className="flex items-center gap-3">
                  {category.icon ? (
                    <Span className="text-2xl">{category.icon}</Span>
                  ) : null}
                  <Span className="text-sm">{category.label}</Span>
                </Div>
                <Span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {count}
                </Span>
              </Div>
              {isSelected && category.description ? (
                <Text className="ml-11 text-xs text-zinc-500 dark:text-zinc-400">
                  {category.description}
                </Text>
              ) : null}
            </TextLink>
          );
        })}
      </Div>

      {contactHref ? (
        <Div className="border-t border-zinc-200 pt-6 dark:border-slate-700">
          <Text className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">
            {labels?.stillHaveQuestions ?? "Still have questions?"}
          </Text>
          <TextLink
            href={contactHref}
            className="block rounded-lg bg-primary p-4 text-center font-medium text-white transition-colors hover:bg-primary/90"
          >
            {labels?.contactSupport ?? "Contact Support"}
          </TextLink>
        </Div>
      ) : null}
    </Div>
  );
}
