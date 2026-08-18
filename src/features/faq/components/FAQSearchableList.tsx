"use client";
import { useMemo, useState } from "react";
import { Div, Input } from "../../../ui";
import { FAQAccordion } from "./FAQAccordion";
import type { FAQ } from "../types";

interface FAQSearchableListLabels {
  searchPlaceholder: string;
  noResults: string;
}

export interface FAQSearchableListProps {
  faqs: FAQ[];
  labels: FAQSearchableListLabels;
}

const STRIP_HTML = /<[^>]+>/g;

export function FAQSearchableList({ faqs, labels }: FAQSearchableListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter((faq) => {
      const answerText = faq.answer.text.replace(STRIP_HTML, "").toLowerCase();
      return (
        faq.question.toLowerCase().includes(q) ||
        answerText.includes(q) ||
        (faq.tags?.some((tag) => tag.toLowerCase().includes(q)) ?? false)
      );
    });
  }, [faqs, query]);

  return (
    <Div>
      <Div className="mb-6">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={labels.searchPlaceholder}
          aria-label={labels.searchPlaceholder}
        />
      </Div>
      <FAQAccordion faqs={filtered} labels={{ noResults: labels.noResults }} />
    </Div>
  );
}
