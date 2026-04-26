import { ROUTES } from "../../../constants";
import { THEME_CONSTANTS } from "../../../tokens";
import { Heading, Text, Section, Span, Row, FlowDiagram } from "../../../ui";
import type { FlowStep } from "../../../ui";
import { TextLink } from "../../../ui";
import { PackageSearch, MapPinned, FileText, XCircle } from "lucide-react";

const DEFAULT_HERO_CLASS =
  "bg-gradient-to-br from-violet-700 to-indigo-700 dark:from-violet-800 dark:to-indigo-800";

export interface HowOrdersWorkViewProps {
  heroBannerClass?: string;
}

export async function HowOrdersWorkView({
  heroBannerClass = DEFAULT_HERO_CLASS,
}: HowOrdersWorkViewProps = {}) {
  const { themed, flex, page } = THEME_CONSTANTS;
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
    <div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10" data-section="howordersworkview-div-142">
      {/* Hero */}
      <Section
        className={`${heroBannerClass} text-white py-14 md:py-16 lg:py-20`}
      >
        <div className={`${page.container.md} text-center`} data-section="howordersworkview-div-143">
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
       data-section="howordersworkview-div-144">
        {/* Order statuses */}
        <Section>
          <Heading level={2} className="mb-6">
            {t("statusesTitle")}
          </Heading>
          <div className="space-y-3" data-section="howordersworkview-div-145">
            {ORDER_STATUSES.map(({ status, icon, badge, desc }) => (
              <div
                key={status}
                className={`flex items-start gap-4 p-4 rounded-xl border ${themed.border} ${themed.bgPrimary}`}
               data-section="howordersworkview-div-146">
                <Row align="center" gap="sm" className="flex-shrink-0 pt-0.5">
                  <Span className="text-xl">{icon}</Span>
                  <Span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}
                  >
                    {status}
                  </Span>
                </Row>
                <Text variant="secondary" className="text-sm leading-relaxed">
                  {desc}
                </Text>
              </div>
            ))}
          </div>
        </Section>

        {/* Flow diagram */}
        <Section>
          <FlowDiagram
            title={`📦 ${t("diagramTitle")}`}
            titleClass="text-primary"
            connectorClass="bg-primary/20 dark:bg-primary/30"
            steps={DIAGRAM_STEPS}
            centered
          />
        </Section>

        {/* Info cards */}
        <Section>
          <div className="grid gap-5 md:grid-cols-2" data-section="howordersworkview-div-147">
            {INFO_CARDS.map(({ icon: Icon, title, text, color, iconColor }) => (
              <div key={title} className={`rounded-xl border p-5 ${color}`} data-section="howordersworkview-div-148">
                <div
                  className={`w-10 h-10 rounded-lg bg-white/60 dark:bg-white/10 ${flex.center} mb-3`}
                 data-section="howordersworkview-div-149">
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <Text className="font-semibold mb-1">{title}</Text>
                <Text variant="secondary" className="text-sm leading-relaxed">
                  {text}
                </Text>
              </div>
            ))}
          </div>
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
          <div className={`${flex.center} gap-4 flex-wrap`} data-section="howordersworkview-div-150">
            <TextLink href={String(ROUTES.PUBLIC.PRODUCTS)}>
              {t("ctaBrowse")}
            </TextLink>
            <TextLink
              href={String(ROUTES.PUBLIC.HOW_CHECKOUT_WORKS)}
              variant="muted"
            >
              {t("ctaCheckout")}
            </TextLink>
          </div>
        </Section>
      </div>
    </div>
  );
}
