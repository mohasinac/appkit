"use client"
import React, { useState, useMemo } from "react";
import { THEME_CONSTANTS } from "../../../tokens";
import { Button, Div, Heading, RichText, Section, Span, Stack, Text, TextLink } from "../../../ui";
import { ChevronDown } from "lucide-react";

const __O = {
  hidden: "overflow-hidden",
} as const;

// --- Constants ----------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  orders_payment: "Orders & Payment",
  shipping_delivery: "Shipping",
  returns_refunds: "Returns & Refunds",
  product_information: "Products",
  account_security: "Account",
  technical_support: "Support",
};

// --- Types -------------------------------------------------------------------

export interface FAQTab {
  value: string;
  label: string;
}

export interface FAQItem {
  id: string;
  question: string;
  /** HTML or plain-text answer. */
  answer: string;
  category?: string;
}

export interface FAQSectionProps {
  title: string;
  subtitle?: string;
  items: FAQItem[];
  /** Explicit tab list. When omitted and showCategoryTabs=true, tabs are derived from items. */
  tabs?: FAQTab[];
  /** Show a category tab bar so visitors can filter by topic. */
  showCategoryTabs?: boolean;
  /** Allow multiple accordion panels open simultaneously. Default: false (single-open). */
  allowMultipleOpen?: boolean;
  /** Number of items to expand on first render. 0 = all closed. */
  defaultOpenCount?: number;
  viewMoreHref?: string;
  viewMoreLabel?: string;
  hasMore?: boolean;
  moreCount?: number;
  className?: string;
}

// --- Helpers -----------------------------------------------------------------

function isHtml(s: string) {
  return /<[a-z][\s\S]*>/i.test(s);
}

// --- Section -----------------------------------------------------------------

export function FAQSection({
  title,
  subtitle,
  items,
  tabs: tabsProp,
  showCategoryTabs = false,
  allowMultipleOpen = false,
  defaultOpenCount = 0,
  viewMoreHref,
  viewMoreLabel = "View all FAQs →",
  hasMore = false,
  moreCount = 0,
  className = "",
}: FAQSectionProps) {
  const { themed, flex } = THEME_CONSTANTS;

  // Derive tabs from items when not explicitly provided
  const derivedTabs = useMemo<FAQTab[]>(() => {
    if (!showCategoryTabs) return [];
    if (tabsProp && tabsProp.length > 0) return tabsProp;
    const seen = new Set<string>();
    const result: FAQTab[] = [];
    for (const item of items) {
      const cat = item.category ?? "general";
      if (!seen.has(cat)) {
        seen.add(cat);
        result.push({ value: cat, label: CATEGORY_LABELS[cat] ?? cat });
      }
    }
    return result;
  }, [showCategoryTabs, tabsProp, items]);

  const showTabs = showCategoryTabs && derivedTabs.length > 1;

  const [activeTab, setActiveTab] = useState<string>("all");

  // Pre-open the first N items
  const defaultOpen = useMemo(
    () => new Set(items.slice(0, defaultOpenCount).map((i) => i.id)),
    [items, defaultOpenCount],
  );

  const [openIds, setOpenIds] = useState<Set<string>>(defaultOpen);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!allowMultipleOpen) next.clear();
        next.add(id);
      }
      return next;
    });
  };

  // Filter by selected tab
  const visibleItems = useMemo(() => {
    if (!showTabs || activeTab === "all") return items;
    return items.filter((i) => (i.category ?? "general") === activeTab);
  }, [items, showTabs, activeTab]);

  return (
    <Section className={`px-4 sm:px-8 ${className}`} surface="subtle" padding="y-4xl">
      <Div className="w-full max-w-4xl mx-auto">

        {/* Section Header */}
        <Div className="text-center mb-10">
          <Heading
            level={2}
            variant="none"
            gradient="brand"
            className="mb-3" mdSize="4xl" size="3xl" weight="bold"
          >
            {title}
          </Heading>
          {subtitle && (
            <Text className={`max-w-xl mx-auto ${themed.textSecondary}`} size="base">
              {subtitle}
            </Text>
          )}
        </Div>

        {/* Category Tabs — appkit Button with ghost variant */}
        {showTabs && (
          <Div className={`${flex.center} flex-wrap gap-2 mb-8`}>
            <Button
              variant={activeTab === "all" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("all")}
              className="rounded-full"
            >
              All
            </Button>
            {derivedTabs.map((tab) => (
              <Button
                key={tab.value}
                variant={activeTab === tab.value ? "primary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.value)}
                className="rounded-full"
              >
                {tab.label}
              </Button>
            ))}
          </Div>
        )}

        {/* FAQ Accordion */}
        <Stack gap="sm">
          {visibleItems.length === 0 && (
            <Text className={`text-center py-12 ${themed.textSecondary}`}>
              No FAQs in this category yet.
            </Text>
          )}
          {visibleItems.map((faq) => {
            const isOpen = openIds.has(faq.id);
            return (
              <div
                key={faq.id}
                className={`${themed.bgPrimary} rounded-xl overflow-hidden border transition-all duration-200 ${
                  isOpen ? "border-primary/40 shadow-sm" : `${themed.border}`
                }`}
              >
                {/* Question trigger */}
                <Button
                  variant="ghost"
                  className={`w-full text-left px-5 py-4 ${flex.between} gap-4 hover:${themed.bgTertiary} transition-colors rounded-none`}
                  onClick={() => toggle(faq.id)}
                  aria-expanded={isOpen}
                >
                  <Span
                    size="sm" weight="medium"
                    className={`flex-1 leading-snug ${
                      isOpen ? "text-primary" : themed.textPrimary
                    }`}
                  >
                    {faq.question}
                  </Span>
                  <ChevronDown
                    className={`w-4 h-4 flex-shrink-0 transition-transform duration-250 ${
                      isOpen ? "rotate-180 text-primary" : themed.textSecondary
                    }`}
                  />
                </Button>

                {/* Answer — CSS grid expand/collapse animation */}
                <Div
                  className={`grid transition-all duration-300 ease-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <Div className={`${__O.hidden}`}>
                    <Div className="pb-5 pt-0" padding="x-md">
                      {isHtml(faq.answer) ? (
                        <RichText
                          html={faq.answer}
                          proseClass="prose prose-sm max-w-none dark:prose-invert"
                        />
                      ) : (
                        <Text className={`leading-relaxed ${themed.textSecondary}`} size="sm">
                          {faq.answer}
                        </Text>
                      )}
                    </Div>
                  </Div>
                </Div>
              </div>
            );
          })}
        </Stack>

        {/* View More */}
        {viewMoreHref && (
          <Div className="text-center mt-10">
            <TextLink
              href={viewMoreHref}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/15 transition-colors" size="sm" weight="medium"
            >
              {viewMoreLabel}
              {hasMore && moreCount > 0 && (
                <Span color="inverse" size="xs" className="bg-primary py-0.5" rounded="full" padding="x-xs">
                  +{moreCount}
                </Span>
              )}
            </TextLink>
          </Div>
        )}
      </Div>
    </Section>
  );
}
