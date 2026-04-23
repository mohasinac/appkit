import { ROUTES } from "../../../constants";
import { THEME_CONSTANTS } from "../../../tokens";
import { Heading, Text, Section, Stack, FlowDiagram } from "../../../ui";
import type { FlowStep } from "../../../ui";
import { TextLink } from "../../../ui";
import { getTranslations } from "next-intl/server";

const DEFAULT_HERO_CLASS =
  "bg-gradient-to-br from-violet-700 to-indigo-700 dark:from-violet-800 dark:to-indigo-800";

export interface HowOffersWorkViewProps {
  heroBannerClass?: string;
}

export async function HowOffersWorkView({
  heroBannerClass = DEFAULT_HERO_CLASS,
}: HowOffersWorkViewProps = {}) {
  const { themed, flex, page } = THEME_CONSTANTS;
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
    <div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10" data-section="howoffersworkview-div-135">
      {/* Hero */}
      <Section
        className={`${heroBannerClass} text-white py-14 md:py-16 lg:py-20`}
      >
        <div className={`${page.container.md} text-center`} data-section="howoffersworkview-div-136">
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
       data-section="howoffersworkview-div-137">
        {/* Steps */}
        <Section>
          <Heading level={2} className="mb-8 text-center">
            {t("stepsTitle")}
          </Heading>
          <Stack gap="md" className="gap-5">
            {STEPS.map(({ number, icon, title, text }) => (
              <div
                key={number}
                className={`flex items-start gap-4 p-5 rounded-xl border ${themed.border} ${themed.bgPrimary}`}
               data-section="howoffersworkview-div-138">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/15 ${flex.center} text-xl`}
                 data-section="howoffersworkview-div-139">
                  {icon}
                </div>
                <div data-section="howoffersworkview-div-140">
                  <Text className="font-semibold mb-0.5">
                    {number}. {title}
                  </Text>
                  <Text variant="secondary" className="text-sm leading-relaxed">
                    {text}
                  </Text>
                </div>
              </div>
            ))}
          </Stack>
        </Section>

        {/* Flow diagram */}
        <Section>
          <FlowDiagram
            title={`🤝 ${t("diagramTitle")}`}
            titleClass="text-primary"
            connectorClass="bg-primary/20 dark:bg-primary/30"
            steps={DIAGRAM_STEPS}
            centered
          />
        </Section>

        {/* Rules */}
        <Section
          className={`rounded-2xl border ${themed.border} ${themed.bgSecondary} p-6`}
        >
          <Heading level={2} className="mb-4">
            {t("rulesTitle")}
          </Heading>
          <ul className="space-y-2">
            {RULES.map((rule) => (
              <li key={rule} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">•</span>
                <Text variant="secondary">{rule}</Text>
              </li>
            ))}
          </ul>
        </Section>

        {/* CTA */}
        <Section
          className={`rounded-2xl p-8 text-center ${themed.bgSecondary} border ${themed.border}`}
        >
          <Heading level={2} className="mb-3">
            {t("ctaTitle")}
          </Heading>
          <Text variant="secondary" className="mb-6 max-w-lg mx-auto">
            {t("ctaText")}
          </Text>
          <div className={`${flex.center} gap-4 flex-wrap`} data-section="howoffersworkview-div-141">
            <TextLink href={String(ROUTES.PUBLIC.PRODUCTS)}>
              {t("ctaBrowse")}
            </TextLink>
            <TextLink
              href={String(ROUTES.PUBLIC.HOW_ORDERS_WORK)}
              variant="muted"
            >
              {t("ctaOrders")}
            </TextLink>
          </div>
        </Section>
      </div>
    </div>
  );
}
