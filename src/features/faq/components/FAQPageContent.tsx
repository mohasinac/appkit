"use client";

import React from "react";

import { Alert, Div, EmptyState, Heading, Input, SlottedListingView, Text } from "../../../ui";
import { sortBy } from "../../../constants/sort";
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
    /*
     * Optional, unlike every label above, because this branch is NEW and all
     * existing consumers predate it — making them required would be a breaking
     * change to a public appkit surface for a string that has a sensible
     * default (Root Cause #20: a prop signature change must update every call
     * site in the same commit, so prefer not needing one).
     */
    emptyTitle?: string;
    emptyDescription?: string;
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
  page?: number;
  pageSize?: number;
  renderPagination?: (total: number) => React.ReactNode;
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
  page = 1,
  pageSize = 100,
  renderPagination,
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

  const { faqs, total, isLoading, isError } = useFaqList({
    category: selectedCategory === "all" ? undefined : selectedCategory,
    search: searchValue.trim() || undefined,
    sorts,
    page,
    pageSize,
  });

  const { faqs: allMatchingFaqs } = useFaqList({
    search: searchValue.trim() || undefined,
    sorts: [sortBy("priority", "DESC"), sortBy("order", "ASC")].join(","),
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
    <Div padding="y-3xl">
      <Div className="mb-12 text-center">
        <Heading level={1} className="mb-4" smSize="4xl" size="3xl" weight="bold">
          {labels.title}
        </Heading>
        <Text className="mx-auto max-w-2xl" color="muted">
          {labels.subtitle}
        </Text>
      </Div>

      <Div className="mb-8 lg:hidden">
        {renderMobileCategoryTabs({
          selectedCategory,
          total,
          categoryCounts,
          onSelect: handleCategorySelect,
        })}
      </Div>

      <Div layout="grid" gap="8" className="grid-cols-1 lg:grid-cols-12">
        <Div className="hidden lg:col-span-4 lg:block xl:col-span-3">
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
        </Div>

        <Div className="col-span-1 lg:col-span-8 xl:col-span-9">
          <SlottedListingView
            portal="public"
            inlineToolbar
            className="space-y-6"
            renderHeader={() => (
              <Text size="sm" color="muted">
                {labels.resultCount(total)}
                {selectedCategory !== "all"
                  ? ` ${labels.inCategory(categories.find((c) => c.key === selectedCategory)?.label ?? selectedCategory)}`
                  : ""}
              </Text>
            )}
            renderSearch={() => (
              <Input
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={labels.searchPlaceholder}
              />
            )}
            renderSort={() => (
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
            )}
            renderTable={() =>
              isLoading ? (
                <Text color="muted">
                  {labels.loading}
                </Text>
              ) : isError ? (
                /*
                 * 🛑 A failed query is NOT an empty result, and rendering it as
                 * one is what hid this for so long: the list query threw
                 * FAILED_PRECONDITION (its default -createdAt sort had no
                 * composite index) while the sidebar's count query, sorted
                 * differently, succeeded. The page therefore showed "0
                 * questions" beside a sidebar counting 14 matches — two numbers
                 * from two queries, one of which had died silently.
                 *
                 * Saying so costs nothing and makes the next index gap
                 * self-reporting rather than a phantom empty state.
                 */
                <Alert variant="error" title="Couldn't load questions">
                  Something went wrong fetching these FAQs. Try a different sort
                  or reload the page.
                </Alert>
              ) : faqs.length === 0 ? (
                /*
                 * 🛑 AN EXPLICIT EMPTY BRANCH — without it the page rendered a
                 * BARE WHITE AREA.
                 *
                 * The chain fell through to <FAQAccordion faqs={[]} />, which
                 * renders nothing at all. Measured on /faqs?q=zzzznope: the
                 * page showed "0 questions", the search box, a divider, and
                 * then blank space — no message anywhere in the DOM.
                 *
                 * A blank region is the worst possible answer here because it
                 * is indistinguishable from a page that failed to load, which
                 * is exactly the confusion the isError branch above exists to
                 * prevent. Three states, three distinct renderings: loading,
                 * failed, and genuinely nothing found.
                 */
                <EmptyState
                  title={labels.emptyTitle ?? "No questions found"}
                  description={
                    labels.emptyDescription ??
                    "Try a different search term, or pick another category from the list."
                  }
                />
              ) : renderAccordion ? (
                renderAccordion(faqs)
              ) : (
                <FAQAccordion faqs={faqs} />
              )
            }
            renderPagination={() => renderPagination?.(total) ?? null}
            total={total}
            isLoading={isLoading}
          />

          {faqs.length > 0 ? (
            <Div className="mt-12">
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
            </Div>
          ) : null}
        </Div>
      </Div>
    </Div>
  );
}
