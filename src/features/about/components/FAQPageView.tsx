import { ROUTES } from "../../../constants";
import type { JsonValue } from "@mohasinac/appkit";
import { THEME_CONSTANTS } from "../../../tokens";
import { Aside, Container, Details, Div, Heading, Nav, RichTextRenderer, Row, Section, Span, Stack, Summary, Text } from "../../../ui";
import { TextLink } from "../../../ui";
import { HelpCircle, ChevronRight } from "lucide-react";


export interface FAQPageViewProps {
  /** If provided, filter to this category slug */
  category?: string;
}

export async function FAQPageView({
  category,
}: FAQPageViewProps = {}) {
  const { themed, flex, page } = THEME_CONSTANTS;
  const { getTranslations, getMessages } = await import("next-intl/server");
  const t = await getTranslations("faqs");
  const messages = await getMessages();

  const faqMessages = (messages as Record<string, JsonValue>).faqs as
    | {
        categories: Array<{ slug: string; label: string; icon: string }>;
        items: Array<{ category: string; question: string; answer: string }>;
      }
    | undefined;

  const categories = Array.isArray(faqMessages?.categories)
    ? faqMessages.categories
    : [];
  const allItems = Array.isArray(faqMessages?.items) ? faqMessages.items : [];

  const visibleItems = category
    ? allItems.filter((item) => item.category === category)
    : allItems;

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

      <Container size="md" padding="y-2xl" className="md:py-12 lg:py-16">
        <Stack className="md:flex-row" gap="xl">
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
                  className={`flex items-center justify-between px-3 py-2 transition-colors ${ !category ? "bg-primary/10 text-primary font-semibold" : "hover:bg-neutral-100 dark:hover:bg-neutral-800" }`} size="sm"
                >
                  <Span className={`${flex.row} gap-2`}>
                    <HelpCircle className="w-4 h-4" />
                    {t("allCategories")}
                  </Span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </TextLink>
                {categories.map((cat) => (
                  <TextLink rounded="lg" 
                    key={cat.slug}
                    href={String(ROUTES.PUBLIC.FAQ_CATEGORY(cat.slug))}
                    className={`flex items-center justify-between px-3 py-2 transition-colors ${ category === cat.slug ? "bg-primary/10 text-primary font-semibold" : "hover:bg-neutral-100 dark:hover:bg-neutral-800" }`} size="sm"
                  >
                    <Span className={`${flex.row} gap-2`}>
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
            {visibleItems.length === 0 ? (
              <Section
                className={`text-center`} border="default" surface="subtle" rounded="2xl" padding="y-4xl"
              >
                <HelpCircle className="w-10 h-10 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
                <Heading level={3} className="mb-2" size="base">
                  {t("emptyTitle")}
                </Heading>
                <Text variant="secondary" size="sm">
                  {t("emptyText")}
                </Text>
              </Section>
            ) : (
              <Stack gap="sm">
                {visibleItems.map((item, i) => (
                  <Details
                    key={i}
                    tone="card"
                    className="group overflow-hidden"
                  >
                    <Summary
                      className={`flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none font-medium text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors`}
                    >
                      <Span>{item.question}</Span>
                      <ChevronRight className="w-4 h-4 flex-shrink-0 ml-3 transition-transform group-open:rotate-90" />
                    </Summary>
                    <Div className="pb-5 pt-1" padding="x-md">
                      <RichTextRenderer
                        html={item.answer}
                        proseClass="prose prose-sm max-w-none dark:prose-invert"
                      />
                    </Div>
                  </Details>
                ))}
              </Stack>
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
