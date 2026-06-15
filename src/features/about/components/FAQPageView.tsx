import { ROUTES } from "../../../constants";
import { THEME_CONSTANTS } from "../../../tokens";
import { Div, Heading, Text, Section, Stack, RichTextRenderer } from "../../../ui";
import { TextLink } from "../../../ui";
import { HelpCircle, ChevronRight } from "lucide-react";

const DEFAULT_HERO_CLASS =
  "bg-gradient-to-br from-violet-700 to-indigo-700 dark:from-violet-800 dark:to-indigo-800";

export interface FAQPageViewProps {
  /** If provided, filter to this category slug */
  category?: string;
  heroBannerClass?: string;
}

export async function FAQPageView({
  category,
  heroBannerClass = DEFAULT_HERO_CLASS,
}: FAQPageViewProps = {}) {
  const { themed, flex, page } = THEME_CONSTANTS;
  const { getTranslations, getMessages } = await import("next-intl/server");
  const t = await getTranslations("faqs");
  const messages = await getMessages();

  const faqMessages = (messages as Record<string, unknown>).faqs as
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
      <Section
        className={`${heroBannerClass} text-white py-14 md:py-16 lg:py-20`}
      >
        <Div className={`${page.container.md} text-center`}>
          <Heading level={1} variant="none" className="mb-3 text-white">
            {activeCategory ? activeCategory.label : t("title")}
          </Heading>
          <Text variant="none" className="text-white/80 max-w-2xl mx-auto">
            {t("subtitle")}
          </Text>
        </Div>
      </Section>

      <Div className={`${page.container.md} py-10 md:py-12 lg:py-16`}>
        <Div className="flex flex-col md:flex-row gap-8">
          {/* Category sidebar */}
          {categories.length > 0 && (
            <aside className="md:w-56 flex-shrink-0">
              <Heading
                level={3}
                className="uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-3" size="sm" weight="semibold"
              >
                {t("categoriesLabel")}
              </Heading>
              <nav className="space-y-1">
                <TextLink
                  href={String(ROUTES.PUBLIC.FAQS)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    !category
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <span className={`${flex.row} gap-2`}>
                    <HelpCircle className="w-4 h-4" />
                    {t("allCategories")}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </TextLink>
                {categories.map((cat) => (
                  <TextLink
                    key={cat.slug}
                    href={String(ROUTES.PUBLIC.FAQ_CATEGORY(cat.slug))}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      category === cat.slug
                        ? "bg-primary/10 text-primary font-semibold"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <span className={`${flex.row} gap-2`}>
                      <span>{cat.icon}</span>
                      {cat.label}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </TextLink>
                ))}
              </nav>
            </aside>
          )}

          {/* FAQ items */}
          <Div className="flex-1 min-w-0">
            {visibleItems.length === 0 ? (
              <Section
                className={`text-center py-16 rounded-2xl border ${themed.border} ${themed.bgSecondary}`}
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
              <Stack gap="sm" className="space-y-3">
                {visibleItems.map((item, i) => (
                  <details
                    key={i}
                    className={`group rounded-xl border ${themed.border} ${themed.bgPrimary} overflow-hidden`}
                  >
                    <summary
                      className={`flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none font-medium text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors`}
                    >
                      <span>{item.question}</span>
                      <ChevronRight className="w-4 h-4 flex-shrink-0 ml-3 transition-transform group-open:rotate-90" />
                    </summary>
                    <Div className="px-5 pb-5 pt-1">
                      <RichTextRenderer
                        html={item.answer}
                        proseClass="prose prose-sm max-w-none dark:prose-invert"
                      />
                    </Div>
                  </details>
                ))}
              </Stack>
            )}

            {/* Still need help? */}
            <Section
              className={`mt-10 rounded-2xl p-6 text-center border ${themed.border} ${themed.bgSecondary}`}
            >
              <Heading level={3} className="mb-2" size="base">
                {t("stillNeedHelpTitle")}
              </Heading>
              <Text variant="secondary" className="mb-4" size="sm">
                {t("stillNeedHelpText")}
              </Text>
              <Div className={`${flex.center} gap-4 flex-wrap`}>
                <TextLink href={String(ROUTES.PUBLIC.HELP)}>
                  {t("helpCenter")}
                </TextLink>
                <TextLink href={String(ROUTES.PUBLIC.CONTACT)} variant="muted">
                  {t("contactUs")}
                </TextLink>
              </Div>
            </Section>
          </Div>
        </Div>
      </Div>
    </Div>
  );
}
