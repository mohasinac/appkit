import { Card, Div, Heading, Row, Span, Text, TextLink } from "../../../ui";
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
    <Card variant="outlined" padding="lg" className="dark:bg-slate-800/60">
      <Heading level={2} className="mb-6" size="lg" weight="semibold">
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
        <Row justify="between">
          <Row gap="3">
            <Span size="2xl">FAQ</Span>
            <Span size="sm" weight="medium">
              {labels?.allFaqs ?? "All FAQs"}
            </Span>
          </Row>
          <Span size="xs" color="muted">
            {totalCount}
          </Span>
        </Row>
      </TextLink>

      <Div border="default" className="mt-4 border-t" padding="t-md">
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
              <Row justify="between" className="mb-1">
                <Row gap="3">
                  {category.icon ? (
                    <Span size="2xl">{category.icon}</Span>
                  ) : null}
                  <Span size="sm">{category.label}</Span>
                </Row>
                <Span size="xs" color="muted">
                  {count}
                </Span>
              </Row>
              {isSelected && category.description ? (
                <Text className="ml-11" color="muted" size="xs">
                  {category.description}
                </Text>
              ) : null}
            </TextLink>
          );
        })}
      </Div>

      {contactHref ? (
        <Div border="default" className="border-t" padding="t-lg">
          <Text className="mb-3" color="muted" size="sm">
            {labels?.stillHaveQuestions ?? "Still have questions?"}
          </Text>
          <TextLink
            href={contactHref}
            className="block rounded-lg bg-primary p-4 text-center text-white transition-colors hover:bg-primary/90" weight="medium"
          >
            {labels?.contactSupport ?? "Contact Support"}
          </TextLink>
        </Div>
      ) : null}
    </Card>
  );
}
