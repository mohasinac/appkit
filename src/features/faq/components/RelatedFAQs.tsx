"use client";

import { Div, Heading, Text, TextLink } from "../../../ui";
import type { FAQ } from "../types";

interface RelatedFAQsProps {
  relatedFAQs: FAQ[];
  hrefForFaq?: (faq: FAQ) => string;
  labels?: {
    title?: string;
  };
}

export function RelatedFAQs({
  relatedFAQs,
  hrefForFaq,
  labels,
}: RelatedFAQsProps) {
  if (!relatedFAQs || relatedFAQs.length === 0) {
    return null;
  }

  return (
    <Div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/60">
      <Heading level={3} className="mb-4 text-lg font-semibold">
        {labels?.title ?? "Related Questions"}
      </Heading>

      <Div className="space-y-3">
        {relatedFAQs.map((faq) => (
          <TextLink
            key={faq.id}
            href={hrefForFaq ? hrefForFaq(faq) : `/faqs#${faq.id}`}
            className="group block rounded-lg bg-zinc-100 p-4 transition-colors hover:bg-zinc-200 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            <Div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-zinc-500 dark:text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>

              <Text className="text-sm text-zinc-800 transition-colors group-hover:text-primary dark:text-zinc-100">
                {faq.question}
              </Text>

              <svg
                className="ml-auto mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100 dark:text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Div>
          </TextLink>
        ))}
      </Div>
    </Div>
  );
}
