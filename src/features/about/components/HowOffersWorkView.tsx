import { ROUTES } from "../../../constants";
import { Div } from "../../../ui/components/Div";
import { FlowDiagram } from "../../../ui/components/FlowDiagram";
import { Heading, Span, Text } from "../../../ui/components/Typography";
import { Li, Section, Ul } from "../../../ui/components/Semantic";
import type { FlowStep } from "../../../ui/components/FlowDiagram";
import { PolicyCta, PolicyPageView, PolicySteps } from "./PolicyPageView";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

const __P = {
  p6: "p-[var(--appkit-space-6)]",
} as const;

export interface HowOffersWorkViewProps {
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

export async function HowOffersWorkView({
  pageRegionCards = [],
}: HowOffersWorkViewProps = {}) {
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
        "bg-[var(--appkit-color-border-subtle)] border-2 border-[var(--appkit-color-border)]",
      badge: t("diagramStep1Badge"),
      badgeClass:
        "bg-[var(--appkit-color-border-subtle)] text-[var(--appkit-color-text-muted)]",
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
    <PolicyPageView
      pageId="how-offers-work"
      pageRegionCards={pageRegionCards}
      title={t("title")}
      subtitle={t("subtitle")}
      containerSize="md"
    >
      <PolicySteps title={t("stepsTitle")} items={STEPS} />
      <Section>
        <FlowDiagram title={`🤝 ${t("diagramTitle")}`} titleClass="text-primary" connectorClass="bg-primary/20 dark:bg-primary/30" steps={DIAGRAM_STEPS} centered />
      </Section>
      {renderOffersRulesSection(t, RULES)}
      <PolicyCta
        title={t("ctaTitle")}
        text={t("ctaText")}
        primary={{ label: t("ctaBrowse"), href: String(ROUTES.PUBLIC.PRODUCTS) }}
        secondary={{ label: t("ctaOrders"), href: String(ROUTES.PUBLIC.HOW_ORDERS_WORK) }}
      />
    </PolicyPageView>
  );
}

type OffersT = Awaited<ReturnType<typeof import("next-intl/server").getTranslations>>;

function renderOffersRulesSection(t: OffersT, rules: string[]) {
  return (
    <Section className={`${__P.p6}`} border="default" surface="subtle" rounded="2xl">
      <Heading level={2} className="mb-4">{t("rulesTitle")}</Heading>
      <Ul spacing="comfortable">
        {rules.map((rule) => (
          <Li key={rule} layout="flex-start" gap="2" textSize="sm">
            <Span color="primary" className="mt-0.5">•</Span>
            <Text variant="secondary">{rule}</Text>
          </Li>
        ))}
      </Ul>
    </Section>
  );
}
