import React, { useState } from "react";
import { Button, Div, Row, Span, Text } from "@mohasinac/ui";
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
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-neutral-900 transition hover:text-primary"
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
        <Div className="pb-4 text-sm text-neutral-600">
          {faq.tags && faq.tags.length > 0 && (
            <Row wrap gap="sm" className="mb-3">
              {faq.tags.map((tag) => (
                <Span
                  key={tag}
                  className="rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-600"
                >
                  {tag}
                </Span>
              ))}
            </Row>
          )}
          {faq.answer.format === "html" ? (
            <Div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: faq.answer.text }}
            />
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
      <Div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <Text className="text-neutral-600">{labels.noResults}</Text>
      </Div>
    );
  }

  return (
    <Div
      className={`divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white px-5 ${className}`}
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

export function FAQCategoryTabs({
  categories,
  active,
  onSelect,
  labels = {},
}: FAQCategoryTabsProps) {
  return (
    <Row wrap gap="sm" className="scrollbar-none">
      <Button
        onClick={() => onSelect(null)}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${!active ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
      >
        {labels.all ?? "All"}
      </Button>
      {categories.map((cat) => (
        <Button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${active === cat ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
        >
          {labels[cat] ?? cat.replace(/_/g, " ")}
        </Button>
      ))}
    </Row>
  );
}
