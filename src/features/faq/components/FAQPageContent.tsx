"use client";

import { Heading, Text } from "@mohasinac/ui";
import type { FAQCategory, FAQ } from "../types";
import { FAQCategorySidebar, type FAQCategoryItem } from "./FAQCategorySidebar";
import { FAQSortDropdown, type FAQSortOption } from "./FAQSortDropdown";
import { FAQAccordion } from "./FAQAccordion";
import { ContactCTA } from "./ContactCTA";
import { useFaqList } from "../hooks/useFaqList";

interface FAQPageContentProps {
  initialCategory?: FAQCategory | "all";
  categories: FAQCategoryItem[];
  routeHelpers: {
    allFaqsHref: string;
    faqCategoryHref: (category: FAQCategory) => string;
    contactHref: string;
    navigateToCategory: (category: FAQCategory | "all") => void;
  };
  labels: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    categoriesTitle: string;
    allFaqs: string;
    stillHaveQuestions: string;
    contactSupport: string;
    sortLabel: string;
    sortHelpful: string;
    sortNewest: string;
    sortAlphabetical: string;
    resultCount: (count: number) => string;
    inCategory: (categoryLabel: string) => string;
    loading: string;
    contactTitle: string;
    contactDescription: string;
    contactEmailUs: string;
    contactCallUs: string;
    contactForm: string;
    contactSubmitRequest: string;
    contactTeam: string;
  };
  contact: {
    email: string;
    phone: string;
  };
  searchValue: string;
  onSearchChange: (value: string) => void;
  sortOption: FAQSortOption;
  onSortChange: (sort: FAQSortOption) => void;
  renderMobileCategoryTabs: (input: {
    selectedCategory: FAQCategory | "all";
    total: number;
    categoryCounts: Record<FAQCategory, number>;
    onSelect: (value: FAQCategory | "all") => void;
  }) => React.ReactNode;
  renderAccordion?: (faqs: FAQ[]) => React.ReactNode;
}

export function FAQPageContent({
  initialCategory = "all",
  categories,
  routeHelpers,
  labels,
  contact,
  searchValue,
  onSearchChange,
  sortOption,
  onSortChange,
  renderMobileCategoryTabs,
  renderAccordion,
}: FAQPageContentProps) {
  const selectedCategory = initialCategory;

  const sorts =
    sortOption === "helpful"
      ? "-stats.helpful,-priority,order"
      : sortOption === "alphabetical"
        ? "question"
        : "-createdAt";

  const { faqs, total, isLoading } = useFaqList({
    category: selectedCategory === "all" ? undefined : selectedCategory,
    search: searchValue.trim() || undefined,
    sorts,
    page: 1,
    pageSize: 100,
  });

  const { faqs: allMatchingFaqs } = useFaqList({
    search: searchValue.trim() || undefined,
    sorts: "-priority,order",
    page: 1,
    pageSize: 200,
  });

  const categoryCounts = categories.reduce(
    (acc, category) => {
      acc[category.key] = 0;
      return acc;
    },
    {} as Record<FAQCategory, number>,
  );

  allMatchingFaqs.forEach((faq) => {
    if (faq.category in categoryCounts) {
      categoryCounts[faq.category] += 1;
    }
  });

  const handleCategorySelect = (category: FAQCategory | "all") => {
    routeHelpers.navigateToCategory(category);
  };

  return (
    <div className="py-12">
      <div className="mb-12 text-center">
        <Heading level={1} className="mb-4 text-3xl font-bold sm:text-4xl">
          {labels.title}
        </Heading>
        <Text className="mx-auto max-w-2xl text-zinc-600 dark:text-zinc-300">
          {labels.subtitle}
        </Text>
      </div>

      <div className="mb-8">
        <input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={labels.searchPlaceholder}
          className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none ring-primary/20 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-zinc-100"
        />
      </div>

      <div className="mb-8 lg:hidden">
        {renderMobileCategoryTabs({
          selectedCategory,
          total,
          categoryCounts,
          onSelect: handleCategorySelect,
        })}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="hidden lg:col-span-4 lg:block xl:col-span-3">
          <FAQCategorySidebar
            selectedCategory={selectedCategory}
            onCategorySelect={handleCategorySelect}
            categoryCounts={categoryCounts}
            categories={categories}
            allFaqsHref={routeHelpers.allFaqsHref}
            categoryHref={routeHelpers.faqCategoryHref}
            contactHref={routeHelpers.contactHref}
            labels={{
              title: labels.categoriesTitle,
              allFaqs: labels.allFaqs,
              stillHaveQuestions: labels.stillHaveQuestions,
              contactSupport: labels.contactSupport,
            }}
          />
        </div>

        <div className="col-span-1 lg:col-span-8 xl:col-span-9">
          <div className="mb-8 flex items-center justify-between gap-4">
            <Text className="text-sm text-zinc-600 dark:text-zinc-300">
              {labels.resultCount(total)}
              {selectedCategory !== "all"
                ? ` ${labels.inCategory(categories.find((c) => c.key === selectedCategory)?.label ?? selectedCategory)}`
                : ""}
            </Text>
            <FAQSortDropdown
              selectedSort={sortOption}
              onSortChange={onSortChange}
              labels={{
                label: labels.sortLabel,
                helpful: labels.sortHelpful,
                newest: labels.sortNewest,
                alphabetical: labels.sortAlphabetical,
              }}
            />
          </div>

          {isLoading ? (
            <Text className="text-zinc-500 dark:text-zinc-400">
              {labels.loading}
            </Text>
          ) : renderAccordion ? (
            renderAccordion(faqs)
          ) : (
            <FAQAccordion faqs={faqs} />
          )}

          {faqs.length > 0 ? (
            <div className="mt-12">
              <ContactCTA
                email={contact.email}
                phone={contact.phone}
                contactHref={routeHelpers.contactHref}
                labels={{
                  title: labels.contactTitle,
                  description: labels.contactDescription,
                  emailUs: labels.contactEmailUs,
                  callUs: labels.contactCallUs,
                  contactForm: labels.contactForm,
                  submitRequest: labels.contactSubmitRequest,
                  contactTeam: labels.contactTeam,
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
