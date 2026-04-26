import { ROUTES } from "../../../constants";
import { THEME_CONSTANTS } from "../../../tokens";
import { Heading, Text, Section, Stack } from "../../../ui";
import { TextLink } from "../../../ui";
import {
  BookOpen,
  MessageCircle,
  ShoppingBag,
  Truck,
  CreditCard,
  Store,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

const DEFAULT_HERO_CLASS =
  "bg-gradient-to-br from-violet-700 to-indigo-700 dark:from-violet-800 dark:to-indigo-800";

export interface HelpPageViewProps {
  heroBannerClass?: string;
}

export async function HelpPageView({
  heroBannerClass = DEFAULT_HERO_CLASS,
}: HelpPageViewProps = {}) {
  const { themed, flex, page } = THEME_CONSTANTS;
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("helpPage");

  const TOPICS = [
    {
      icon: ShoppingBag,
      title: t("topicBuying"),
      desc: t("topicBuyingDesc"),
      href: String(ROUTES.PUBLIC.HOW_ORDERS_WORK),
      color:
        "bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30",
      iconColor: "text-primary",
    },
    {
      icon: Truck,
      title: t("topicShipping"),
      desc: t("topicShippingDesc"),
      href: String(ROUTES.PUBLIC.SHIPPING_POLICY),
      color: "bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-700",
      iconColor: "text-sky-600 dark:text-sky-400",
    },
    {
      icon: CreditCard,
      title: t("topicPayment"),
      desc: t("topicPaymentDesc"),
      href: String(ROUTES.PUBLIC.HOW_CHECKOUT_WORKS),
      color:
        "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      icon: Store,
      title: t("topicSelling"),
      desc: t("topicSellingDesc"),
      href: String(ROUTES.PUBLIC.SELLER_GUIDE),
      color:
        "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      icon: BookOpen,
      title: t("topicFAQs"),
      desc: t("topicFAQsDesc"),
      href: String(ROUTES.PUBLIC.FAQS),
      color:
        "bg-violet-50 border-violet-200 dark:bg-violet-900/20 dark:border-violet-700",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
    {
      icon: ShieldCheck,
      title: t("topicSecurity"),
      desc: t("topicSecurityDesc"),
      href: String(ROUTES.PUBLIC.SECURITY),
      color:
        "bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-700",
      iconColor: "text-rose-600 dark:text-rose-400",
    },
  ];

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10" data-section="helppageview-div-107">
      {/* Hero */}
      <Section
        className={`${heroBannerClass} text-white py-14 md:py-16 lg:py-20`}
      >
        <div className={`${page.container.md} text-center`} data-section="helppageview-div-108">
          <Heading level={1} variant="none" className="mb-4 text-white">
            {t("title")}
          </Heading>
          <Text variant="none" className="text-white/80 max-w-2xl mx-auto">
            {t("subtitle")}
          </Text>
        </div>
      </Section>

      <div
        className={`${page.container.md} py-10 md:py-12 lg:py-16 space-y-14`}
       data-section="helppageview-div-109">
        {/* Topic cards */}
        <Section>
          <Heading level={2} className="mb-6 text-center">
            {t("browseTopics")}
          </Heading>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-section="helppageview-div-110">
            {TOPICS.map(
              ({ icon: Icon, title, desc, href, color, iconColor }) => (
                <TextLink
                  key={href}
                  href={href}
                  className={`group rounded-xl border p-5 transition-shadow hover:shadow-md ${color} no-underline`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg bg-white/60 dark:bg-white/10 ${flex.center} mb-3`}
                   data-section="helppageview-div-111">
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div className={`${flex.row} justify-between items-start`} data-section="helppageview-div-112">
                    <div data-section="helppageview-div-113">
                      <Text className="font-semibold mb-1">{title}</Text>
                      <Text
                        variant="secondary"
                        className="text-sm leading-relaxed"
                      >
                        {desc}
                      </Text>
                    </div>
                    <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0 opacity-40 group-hover:opacity-80 transition-opacity" />
                  </div>
                </TextLink>
              ),
            )}
          </div>
        </Section>

        {/* Track order */}
        <Section
          className={`rounded-2xl p-6 border ${themed.border} ${themed.bgSecondary} flex flex-col sm:flex-row items-center gap-4`}
        >
          <div className="flex-1" data-section="helppageview-div-114">
            <Heading level={3} className="mb-1 text-base">
              {t("trackOrderTitle")}
            </Heading>
            <Text variant="secondary" className="text-sm">
              {t("trackOrderText")}
            </Text>
          </div>
          <TextLink
            href={String(ROUTES.PUBLIC.TRACK_ORDER)}
            className="flex-shrink-0"
          >
            {t("trackOrderCta")}
          </TextLink>
        </Section>

        {/* Still need help */}
        <Section
          className={`rounded-2xl p-8 text-center border ${themed.border} ${themed.bgSecondary}`}
        >
          <MessageCircle className="w-10 h-10 mx-auto mb-3 text-primary/70" />
          <Heading level={2} className="mb-3">
            {t("contactTitle")}
          </Heading>
          <Text variant="secondary" className="mb-6 max-w-lg mx-auto">
            {t("contactText")}
          </Text>
          <Stack gap="sm" className="flex-row flex-wrap justify-center gap-4">
            <TextLink href={String(ROUTES.PUBLIC.CONTACT)}>
              {t("contactCta")}
            </TextLink>
            <TextLink href={String(ROUTES.PUBLIC.FAQS)} variant="muted">
              {t("faqCta")}
            </TextLink>
          </Stack>
        </Section>
      </div>
    </div>
  );
}
