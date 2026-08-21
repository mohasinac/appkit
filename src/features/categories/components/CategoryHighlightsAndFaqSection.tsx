import { Container, Heading, Li, Section, Span, Stack, Ul } from "../../../ui";
import { FAQAccordion } from "../../faq/components/FAQAccordion";
import type { FAQ } from "../../faq/types";

export interface CategoryHighlightsAndFaqSectionProps {
  highlights?: string[];
  faqs?: { question: string; answer: string }[];
}

/**
 * Shared "why shop here" highlights + FAQ accordion, rendered on both
 * category and brand detail pages — the only editorial content either page
 * has beyond a one-line description (see CategoryDisplay's field list).
 * Renders nothing when both arrays are empty/absent.
 */
export function CategoryHighlightsAndFaqSection({ highlights, faqs }: CategoryHighlightsAndFaqSectionProps) {
  const hasHighlights = Boolean(highlights && highlights.length > 0);
  const hasFaqs = Boolean(faqs && faqs.length > 0);
  if (!hasHighlights && !hasFaqs) return null;

  const faqItems: FAQ[] = (faqs ?? []).map((f, i) => ({
    id: `faq-${i}`,
    question: f.question,
    answer: { text: f.answer, format: "plain" },
    category: "general",
  }));

  return (
    <Section padding="y-lg" border="subtle" className="border-t">
      <Container size="xl">
        <Stack gap="xl">
          {hasHighlights && (
            <Stack gap="sm">
              <Heading level={2} size="lg" weight="semibold">
                Why shop here
              </Heading>
              <Ul spacing="comfortable" size="sm" color="primary">
                {highlights!.map((h, i) => (
                  <Li key={i} layout="flex-start" gap="2">
                    <Span className="mt-0.5 flex-shrink-0 text-primary-500">•</Span>
                    {h}
                  </Li>
                ))}
              </Ul>
            </Stack>
          )}
          {hasFaqs && (
            <Stack gap="sm">
              <Heading level={2} size="lg" weight="semibold">
                Frequently Asked Questions
              </Heading>
              <FAQAccordion faqs={faqItems} />
            </Stack>
          )}
        </Stack>
      </Container>
    </Section>
  );
}
