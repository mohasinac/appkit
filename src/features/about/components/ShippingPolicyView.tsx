import { ROUTES } from "../../../constants";
import { THEME_CONSTANTS } from "../../../tokens";
import { Div, Heading, Text, Section, Stack, FlowDiagram } from "../../../ui";
import type { FlowStep } from "../../../ui";
import { TextLink } from "../../../ui";

const CLS_FOOTER_LINK = "text-sky-600 dark:text-sky-400 hover:underline";

export interface ShippingPolicyViewProps {
}

export async function ShippingPolicyView({
}: ShippingPolicyViewProps = {}) {
  const { themed, page } = THEME_CONSTANTS;
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("shippingPolicy");

  const SECTIONS = [
    { title: t("orderProcessTitle"), text: t("orderProcessText") },
    { title: t("standardTitle"), text: t("standardText") },
    { title: t("expressTitle"), text: t("expressText") },
    { title: t("freeShippingTitle"), text: t("freeShippingText") },
    { title: t("auctionShippingTitle"), text: t("auctionShippingText") },
    { title: t("trackingTitle"), text: t("trackingText") },
    { title: t("internationalTitle"), text: t("internationalText") },
    { title: t("damagedTitle"), text: t("damagedText") },
  ];

  const DIAGRAM_STEPS: FlowStep[] = [
    {
      emoji: "✅",
      circleClass:
        "bg-primary/10 dark:bg-primary/15 border-2 border-primary/30 dark:border-primary/40",
      badge: t("diagramStatus1"),
      badgeClass: "bg-primary/10 dark:bg-primary/15 text-primary",
      desc: t("diagramStatus1Desc"),
    },
    {
      emoji: "📦",
      circleClass:
        "bg-amber-100 dark:bg-amber-900/40 border-2 border-amber-300 dark:border-amber-600",
      badge: t("diagramStatus2"),
      badgeClass:
        "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
      desc: t("diagramStatus2Desc"),
    },
    {
      emoji: "🚀",
      circleClass:
        "bg-sky-100 dark:bg-sky-900/40 border-2 border-sky-300 dark:border-sky-600",
      badge: t("diagramStatus3"),
      badgeClass:
        "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",
      desc: t("diagramStatus3Desc"),
    },
    {
      emoji: "🚚",
      circleClass:
        "bg-violet-100 dark:bg-violet-900/40 border-2 border-violet-300 dark:border-violet-600",
      badge: t("diagramStatus4"),
      badgeClass:
        "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
      desc: t("diagramStatus4Desc"),
    },
    {
      emoji: "🏠",
      circleClass:
        "bg-emerald-100 dark:bg-emerald-900/40 border-2 border-emerald-400 dark:border-emerald-600",
      badge: t("diagramStatus5"),
      badgeClass:
        "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
      desc: t("diagramStatus5Desc"),
    },
  ];

  return (
    <Div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10">
      {/* Header */}
      <Section
        tone="accent-banner" className="text-white md:py-16 lg:py-20" padding="y-2-5xl"
      >
        <Div className={`${page.container.sm}`}>
          <Heading color="inverse" level={1} variant="none" className="mb-3">
            {t("title")}
          </Heading>
          <Text color="inverse" variant="none" className="/80">
            {t("lastUpdated")}
          </Text>
        </Div>
      </Section>

      <Div className={`${page.container.sm} md:py-12 lg:py-16`} padding="y-2xl">
        <Text size="lg" variant="secondary" className="mb-8">
          {t("subtitle")}
        </Text>

        <FlowDiagram
          title={`🚚 ${t("diagramTitle")}`}
          titleClass="text-sky-700 dark:text-sky-300"
          connectorClass="bg-sky-200 dark:bg-sky-800"
          steps={DIAGRAM_STEPS}
          className="mb-10"
          note={`📌 ${t("diagramNote")}`}
        />

        <Stack gap="xl">
          {SECTIONS.map(({ title, text }) => (
            <Section key={title}>
              <Heading level={2} className="mb-3">
                {title}
              </Heading>
              <Text variant="secondary" className="leading-relaxed">
                {text}
              </Text>
            </Section>
          ))}

          {/* Contact */}
          <Section rounded="xl" padding="lg" border="default" surface="subtle">
            <Heading level={2} className="mb-2">
              {t("contactTitle")}
            </Heading>
            <Text variant="secondary">{t("contactText")}</Text>
          </Section>
        </Stack>

        <Div className={`mt-12 border-t flex gap-6 text-sm`} border="default" padding="t-xl">
          <TextLink
            href={String(ROUTES.PUBLIC.TRACK_ORDER)}
            className={CLS_FOOTER_LINK}
          >
            {t("trackOrder")}
          </TextLink>
          <TextLink
            href={String(ROUTES.PUBLIC.HELP)}
            className={CLS_FOOTER_LINK}
          >
            {t("helpCenter")}
          </TextLink>
          <TextLink
            href={String(ROUTES.PUBLIC.CONTACT)}
            className={CLS_FOOTER_LINK}
          >
            {t("contactUs")}
          </TextLink>
          <TextLink
            href={String(ROUTES.PUBLIC.REFUND_POLICY)}
            className={CLS_FOOTER_LINK}
          >
            Refund Policy
          </TextLink>
        </Div>
      </Div>
    </Div>
  );
}
