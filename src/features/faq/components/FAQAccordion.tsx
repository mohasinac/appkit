"use client"
import React, { useState } from "react";
import { Button, Div, RichText, Row, Span, Tabs, TabsList, TabsTrigger, Text } from "../../../ui";
import type { FAQ, FAQCategory } from "../types";

interface FAQAccordionItemProps {
  faq: FAQ;
  isOpen: boolean;
  onToggle: () => void;
  renderExpandedFooter?: (faq: FAQ) => React.ReactNode;
}

function FAQAccordionItem({
  faq,
  isOpen,
  onToggle,
  renderExpandedFooter,
}: FAQAccordionItemProps) {
  return (
    <Div className="border-b border-neutral-200 last:border-0">
      <Button
        variant="ghost"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full justify-[space-between] gap-[1rem] py-[1rem] text-left text-[0.875rem] font-[500] text-[var(--appkit-color-text)] dark:text-[var(--appkit-color-text)] transition hover:text-primary"
      >
        <Span>{faq.question}</Span>
        <Span
          className={`flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Span>
      </Button>
      {isOpen && (
        <Div textSize="sm" className="text-[var(--appkit-color-text-muted)]" padding="b-md">
          {faq.tags && faq.tags.length > 0 && (
            <Row wrap gap="sm" className="mb-3">
              {faq.tags.map((tag) => (
                <Span
                  key={tag}
                  className="bg-[var(--appkit-color-surface)] py-[0.25rem] text-[var(--appkit-color-text-muted)]" rounded="md" padding="x-xs" size="xs"
                >
                  {tag}
                </Span>
              ))}
            </Row>
          )}
          {faq.answer.format === "html" ? (
            <RichText html={faq.answer.text} className="prose-sm" />
          ) : (
            <Text className="whitespace-pre-line">{faq.answer.text}</Text>
          )}
          {renderExpandedFooter?.(faq)}
        </Div>
      )}
    </Div>
  );
}

export interface FAQAccordionProps {
  faqs: FAQ[];
  className?: string;
  /** Render extra content inside the expanded panel (below the answer text). */
  renderExpandedFooter?: (faq: FAQ) => React.ReactNode;
  labels?: {
    noResults?: string;
  };
}

export function FAQAccordion({
  faqs,
  className = "",
  renderExpandedFooter,
  labels,
}: FAQAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (faqs.length === 0 && labels?.noResults) {
    return (
      <Div surface="card" padding="xl" className="text-center">
        <Text className="text-[var(--appkit-color-text-muted)]">{labels.noResults}</Text>
      </Div>
    );
  }

  return (
    <Div
      surface="card"
      className={`divide-y divide-neutral-100 divide-[var(--appkit-color-border)] ${className}`} padding="x-md"
    >
      {faqs.map((faq) => (
        <FAQAccordionItem
          key={faq.id}
          faq={faq}
          isOpen={openId === faq.id}
          onToggle={() => setOpenId(openId === faq.id ? null : faq.id)}
          renderExpandedFooter={renderExpandedFooter}
        />
      ))}
    </Div>
  );
}

interface FAQCategoryTabsProps {
  categories: FAQCategory[];
  active?: FAQCategory | null;
  onSelect: (cat: FAQCategory | null) => void;
  labels?: Partial<Record<FAQCategory | "all", string>>;
}

const ALL_TAB_VALUE = "__all__";

export function FAQCategoryTabs({
  categories,
  active,
  onSelect,
  labels = {},
}: FAQCategoryTabsProps) {
  return (
    <Tabs
      value={active ?? ALL_TAB_VALUE}
      onChange={(next) => onSelect(next === ALL_TAB_VALUE ? null : (next as FAQCategory))}
    >
      <TabsList>
        <TabsTrigger value={ALL_TAB_VALUE}>{labels.all ?? "All"}</TabsTrigger>
        {categories.map((cat) => (
          <TabsTrigger key={cat} value={cat}>
            {labels[cat] ?? cat.replace(/_/g, " ")}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
