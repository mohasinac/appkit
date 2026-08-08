import { ROUTES } from "../../../constants";
import { PAGE_CONTAINER } from "../../../_internal/shared/styles/page";
import { THEMED_BG_PRIMARY, THEMED_BG_SECONDARY } from "../../../_internal/shared/styles/themed";
import { Alert, Caption, Div, FlowDiagram, Heading, Row, Section, Stack, Table, Tbody, Td, Text, Th, Thead, Tr } from "../../../ui";
import type { FlowStep } from "../../../ui";
import { TextLink } from "../../../ui";
import { CalendarClock, Wallet, TrendingUp, ShieldCheck } from "lucide-react";

const __P = {
  p5: "p-5",
  p8: "p-8",
} as const;

const __O = {
  xAuto: "overflow-x-auto",
} as const;

export interface HowEmiWorksViewProps {
}

export async function HowEmiWorksView({
}: HowEmiWorksViewProps = {}) {
  const page = { container: PAGE_CONTAINER };
  const themed = { bgPrimary: THEMED_BG_PRIMARY, bgSecondary: THEMED_BG_SECONDARY };
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("howEmiWorks");

  const STEPS = [
    { number: 1, icon: "🛒", title: t("step1Title"), text: t("step1Text") },
    { number: 2, icon: "✅", title: t("step2Title"), text: t("step2Text") },
    { number: 3, icon: "💳", title: t("step3Title"), text: t("step3Text") },
    { number: 4, icon: "📅", title: t("step4Title"), text: t("step4Text") },
    { number: 5, icon: "🎉", title: t("step5Title"), text: t("step5Text") },
  ];

  const INFO_CARDS = [
    {
      icon: Wallet,
      title: t("infoCard1Title"),
      text: t("infoCard1Text"),
      color: "bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30",
      iconColor: "text-primary",
    },
    {
      icon: CalendarClock,
      title: t("infoCard2Title"),
      text: t("infoCard2Text"),
      color: "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      icon: TrendingUp,
      title: t("infoCard3Title"),
      text: t("infoCard3Text"),
      color: "bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-700",
      iconColor: "text-sky-600 dark:text-sky-400",
    },
    {
      icon: ShieldCheck,
      title: t("infoCard4Title"),
      text: t("infoCard4Text"),
      color: "bg-violet-50 border-violet-200 dark:bg-violet-900/20 dark:border-violet-700",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
  ];

  const EXAMPLE_ROWS = [
    { label: t("exampleOrderTotal"), example: "₹15,000" },
    { label: `${t("exampleToken")} (10%)`, example: "− ₹1,500" },
    { label: t("exampleRemaining"), example: "= ₹13,500" },
    { label: `${t("exampleSurcharge")} (1%/mo × 3mo)`, example: "+ ₹405" },
    { label: t("exampleMonthly"), example: "₹4,635 × 3", highlight: true },
  ];

  const DIAGRAM_STEPS: FlowStep[] = [
    {
      emoji: "🛒",
      circleClass: "bg-[var(--appkit-color-border-subtle)] border-2 border-[var(--appkit-color-border)]",
      badge: t("step1Title"),
      badgeClass: "bg-[var(--appkit-color-border-subtle)] text-[var(--appkit-color-text-muted)]",
      desc: t("diagramStep1Desc"),
    },
    {
      emoji: "✅",
      circleClass: "bg-primary/10 dark:bg-primary/15 border-2 border-primary/30 dark:border-primary/40",
      badge: t("step2Title"),
      badgeClass: "bg-primary/10 dark:bg-primary/15 text-primary",
      desc: t("diagramStep2Desc"),
    },
    {
      emoji: "💳",
      circleClass: "bg-violet-100 dark:bg-violet-900/40 border-2 border-violet-400 dark:border-violet-600",
      badge: t("step3Title"),
      badgeClass: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
      desc: t("diagramStep3Desc"),
    },
    {
      emoji: "📅",
      circleClass: "bg-amber-100 dark:bg-amber-900/40 border-2 border-amber-300 dark:border-amber-600",
      badge: t("step4Title"),
      badgeClass: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
      desc: t("diagramStep4Desc"),
    },
    {
      emoji: "🎉",
      circleClass: "bg-emerald-100 dark:bg-emerald-900/40 border-2 border-emerald-400 dark:border-emerald-600",
      badge: t("step5Title"),
      badgeClass: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
      desc: t("diagramStep5Desc"),
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
        {renderEligibilityAlert(t)}
        {renderEmiSteps(t, STEPS)}
        <Section>
          <FlowDiagram title={`💳 ${t("diagramTitle")}`} titleClass="text-primary" connectorClass="bg-primary/20 dark:bg-primary/30" steps={DIAGRAM_STEPS} centered />
        </Section>
        {renderEmiInfoCards(INFO_CARDS)}
        {renderEmiExample(t, themed, EXAMPLE_ROWS)}
        {renderEmiCta(t)}
      </Stack>
    </Div>
  );
}

type EmiT = Awaited<ReturnType<typeof import("next-intl/server").getTranslations>>;
type ThemedTokens = { bgPrimary: string; bgSecondary: string };
type EmiInfoCard = { icon: any; title: string; text: string; color: string; iconColor: string };
type EmiStep = { number: number; icon: string; title: string; text: string };
type EmiExampleRow = { label: string; example: string; highlight?: boolean };

function renderEligibilityAlert(t: EmiT) {
  return (
    <Alert variant="info" title={t("eligibilityTitle")}>
      {t("eligibilityText")}
    </Alert>
  );
}

function renderEmiSteps(t: EmiT, steps: EmiStep[]) {
  return (
    <Section>
      <Heading level={2} className="mb-8" align="center">{t("stepsTitle")}</Heading>
      <Stack gap="5">
        {steps.map(({ number, icon, title, text }) => (
          <Row key={number} className={`${__P.p5}`} border="default" surface="muted" align="start" gap="md" rounded="xl">
            <Row align="center" justify="center" className="flex-shrink-0 w-10 h-10 bg-primary/10 dark:bg-primary/15" rounded="full">{icon}</Row>
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

function renderEmiInfoCards(cards: EmiInfoCard[]) {
  return (
    <Section>
      <Div layout="grid" gap="5" className="md:grid-cols-2">
        {cards.map(({ icon: Icon, title, text, color, iconColor }) => (
          <Div key={title} className={`border ${__P.p5} ${color}`} rounded="xl">
            <Row align="center" justify="center" className="w-10 h-10 mb-3" surface="default" rounded="lg">
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

function renderEmiExample(t: EmiT, themed: ThemedTokens, rows: EmiExampleRow[]) {
  return (
    <Section>
      <Heading level={2} className="mb-3" align="center">{t("exampleTitle")}</Heading>
      <Text variant="secondary" className="mb-8 max-w-xl mx-auto" align="center">{t("exampleSubtitle")}</Text>
      <Div className={`${__O.xAuto}`} border="default" rounded="xl">
        <Table size="sm">
          <Thead className={themed.bgSecondary}>
            <Tr>
              <Th className="text-left" padding="md" weight="semibold">{t("exampleColLine")}</Th>
              <Th className="text-right" padding="md" weight="semibold">{t("exampleColAmount")}</Th>
            </Tr>
          </Thead>
          <Tbody className="divide-y divide-neutral-100 divide-[var(--appkit-color-border)]">
            {rows.map((row, i) => (
              <Tr key={i} className={themed.bgPrimary}>
                <Td padding="md" weight={row.highlight ? "bold" : "medium"}>{row.label}</Td>
                <Td className={`text-right ${row.highlight ? "text-primary" : ""}`} padding="md">{row.example}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Div>
      <Caption className="mt-3 block" color="muted">{t("exampleNote")}</Caption>
    </Section>
  );
}

function renderEmiCta(t: EmiT) {
  return (
    <Section className={`${__P.p8} text-center`} border="default" surface="subtle" rounded="2xl">
      <Heading level={2} className="mb-3">{t("ctaTitle")}</Heading>
      <Text variant="secondary" className="mb-6 max-w-lg mx-auto">{t("ctaText")}</Text>
      <Row align="center" justify="center" gap="md" wrap>
        <TextLink href={String(ROUTES.PUBLIC.PRODUCTS)}>{t("ctaBrowse")}</TextLink>
        <TextLink href={String(ROUTES.PUBLIC.HOW_CHECKOUT_WORKS)} variant="muted">{t("ctaCheckout")}</TextLink>
      </Row>
    </Section>
  );
}
