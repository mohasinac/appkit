import React, { useState } from "react";
import { Button, Span, Text } from "@mohasinac/ui";
import type { FAQ, FAQCategory } from "../types";

interface FAQAccordionItemProps {
  faq: FAQ;
  isOpen: boolean;
  onToggle: () => void;
}

function FAQAccordionItem({ faq, isOpen, onToggle }: FAQAccordionItemProps) {
  return (
    <div className="border-b border-neutral-200 last:border-0">
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
        <div className="pb-4 text-sm text-neutral-600">
          {faq.answer.format === "html" ? (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: faq.answer.text }}
            />
          ) : (
            <Text className="whitespace-pre-line">{faq.answer.text}</Text>
          )}
        </div>
      )}
    </div>
  );
}

interface FAQAccordionProps {
  faqs: FAQ[];
  className?: string;
}

export function FAQAccordion({ faqs, className = "" }: FAQAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div
      className={`divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white px-5 ${className}`}
    >
      {faqs.map((faq) => (
        <FAQAccordionItem
          key={faq.id}
          faq={faq}
          isOpen={openId === faq.id}
          onToggle={() => setOpenId(openId === faq.id ? null : faq.id)}
        />
      ))}
    </div>
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
    <div className="scrollbar-none flex flex-wrap gap-2">
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
    </div>
  );
}
