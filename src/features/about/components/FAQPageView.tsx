import { ROUTES } from "../../../constants";
import type { JsonValue } from "@mohasinac/appkit";
import { FLEX_ROW } from "../../../_internal/shared/styles/themed";
import { Aside, Container, Div, Heading, Nav, Row, Section, Span, Stack, Text } from "../../../ui";
import { TextLink } from "../../../ui";
import { HelpCircle, ChevronRight } from "lucide-react";
import { FAQSearchableList } from "../../faq/components/FAQSearchableList";
import type { FAQ } from "../../faq/types";
import type { FAQDocument } from "../../faq/schemas/firestore";

export interface FAQPageViewProps {
  /** If provided, filter to this category slug */
  category?: string;
  /** Active FAQs fetched server-side by the caller (Firestore-backed). */
  faqs?: FAQDocument[];
}

function toDisplayFaq(doc: FAQDocument): FAQ {
  return {
    id: doc.id,
    question: doc.question,
    answer: typeof doc.answer === "string" ? { text: doc.answer, format: "plain" } : doc.answer,
    category: doc.category,
    tags: doc.tags,
  };
}

export async function FAQPageView({
  category,
  faqs = [],
}: FAQPageViewProps = {}) {
  const flex = { row: FLEX_ROW };
  const { getTranslations, getMessages } = await import("next-intl/server");
  const t = await getTranslations("faqs");
  const messages = await getMessages();

  const faqMessages = (messages as Record<string, JsonValue>).faqs as
    | { categories: Array<{ slug: string; label: string; icon: string }> }
    | undefined;

  const categories = Array.isArray(faqMessages?.categories)
    ? faqMessages.categories
    : [];

  const visibleFaqs = (category ? faqs.filter((f) => f.category === category) : faqs).map(toDisplayFaq);

  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <Div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10">
      {/* Hero */}
      <Section color="inverse" 
        tone="accent-banner" padding="banner"
      >
        <Container size="md" className="text-center">
          <Heading color="inverse" level={1} variant="none" className="mb-3">
            {activeCategory ? activeCategory.label : t("title")}
          </Heading>
          <Text color="inverse" variant="none" className="/80 max-w-2xl mx-auto">
            {t("subtitle")}
          </Text>
        </Container>
      </Section>

      <Container size="md" padding="content-banner">
        <Stack direction="md-row" gap="xl">
          {/* Category sidebar */}
          {categories.length > 0 && (
            <Aside className="md:w-56 flex-shrink-0">
              <Heading
                level={3}
                className="uppercase tracking-wide mb-3" color="muted" size="sm" weight="semibold"
              >
                {t("categoriesLabel")}
              </Heading>
              <Nav aria-label="FAQ categories" spacing="xs">
                <TextLink rounded="lg"
                  href={String(ROUTES.PUBLIC.FAQS)}
                  paddingX="sm" paddingY="xs"
                  layout="flex" align="center" justify="between"
                  weight={!category ? "semibold" : undefined}
                  className={`transition-colors ${ !category ? "bg-primary/10 text-primary" : "hover:bg-surface-hover" }`} size="sm"
                >
                  <Span className={`${flex.row}`} gap="md">
                    <HelpCircle className="w-4 h-4" />
                    {t("allCategories")}
                  </Span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </TextLink>
                {categories.map((cat) => (
                  <TextLink rounded="lg"
                    key={cat.slug}
                    href={String(ROUTES.PUBLIC.FAQ_CATEGORY(cat.slug))}
                    paddingX="sm" paddingY="xs"
                    layout="flex" align="center" justify="between"
                    weight={category === cat.slug ? "semibold" : undefined}
                    className={`transition-colors ${ category === cat.slug ? "bg-primary/10 text-primary" : "hover:bg-surface-hover" }`} size="sm"
                  >
                    <Span className={`${flex.row}`} gap="md">
                      <Span>{cat.icon}</Span>
                      {cat.label}
                    </Span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </TextLink>
                ))}
              </Nav>
            </Aside>
          )}

          {/* FAQ items */}
          <Div className="flex-1 min-w-0">
            {visibleFaqs.length === 0 ? (
              <Section
                className={`text-center`} border="default" surface="subtle" rounded="2xl" padding="y-4xl"
              >
                <HelpCircle className="w-10 h-10 mx-auto mb-3 text-zinc-300 dark:text-[var(--appkit-color-text-muted)]" />
                <Heading level={3} className="mb-2" size="base">
                  {t("emptyTitle")}
                </Heading>
                <Text variant="secondary" size="sm">
                  {t("emptyText")}
                </Text>
              </Section>
            ) : (
              <FAQSearchableList
                faqs={visibleFaqs}
                labels={{
                  searchPlaceholder: t("searchPlaceholder"),
                  noResults: t("searchNoResults"),
                }}
              />
            )}

            {/* Still need help? */}
            <Section
              className={`mt-10 text-center`} border="default" surface="subtle" rounded="2xl" padding="lg"
            >
              <Heading level={3} className="mb-2" size="base">
                {t("stillNeedHelpTitle")}
              </Heading>
              <Text variant="secondary" className="mb-4" size="sm">
                {t("stillNeedHelpText")}
              </Text>
              <Row align="center" justify="center" gap="md" wrap >
                <TextLink href={String(ROUTES.PUBLIC.HELP)}>
                  {t("helpCenter")}
                </TextLink>
                <TextLink href={String(ROUTES.PUBLIC.CONTACT)} variant="muted">
                  {t("contactUs")}
                </TextLink>
              </Row>
            </Section>
          </Div>
        </Stack>
      </Container>
    </Div>
  );
}
