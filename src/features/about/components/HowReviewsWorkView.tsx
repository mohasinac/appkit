import { ROUTES } from "../../../constants";
import { THEME_CONSTANTS } from "../../../tokens";
import { Div, FlowDiagram, Heading, Row, Section, Stack, Text } from "../../../ui";
import type { FlowStep } from "../../../ui";
import { TextLink } from "../../../ui";
import { ShieldCheck, ThumbsUp, Pencil } from "lucide-react";

const __P = {
  p5: "p-5",
  p8: "p-8",
} as const;


export interface HowReviewsWorkViewProps {
}

export async function HowReviewsWorkView({
}: HowReviewsWorkViewProps = {}) {
  const { themed, flex, page } = THEME_CONSTANTS;
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("howReviewsWork");

  const STEPS = [
    { number: 1, icon: "📦", title: t("step1Title"), text: t("step1Text") },
    { number: 2, icon: "⭐", title: t("step2Title"), text: t("step2Text") },
    { number: 3, icon: "✍️", title: t("step3Title"), text: t("step3Text") },
    { number: 4, icon: "🌟", title: t("step4Title"), text: t("step4Text") },
  ];

  const INFO_CARDS = [
    {
      icon: ShieldCheck,
      title: t("infoCard1Title"),
      text: t("infoCard1Text"),
      color:
        "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      icon: ThumbsUp,
      title: t("infoCard2Title"),
      text: t("infoCard2Text"),
      color: "bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-700",
      iconColor: "text-sky-600 dark:text-sky-400",
    },
    {
      icon: Pencil,
      title: t("infoCard3Title"),
      text: t("infoCard3Text"),
      color:
        "bg-violet-50 border-violet-200 dark:bg-violet-900/20 dark:border-violet-700",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
  ];

  const DIAGRAM_STEPS: FlowStep[] = [
    {
      emoji: "📦",
      circleClass:
        "bg-slate-100 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-500",
      badge: t("diagramStep1Badge"),
      badgeClass:
        "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
      desc: t("diagramStep1Desc"),
    },
    {
      emoji: "✉️",
      circleClass:
        "bg-primary/10 dark:bg-primary/15 border-2 border-primary/30 dark:border-primary/40",
      badge: t("diagramStep2Badge"),
      badgeClass: "bg-primary/10 dark:bg-primary/15 text-primary",
      desc: t("diagramStep2Desc"),
    },
    {
      emoji: "⭐",
      circleClass:
        "bg-amber-100 dark:bg-amber-900/40 border-2 border-amber-300 dark:border-amber-600",
      badge: t("diagramStep3Badge"),
      badgeClass:
        "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
      desc: t("diagramStep3Desc"),
    },
    {
      emoji: "🌟",
      circleClass:
        "bg-emerald-100 dark:bg-emerald-900/40 border-2 border-emerald-400 dark:border-emerald-600",
      badge: t("diagramStep4Badge"),
      badgeClass:
        "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
      desc: t("diagramStep4Desc"),
    },
  ];

  return (
    <Div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10">
      <Section color="inverse" tone="accent-banner" padding="banner">
        <Div className={`${page.container.md} text-center`}>
          <Heading color="inverse" level={1} variant="none" className="mb-4">{t("title")}</Heading>
          <Text color="inverse" variant="none" className="/80 max-w-2xl mx-auto">{t("subtitle")}</Text>
        </Div>
      </Section>
      <Stack gap="14" className={`${page.container.md}`} padding="content-banner">
        {renderReviewsStepsSection(t, themed, flex, STEPS)}
        <Section>
          <FlowDiagram title={`⭐ ${t("diagramTitle")}`} titleClass="text-primary" connectorClass="bg-primary/20 dark:bg-primary/30" steps={DIAGRAM_STEPS} centered />
        </Section>
        {renderReviewsInfoCardsSection(flex, INFO_CARDS)}
        {renderReviewsCtaSection(t, themed, flex)}
      </Stack>
    </Div>
  );
}

type ReviewsT = Awaited<ReturnType<typeof import("next-intl/server").getTranslations>>;
 
type ReviewsInfoCard = { icon: any; title: string; text: string; color: string; iconColor: string };
type ReviewsStep = { number: number; icon: string; title: string; text: string };

function renderReviewsStepsSection(t: ReviewsT, themed: (typeof THEME_CONSTANTS)["themed"], flex: (typeof THEME_CONSTANTS)["flex"], steps: ReviewsStep[]) {
  return (
    <Section>
      <Heading level={2} className="mb-8" align="center">{t("stepsTitle")}</Heading>
      <Stack gap="5">
        {steps.map(({ number, icon, title, text }) => (
          <Row key={number} className={`${__P.p5}`} border="default" surface="muted" align="start" gap="md" rounded="xl">
            <Row align="center" justify="center" className={`flex-shrink-0 w-10 h-10 bg-primary/10 dark:bg-primary/15`} rounded="full">{icon}</Row>
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

function renderReviewsInfoCardsSection(flex: (typeof THEME_CONSTANTS)["flex"], cards: ReviewsInfoCard[]) {
  return (
    <Section>
      <Div layout="grid" gap="5" className="md:grid-cols-3">
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

function renderReviewsCtaSection(t: ReviewsT, themed: (typeof THEME_CONSTANTS)["themed"], flex: (typeof THEME_CONSTANTS)["flex"]) {
  return (
    <Section className={`${__P.p8} text-center`} border="default" surface="subtle" rounded="2xl">
      <Heading level={2} className="mb-3">{t("ctaTitle")}</Heading>
      <Text variant="secondary" className="mb-6 max-w-lg mx-auto">{t("ctaText")}</Text>
      <Row align="center" justify="center" gap="md" wrap >
        <TextLink href={String(ROUTES.USER.ORDERS)}>{t("ctaOrders")}</TextLink>
        <TextLink href={String(ROUTES.PUBLIC.HOW_ORDERS_WORK)} variant="muted">{t("ctaHowOrders")}</TextLink>
      </Row>
    </Section>
  );
}
