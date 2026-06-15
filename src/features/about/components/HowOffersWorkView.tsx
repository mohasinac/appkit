import { ROUTES } from "../../../constants";
import { THEME_CONSTANTS } from "../../../tokens";
import { Div, FlowDiagram, Heading, Li, Row, Section, Span, Stack, Text, Ul } from "../../../ui";
import type { FlowStep } from "../../../ui";
import { TextLink } from "../../../ui";

const __P = {
  p5: "p-5",
  p6: "p-6",
  p8: "p-8",
} as const;
const DEFAULT_HERO_CLASS =
  "bg-gradient-to-br from-violet-700 to-indigo-700 dark:from-violet-800 dark:to-indigo-800";

export interface HowOffersWorkViewProps {
  heroBannerClass?: string;
}

export async function HowOffersWorkView({
  heroBannerClass = DEFAULT_HERO_CLASS,
}: HowOffersWorkViewProps = {}) {
  const { themed, flex, page } = THEME_CONSTANTS;
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("howOffersWork");

  const STEPS = [
    { number: 1, icon: "🔍", title: t("step1Title"), text: t("step1Text") },
    { number: 2, icon: "💬", title: t("step2Title"), text: t("step2Text") },
    { number: 3, icon: "🤝", title: t("step3Title"), text: t("step3Text") },
    { number: 4, icon: "💳", title: t("step4Title"), text: t("step4Text") },
    { number: 5, icon: "📦", title: t("step5Title"), text: t("step5Text") },
    { number: 6, icon: "⭐", title: t("step6Title"), text: t("step6Text") },
  ];

  const RULES = [t("rule1"), t("rule2"), t("rule3"), t("rule4"), t("rule5")];

  const DIAGRAM_STEPS: FlowStep[] = [
    {
      emoji: "💬",
      circleClass:
        "bg-slate-100 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-500",
      badge: t("diagramStep1Badge"),
      badgeClass:
        "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
      desc: t("diagramStep1Desc"),
    },
    {
      emoji: "📩",
      circleClass:
        "bg-amber-100 dark:bg-amber-900/40 border-2 border-amber-300 dark:border-amber-600",
      badge: t("diagramStep2Badge"),
      badgeClass:
        "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
      desc: t("diagramStep2Desc"),
    },
    {
      emoji: "✅",
      circleClass:
        "bg-emerald-100 dark:bg-emerald-900/40 border-2 border-emerald-400 dark:border-emerald-600",
      badge: t("diagramStep3Badge"),
      badgeClass:
        "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
      desc: t("diagramStep3Desc"),
    },
    {
      emoji: "💳",
      circleClass:
        "bg-primary/10 dark:bg-primary/15 border-2 border-primary/30 dark:border-primary/40",
      badge: t("diagramStep4Badge"),
      badgeClass: "bg-primary/10 dark:bg-primary/15 text-primary",
      desc: t("diagramStep4Desc"),
    },
    {
      emoji: "📦",
      circleClass:
        "bg-sky-100 dark:bg-sky-900/40 border-2 border-sky-300 dark:border-sky-600",
      badge: t("diagramStep5Badge"),
      badgeClass:
        "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",
      desc: t("diagramStep5Desc"),
    },
  ];

  return (
    <Div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10">
      <Section className={`${heroBannerClass} text-white py-14 md:py-16 lg:py-20`}>
        <Div className={`${page.container.md} text-center`}>
          <Heading level={1} variant="none" className="mb-4 text-white">{t("title")}</Heading>
          <Text variant="none" className="text-white/80 max-w-2xl mx-auto">{t("subtitle")}</Text>
        </Div>
      </Section>
      <Div className={`${page.container.md} md:py-12 lg:py-16 space-y-14`} padding="y-2xl">
        {renderOffersStepsSection(t, themed, flex, STEPS)}
        <Section>
          <FlowDiagram title={`🤝 ${t("diagramTitle")}`} titleClass="text-primary" connectorClass="bg-primary/20 dark:bg-primary/30" steps={DIAGRAM_STEPS} centered />
        </Section>
        {renderOffersRulesSection(t, themed, RULES)}
        {renderOffersCtaSection(t, themed, flex)}
      </Div>
    </Div>
  );
}

type OffersT = Awaited<ReturnType<typeof import("next-intl/server").getTranslations>>;
type OffersStep = { number: number; icon: string; title: string; text: string };

function renderOffersStepsSection(t: OffersT, themed: (typeof THEME_CONSTANTS)["themed"], flex: (typeof THEME_CONSTANTS)["flex"], steps: OffersStep[]) {
  return (
    <Section>
      <Heading level={2} className="mb-8" align="center">{t("stepsTitle")}</Heading>
      <Stack gap="5">
        {steps.map(({ number, icon, title, text }) => (
          <Row key={number} className={`${__P.p5} border ${themed.border} ${themed.bgPrimary}`} align="start" gap="md" rounded="xl">
            <Div className={`flex-shrink-0 w-10 h-10 bg-primary/10 dark:bg-primary/15 ${flex.center}`} rounded="full">{icon}</Div>
            <Div>
              <Text className="mb-0.5" weight="semibold">{number}. {title}</Text>
              <Text variant="secondary" className="leading-relaxed" size="sm">{text}</Text>
            </Div>
          </Row>
        ))}
      </Stack>
    </Section>
  );
}

function renderOffersRulesSection(t: OffersT, themed: (typeof THEME_CONSTANTS)["themed"], rules: string[]) {
  return (
    <Section className={`border ${themed.border} ${themed.bgSecondary} ${__P.p6}`} rounded="2xl">
      <Heading level={2} className="mb-4">{t("rulesTitle")}</Heading>
      <Ul className="space-y-2">
        {rules.map((rule) => (
          <Li key={rule} className="flex items-start gap-2 text-sm">
            <Span color="primary" className="mt-0.5">•</Span>
            <Text variant="secondary">{rule}</Text>
          </Li>
        ))}
      </Ul>
    </Section>
  );
}

function renderOffersCtaSection(t: OffersT, themed: (typeof THEME_CONSTANTS)["themed"], flex: (typeof THEME_CONSTANTS)["flex"]) {
  return (
    <Section className={`${__P.p8} text-center ${themed.bgSecondary} border ${themed.border}`} rounded="2xl">
      <Heading level={2} className="mb-3">{t("ctaTitle")}</Heading>
      <Text variant="secondary" className="mb-6 max-w-lg mx-auto">{t("ctaText")}</Text>
      <Div className={`${flex.center} gap-4 flex-wrap`}>
        <TextLink href={String(ROUTES.PUBLIC.PRODUCTS)}>{t("ctaBrowse")}</TextLink>
        <TextLink href={String(ROUTES.PUBLIC.HOW_ORDERS_WORK)} variant="muted">{t("ctaOrders")}</TextLink>
      </Div>
    </Section>
  );
}
