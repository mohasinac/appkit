import { ROUTES } from "../../../constants";
import { PAGE_CONTAINER } from "../../../_internal/shared/styles/page";
import { Div, FlowDiagram, Heading, Row, Section, Span, Stack, Text } from "../../../ui";
import type { FlowStep } from "../../../ui";
import { TextLink } from "../../../ui";
import { PackageSearch, MapPinned, FileText, XCircle } from "lucide-react";

const __P = {
  p4: "p-4",
  p5: "p-5",
  p8: "p-8",
} as const;


export interface HowOrdersWorkViewProps {
}

export async function HowOrdersWorkView({
}: HowOrdersWorkViewProps = {}) {
  const page = { container: PAGE_CONTAINER };
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("howOrdersWork");

  const ORDER_STATUSES = [
    {
      status: t("statusPending"),
      icon: "⏳",
      badge:
        "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
      desc: t("statusPendingDesc"),
    },
    {
      status: t("statusConfirmed"),
      icon: "✅",
      badge: "bg-primary/10 dark:bg-primary/15 text-primary",
      desc: t("statusConfirmedDesc"),
    },
    {
      status: t("statusPacked"),
      icon: "📦",
      badge: "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",
      desc: t("statusPackedDesc"),
    },
    {
      status: t("statusShipped"),
      icon: "🚚",
      badge:
        "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
      desc: t("statusShippedDesc"),
    },
    {
      status: t("statusOutForDelivery"),
      icon: "🏃",
      badge:
        "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
      desc: t("statusOutForDeliveryDesc"),
    },
    {
      status: t("statusDelivered"),
      icon: "🎉",
      badge:
        "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
      desc: t("statusDeliveredDesc"),
    },
    {
      status: t("statusCancelled"),
      icon: "❌",
      badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
      desc: t("statusCancelledDesc"),
    },
  ];

  const INFO_CARDS = [
    {
      icon: PackageSearch,
      title: t("infoCard1Title"),
      text: t("infoCard1Text"),
      color:
        "bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30",
      iconColor: "text-primary",
    },
    {
      icon: MapPinned,
      title: t("infoCard2Title"),
      text: t("infoCard2Text"),
      color: "bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-700",
      iconColor: "text-sky-600 dark:text-sky-400",
    },
    {
      icon: FileText,
      title: t("infoCard3Title"),
      text: t("infoCard3Text"),
      color:
        "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      icon: XCircle,
      title: t("infoCard4Title"),
      text: t("infoCard4Text"),
      color:
        "bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-700",
      iconColor: "text-rose-600 dark:text-rose-400",
    },
  ];

  const DIAGRAM_STEPS: FlowStep[] = [
    {
      emoji: "🛒",
      circleClass:
        "bg-slate-100 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-500",
      badge: t("diagramStep1Badge"),
      badgeClass:
        "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
      desc: t("diagramStep1Desc"),
    },
    {
      emoji: "✅",
      circleClass:
        "bg-primary/10 dark:bg-primary/15 border-2 border-primary/30 dark:border-primary/40",
      badge: t("diagramStep2Badge"),
      badgeClass: "bg-primary/10 dark:bg-primary/15 text-primary",
      desc: t("diagramStep2Desc"),
    },
    {
      emoji: "📦",
      circleClass:
        "bg-sky-100 dark:bg-sky-900/40 border-2 border-sky-300 dark:border-sky-600",
      badge: t("diagramStep3Badge"),
      badgeClass:
        "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",
      desc: t("diagramStep3Desc"),
    },
    {
      emoji: "🚚",
      circleClass:
        "bg-violet-100 dark:bg-violet-900/40 border-2 border-violet-400 dark:border-violet-600",
      badge: t("diagramStep4Badge"),
      badgeClass:
        "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
      desc: t("diagramStep4Desc"),
    },
    {
      emoji: "🏠",
      circleClass:
        "bg-emerald-100 dark:bg-emerald-900/40 border-2 border-emerald-400 dark:border-emerald-600",
      badge: t("diagramStep5Badge"),
      badgeClass:
        "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
      desc: t("diagramStep5Desc"),
    },
    {
      emoji: "⭐",
      circleClass:
        "bg-amber-100 dark:bg-amber-900/40 border-2 border-amber-300 dark:border-amber-600",
      badge: t("diagramStep6Badge"),
      badgeClass:
        "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
      desc: t("diagramStep6Desc"),
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
        {renderOrderStatusesSection(t, ORDER_STATUSES)}
        <Section>
          <FlowDiagram title={`📦 ${t("diagramTitle")}`} titleClass="text-primary" connectorClass="bg-primary/20 dark:bg-primary/30" steps={DIAGRAM_STEPS} centered />
        </Section>
        {renderOrderInfoCardsSection(INFO_CARDS)}
        {renderOrdersCtaSection(t)}
      </Stack>
    </Div>
  );
}

type OrdersT = Awaited<ReturnType<typeof import("next-intl/server").getTranslations>>;
 
type OrderInfoCard = { icon: any; title: string; text: string; color: string; iconColor: string };
type OrderStatus = { status: string; icon: string; badge: string; desc: string };

function renderOrderStatusesSection(t: OrdersT, statuses: OrderStatus[]) {
  return (
    <Section>
      <Heading level={2} className="mb-6">{t("statusesTitle")}</Heading>
      <Stack gap="3">
        {statuses.map(({ status, icon, badge, desc }) => (
          <Row key={status} className={`${__P.p4}`} border="default" surface="muted" align="start" gap="md" rounded="xl">
            <Row align="center" gap="sm" className="flex-shrink-0 pt-0.5">
              <Span size="xl">{icon}</Span>
              <Span size="xs" weight="semibold" className={`${badge}`} rounded="full" padding="pill-xs">{status}</Span>
            </Row>
            <Text variant="secondary" className="leading-relaxed" size="sm">{desc}</Text>
          </Row>
        ))}
      </Stack>
    </Section>
  );
}

function renderOrderInfoCardsSection(cards: OrderInfoCard[]) {
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

function renderOrdersCtaSection(t: OrdersT) {
  return (
    <Section className={`${__P.p8} text-center`} border="default" surface="subtle" rounded="2xl">
      <Heading level={2} className="mb-3">{t("ctaTitle")}</Heading>
      <Text variant="secondary" className="mb-6 max-w-lg mx-auto">{t("ctaText")}</Text>
      <Row align="center" justify="center" gap="md" wrap >
        <TextLink href={String(ROUTES.PUBLIC.PRODUCTS)}>{t("ctaBrowse")}</TextLink>
        <TextLink href={String(ROUTES.PUBLIC.HOW_CHECKOUT_WORKS)} variant="muted">{t("ctaCheckout")}</TextLink>
      </Row>
    </Section>
  );
}
