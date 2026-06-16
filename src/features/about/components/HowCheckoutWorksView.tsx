import { ROUTES } from "../../../constants";
import { THEME_CONSTANTS } from "../../../tokens";
import { Div, FlowDiagram, Heading, Row, Section, Stack, Text } from "../../../ui";
import type { FlowStep } from "../../../ui";
import { TextLink } from "../../../ui";
import { Smartphone, Banknote } from "lucide-react";

const __P = {
  p5: "p-5",
  p8: "p-8",
} as const;


export interface HowCheckoutWorksViewProps {
}

export async function HowCheckoutWorksView({
}: HowCheckoutWorksViewProps = {}) {
  const { themed, flex, page } = THEME_CONSTANTS;
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("howCheckoutWorks");

  const STEPS = [
    { number: 1, icon: "🛒", title: t("step1Title"), text: t("step1Text") },
    { number: 2, icon: "📍", title: t("step2Title"), text: t("step2Text") },
    { number: 3, icon: "💳", title: t("step3Title"), text: t("step3Text") },
    { number: 4, icon: "✅", title: t("step4Title"), text: t("step4Text") },
    { number: 5, icon: "📧", title: t("step5Title"), text: t("step5Text") },
  ];

  const PAYMENT_METHODS = [
    {
      icon: Smartphone,
      title: t("pm1Title"),
      text: t("pm1Text"),
      color:
        "bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30",
      iconColor: "text-primary",
    },
    {
      icon: Banknote,
      title: t("pm2Title"),
      text: t("pm2Text"),
      color:
        "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  const DIAGRAM_STEPS: FlowStep[] = [
    {
      emoji: "🛒",
      circleClass:
        "bg-slate-100 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-500",
      badge: t("step1Title"),
      badgeClass:
        "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
      desc: t("diagramStep1Desc"),
    },
    {
      emoji: "📍",
      circleClass:
        "bg-primary/10 dark:bg-primary/15 border-2 border-primary/30 dark:border-primary/40",
      badge: t("step2Title"),
      badgeClass: "bg-primary/10 dark:bg-primary/15 text-primary",
      desc: t("diagramStep2Desc"),
    },
    {
      emoji: "💳",
      circleClass:
        "bg-violet-100 dark:bg-violet-900/40 border-2 border-violet-400 dark:border-violet-600",
      badge: t("step3Title"),
      badgeClass:
        "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
      desc: t("diagramStep3Desc"),
    },
    {
      emoji: "✅",
      circleClass:
        "bg-emerald-100 dark:bg-emerald-900/40 border-2 border-emerald-400 dark:border-emerald-600",
      badge: t("step4Title"),
      badgeClass:
        "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
      desc: t("diagramStep4Desc"),
    },
    {
      emoji: "📦",
      circleClass:
        "bg-sky-100 dark:bg-sky-900/40 border-2 border-sky-300 dark:border-sky-600",
      badge: t("step5Title"),
      badgeClass:
        "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",
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
      <Div className={`${page.container.md} md:py-12 lg:py-16 space-y-14`} padding="y-2xl">
        {renderCheckoutStepsSection(t, themed, flex, STEPS)}
        <Section>
          <FlowDiagram title={`🗺️ ${t("diagramTitle")}`} titleClass="text-primary" connectorClass="bg-primary/20 dark:bg-primary/30" steps={DIAGRAM_STEPS} centered />
        </Section>
        {renderPaymentMethodsSection(t, flex, PAYMENT_METHODS)}
        {renderCheckoutCtaSection(t, themed, flex)}
      </Div>
    </Div>
  );
}

type CheckoutT = Awaited<ReturnType<typeof import("next-intl/server").getTranslations>>;
 
type CheckoutMethod = { icon: any; title: string; text: string; color: string; iconColor: string };
type CheckoutStep = { number: number; icon: string; title: string; text: string };

function renderCheckoutStepsSection(t: CheckoutT, themed: (typeof THEME_CONSTANTS)["themed"], flex: (typeof THEME_CONSTANTS)["flex"], steps: CheckoutStep[]) {
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

function renderPaymentMethodsSection(t: CheckoutT, flex: (typeof THEME_CONSTANTS)["flex"], methods: CheckoutMethod[]) {
  return (
    <Section>
      <Heading level={2} className="mb-3" align="center">{t("paymentMethodsTitle")}</Heading>
      <Text variant="secondary" className="mb-8 max-w-xl mx-auto" align="center">{t("paymentMethodsSubtitle")}</Text>
      <Div layout="grid" gap="5" className="md:grid-cols-3">
        {methods.map(({ icon: Icon, title, text, color, iconColor }) => (
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

function renderCheckoutCtaSection(t: CheckoutT, themed: (typeof THEME_CONSTANTS)["themed"], flex: (typeof THEME_CONSTANTS)["flex"]) {
  return (
    <Section className={`${__P.p8} text-center`} border="default" surface="subtle" rounded="2xl">
      <Heading level={2} className="mb-3">{t("ctaTitle")}</Heading>
      <Text variant="secondary" className="mb-6 max-w-lg mx-auto">{t("ctaText")}</Text>
      <Row align="center" justify="center" gap="md" wrap >
        <TextLink href={String(ROUTES.PUBLIC.PRODUCTS)}>{t("ctaBrowse")}</TextLink>
        <TextLink href={String(ROUTES.PUBLIC.HOW_ORDERS_WORK)} variant="muted">{t("ctaOrders")}</TextLink>
      </Row>
    </Section>
  );
}
