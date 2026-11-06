import { ROUTES } from "../../../constants";
import { Div } from "../../../ui/components/Div";
import { FlowDiagram } from "../../../ui/components/FlowDiagram";
import { Text } from "../../../ui/components/Typography";
import { Row } from "../../../ui/components/Layout";
import { Section } from "../../../ui/components/Semantic";
import type { FlowStep } from "../../../ui/components/FlowDiagram";
import { Package, Clock, Banknote, AlertCircle } from "lucide-react";
import { PolicyCta, PolicyPageView, PolicySteps } from "./PolicyPageView";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

const __P = {
  p5: "p-[var(--appkit-space-5)]",
} as const;


export interface HowPreOrdersWorkViewProps {
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

export async function HowPreOrdersWorkView({
  pageRegionCards = [],
}: HowPreOrdersWorkViewProps = {}) {
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("howPreOrdersWork");

  const STEPS = [
    { number: 1, icon: "🔍", title: t("step1Title"), text: t("step1Text") },
    { number: 2, icon: "📋", title: t("step2Title"), text: t("step2Text") },
    { number: 3, icon: "💳", title: t("step3Title"), text: t("step3Text") },
    { number: 4, icon: "⏳", title: t("step4Title"), text: t("step4Text") },
    { number: 5, icon: "📦", title: t("step5Title"), text: t("step5Text") },
  ];

  const INFO_CARDS = [
    {
      icon: Package,
      title: t("infoCard1Title"),
      text: t("infoCard1Text"),
      color:
        "bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30",
      iconColor: "text-primary",
    },
    {
      icon: Clock,
      title: t("infoCard2Title"),
      text: t("infoCard2Text"),
      color:
        "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      icon: Banknote,
      title: t("infoCard3Title"),
      text: t("infoCard3Text"),
      color:
        "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      icon: AlertCircle,
      title: t("infoCard4Title"),
      text: t("infoCard4Text"),
      color:
        "bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-700",
      iconColor: "text-rose-600 dark:text-rose-400",
    },
  ];

  const DIAGRAM_STEPS: FlowStep[] = [
    {
      emoji: "🔍",
      circleClass:
        "bg-[var(--appkit-color-border-subtle)] border-2 border-[var(--appkit-color-border)]",
      badge: t("step1Title"),
      badgeClass:
        "bg-[var(--appkit-color-border-subtle)] text-[var(--appkit-color-text-muted)]",
      desc: t("diagramStep1Desc"),
    },
    {
      emoji: "💳",
      circleClass:
        "bg-primary/10 dark:bg-primary/15 border-2 border-primary/30 dark:border-primary/40",
      badge: t("step3Title"),
      badgeClass: "bg-primary/10 dark:bg-primary/15 text-primary",
      desc: t("diagramStep2Desc"),
    },
    {
      emoji: "⏳",
      circleClass:
        "bg-amber-100 dark:bg-amber-900/40 border-2 border-amber-300 dark:border-amber-600",
      badge: t("step4Title"),
      badgeClass:
        "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
      desc: t("diagramStep3Desc"),
    },
    {
      emoji: "📦",
      circleClass:
        "bg-sky-100 dark:bg-sky-900/40 border-2 border-sky-300 dark:border-sky-600",
      badge: t("step5Title"),
      badgeClass:
        "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",
      desc: t("diagramStep4Desc"),
    },
    {
      emoji: "🎉",
      circleClass:
        "bg-emerald-100 dark:bg-emerald-900/40 border-2 border-emerald-400 dark:border-emerald-600",
      badge: t("diagramStep5Badge"),
      badgeClass:
        "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
      desc: t("diagramStep5Desc"),
    },
  ];

  return (
    <PolicyPageView
      pageId="how-pre-orders-work"
      pageRegionCards={pageRegionCards}
      title={t("title")}
      subtitle={t("subtitle")}
      containerSize="md"
    >
      <PolicySteps title={t("stepsTitle")} items={STEPS} />
      <Section>
        <FlowDiagram title={`📋 ${t("diagramTitle")}`} titleClass="text-primary" connectorClass="bg-primary/20 dark:bg-primary/30" steps={DIAGRAM_STEPS} centered />
      </Section>
      {renderPreOrdersInfoCardsSection(INFO_CARDS)}
      <PolicyCta
        title={t("ctaTitle")}
        text={t("ctaText")}
        primary={{ label: t("ctaBrowse"), href: String(ROUTES.PUBLIC.PRE_ORDERS) }}
        secondary={{ label: t("ctaOrders"), href: String(ROUTES.PUBLIC.HOW_ORDERS_WORK) }}
      />
    </PolicyPageView>
  );
}

type PreOrdersInfoCard = { icon: any; title: string; text: string; color: string; iconColor: string };

function renderPreOrdersInfoCardsSection(cards: PreOrdersInfoCard[]) {
  return (
    <Section>
      <Div layout="grid" gap="5" className="md:grid-cols-2">
        {cards.map(({ icon: Icon, title, text, color, iconColor }) => (
          <Div key={title} className={`border ${__P.p5} ${color}`} rounded="xl">
            <Row align="center" justify="center" className={`w-10 h-10 mb-3`} surface="default" rounded="lg">
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </Row>
            <Text className="mb-1" weight="semibold">{title}</Text>
            <Text variant="secondary" className="leading-relaxed" size="sm">{text}</Text>
          </Div>
        ))}
      </Div>
    </Section>
  );
}
