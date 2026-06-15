import { ROUTES } from "../../../constants";
import { THEME_CONSTANTS } from "../../../tokens";
import { Div, Heading, Text, Section, Stack, Alert } from "../../../ui";
import { TextLink } from "../../../ui";
import {
  BookOpen,
  MessageCircle,
  ShoppingBag,
  Gavel,
  PackageCheck,
  UserCheck,
  Store,
  ChevronRight,
} from "lucide-react";

const __P = {
  p6: "p-6",
  p8: "p-8",
} as const;


export interface HelpPageViewProps {
}

export async function HelpPageView({
}: HelpPageViewProps = {}) {
  const { themed, flex, page } = THEME_CONSTANTS;
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("helpPage");

  const TOPICS = [
    {
      icon: ShoppingBag,
      title: t("topicShopping"),
      desc: t("topicShoppingDesc"),
      href: String(ROUTES.PUBLIC.HELP_SHOPPING),
      color: "bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30",
      iconColor: "text-primary",
    },
    {
      icon: Gavel,
      title: t("topicAuctions"),
      desc: t("topicAuctionsDesc"),
      href: String(ROUTES.PUBLIC.HELP_AUCTIONS),
      color: "bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-700",
      iconColor: "text-sky-600 dark:text-sky-400",
    },
    {
      icon: PackageCheck,
      title: t("topicOrders"),
      desc: t("topicOrdersDesc"),
      href: String(ROUTES.PUBLIC.HELP_ORDERS),
      color: "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      icon: UserCheck,
      title: t("topicAccount"),
      desc: t("topicAccountDesc"),
      href: String(ROUTES.PUBLIC.HELP_ACCOUNT),
      color: "bg-violet-50 border-violet-200 dark:bg-violet-900/20 dark:border-violet-700",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
    {
      icon: BookOpen,
      title: t("topicFAQs"),
      desc: t("topicFAQsDesc"),
      href: String(ROUTES.PUBLIC.FAQS),
      color: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      icon: Store,
      title: t("topicSelling"),
      desc: t("topicSellingDesc"),
      href: String(ROUTES.PUBLIC.SELLER_GUIDE),
      color: "bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-700",
      iconColor: "text-rose-600 dark:text-rose-400",
    },
  ];

  return (
    <Div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10">
      <Section tone="accent-banner" className="text-white md:py-16 lg:py-20" padding="y-2-5xl">
        <Div className={`${page.container.md} text-center`}>
          <Heading level={1} variant="none" className="mb-4 text-white">{t("title")}</Heading>
          <Text variant="none" className="text-white/80 max-w-2xl mx-auto">{t("subtitle")}</Text>
        </Div>
      </Section>
      <Div className={`${page.container.md} md:py-12 lg:py-16 space-y-14`} padding="y-2xl">
        {renderTopicsGrid(t, flex, TOPICS)}
        {renderScamAwarenessAlert(t)}
        {renderTrackOrderSection(t, themed)}
        {renderContactCtaSection(t, themed)}
      </Div>
    </Div>
  );
}

type HelpTranslateFn = Awaited<ReturnType<typeof import("next-intl/server").getTranslations>>;
type HelpThemedTokens = (typeof THEME_CONSTANTS)["themed"];
type HelpFlexTokens = (typeof THEME_CONSTANTS)["flex"];
 
type TopicItem = { icon: any; title: string; desc: string; href: string; color: string; iconColor: string };

function renderTopicsGrid(t: HelpTranslateFn, flex: HelpFlexTokens, topics: TopicItem[]) {
  return (
    <Section>
      <Heading level={2} className="mb-6" align="center">{t("browseTopics")}</Heading>
      <Div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map(({ icon: Icon, title, desc, href, color, iconColor }) => (
          <TextLink key={href} href={href} className={`group rounded-xl border p-5 transition-shadow hover:shadow-md ${color} no-underline`}>
            <Div className={`w-10 h-10 dark:bg-white/10 ${flex.center} mb-3`} surface="default" rounded="lg">
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </Div>
            <Div className={`${flex.row} justify-between items-start`}>
              <Div>
                <Text className="mb-1" weight="semibold">{title}</Text>
                <Text variant="secondary" className="leading-relaxed" size="sm">{desc}</Text>
              </Div>
              <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0 opacity-40 group-hover:opacity-80 transition-opacity" />
            </Div>
          </TextLink>
        ))}
      </Div>
    </Section>
  );
}

function renderScamAwarenessAlert(t: HelpTranslateFn) {
  return (
    <Alert variant="warning" title={t("scamAwarenessTitle")}>
      {t("scamAwarenessText")}{" "}
      <TextLink href={String(ROUTES.PUBLIC.SCAMS)} className="underline" weight="semibold">
        {t("scamAwarenessCta")}
      </TextLink>
    </Alert>
  );
}

function renderTrackOrderSection(t: HelpTranslateFn, themed: HelpThemedTokens) {
  return (
    <Section className={`${__P.p6} border ${themed.border} ${themed.bgSecondary} flex flex-col sm:flex-row items-center gap-4`} rounded="2xl">
      <Div className="flex-1">
        <Heading level={3} className="mb-1" size="base">{t("trackOrderTitle")}</Heading>
        <Text variant="secondary" size="sm">{t("trackOrderText")}</Text>
      </Div>
      <TextLink href={String(ROUTES.PUBLIC.TRACK_ORDER)} className="flex-shrink-0">{t("trackOrderCta")}</TextLink>
    </Section>
  );
}

function renderContactCtaSection(t: HelpTranslateFn, themed: HelpThemedTokens) {
  return (
    <Section className={`${__P.p8} text-center border ${themed.border} ${themed.bgSecondary}`} rounded="2xl">
      <MessageCircle className="w-10 h-10 mx-auto mb-3 text-primary/70" />
      <Heading level={2} className="mb-3">{t("contactTitle")}</Heading>
      <Text variant="secondary" className="mb-6 max-w-lg mx-auto">{t("contactText")}</Text>
      <Stack gap="sm" className="flex-row flex-wrap justify-center gap-4">
        <TextLink href={String(ROUTES.PUBLIC.CONTACT)}>{t("contactCta")}</TextLink>
        <TextLink href={String(ROUTES.PUBLIC.FAQS)} variant="muted">{t("faqCta")}</TextLink>
      </Stack>
    </Section>
  );
}
