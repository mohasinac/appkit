import React, { useState } from "react";
import { THEME_CONSTANTS } from "../../../tokens";
import { Button, Heading, Section, Span, Text, TextLink } from "../../../ui";
import { ChevronDown } from "lucide-react";

// --- Types -------------------------------------------------------------------

export interface FAQTab {
  value: string;
  label: string;
  icon?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface FAQSectionProps {
  title: string;
  subtitle?: string;
  tabs: FAQTab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  items: FAQItem[];
  viewMoreHref?: string;
  viewMoreLabel?: string;
  hasMore?: boolean;
  moreCount?: number;
  renderTabs?: () => React.ReactNode;
  className?: string;
}

// --- Section -----------------------------------------------------------------

export function FAQSection({
  title,
  subtitle,
  items,
  viewMoreHref,
  viewMoreLabel = "View all →",
  hasMore = false,
  moreCount = 0,
  renderTabs,
  className = "",
}: FAQSectionProps) {
  const { themed, spacing, flex } = THEME_CONSTANTS;
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const toggleFaq = (faqId: string) => {
    setOpenFaqId(openFaqId === faqId ? null : faqId);
  };

  return (
    <Section className={`p-8 ${themed.bgSecondary} ${className}`}>
      <div className="w-full max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-8">
          <Heading
            level={2}
            variant="none"
            className="bg-gradient-to-r from-primary to-cobalt bg-clip-text text-transparent text-3xl md:text-4xl font-bold mb-3"
          >
            {title}
          </Heading>
          {subtitle && (
            <Text className={`text-base ${themed.textSecondary}`}>
              {subtitle}
            </Text>
          )}
        </div>

        {/* Category Tabs (rendered externally) */}
        {renderTabs && <div className="mb-8 -mx-8">{renderTabs()}</div>}

        {/* FAQ Accordion */}
        <div className={`${spacing.stack} max-w-5xl mx-auto`}>
          {items.length === 0 && (
            <Text className={`text-center py-8 ${themed.textSecondary}`}>
              No FAQs found.
            </Text>
          )}
          {items.map((faq) => {
            const isOpen = openFaqId === faq.id;
            return (
              <div
                key={faq.id}
                className={`${themed.bgPrimary} rounded-2xl overflow-hidden transition-all border-l-4 ${
                  isOpen
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-transparent"
                }`}
              >
                {/* Question Button */}
                <Button
                  variant="ghost"
                  className={`w-full text-left p-6 ${flex.between} gap-4 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors`}
                  onClick={() => toggleFaq(faq.id)}
                  aria-expanded={isOpen}
                >
                  <Span
                    className={`text-base ${themed.textPrimary} font-medium flex-1`}
                  >
                    {faq.question}
                  </Span>
                  <ChevronDown
                    className={`w-5 h-5 flex-shrink-0 ${themed.textSecondary} transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>

                {/* Answer */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-out ${
                    isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="p-6 pt-0">
                    <Text
                      className={`text-base ${themed.textSecondary} rounded-md ${themed.bgTertiary} p-4`}
                    >
                      {faq.answer}
                    </Text>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* View More link */}
        {viewMoreHref && (
          <div className="text-center mt-8">
            <TextLink
              href={viewMoreHref}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/15 dark:text-primary-400 transition-colors"
            >
              {viewMoreLabel}
              {hasMore && moreCount > 0 && (
                <Span className="bg-primary dark:bg-primary/80 text-white text-xs px-2 py-0.5 rounded-full">
                  +{moreCount}
                </Span>
              )}
            </TextLink>
          </div>
        )}
      </div>
    </Section>
  );
}
