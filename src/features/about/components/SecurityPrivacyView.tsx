import { ROUTES } from "../../../constants";
import { THEME_CONSTANTS } from "../../../tokens";
import { Heading, Text, Section, FlowDiagram } from "../../../ui";
import type { FlowStep } from "../../../ui";
import { TextLink } from "../../../ui";
import { getTranslations } from "next-intl/server";
import {
  Shield,
  Lock,
  Search,
  Globe,
  Database,
  KeyRound,
  FileText,
  Upload,
  ShieldCheck,
  Scale,
} from "lucide-react";

const DEFAULT_HERO_CLASS =
  "bg-gradient-to-br from-violet-700 to-indigo-700 dark:from-violet-800 dark:to-indigo-800";

export interface SecurityPrivacyViewProps {
  heroBannerClass?: string;
}

export async function SecurityPrivacyView({
  heroBannerClass = DEFAULT_HERO_CLASS,
}: SecurityPrivacyViewProps = {}) {
  const { themed, flex, page } = THEME_CONSTANTS;
  const t = await getTranslations("securityPage");

  const SECTIONS = [
    {
      icon: Lock,
      title: t("encryptionTitle"),
      text: t("encryptionText"),
      color:
        "bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30",
      iconColor: "text-primary",
    },
    {
      icon: Search,
      title: t("blindIndexTitle"),
      text: t("blindIndexText"),
      color:
        "bg-violet-50 border-violet-200 dark:bg-violet-900/20 dark:border-violet-700",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
    {
      icon: Globe,
      title: t("transportTitle"),
      text: t("transportText"),
      color:
        "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      icon: Database,
      title: t("dataMinTitle"),
      text: t("dataMinText"),
      color: "bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-700",
      iconColor: "text-sky-600 dark:text-sky-400",
    },
    {
      icon: KeyRound,
      title: t("accessTitle"),
      text: t("accessText"),
      color:
        "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      icon: FileText,
      title: t("loggingTitle"),
      text: t("loggingText"),
      color:
        "bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-700",
      iconColor: "text-rose-600 dark:text-rose-400",
    },
    {
      icon: Shield,
      title: t("rtdbTitle"),
      text: t("rtdbText"),
      color:
        "bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-700",
      iconColor: "text-teal-600 dark:text-teal-400",
    },
    {
      icon: Upload,
      title: t("uploadsTitle"),
      text: t("uploadsText"),
      color:
        "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-700",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
    {
      icon: ShieldCheck,
      title: t("csrfTitle"),
      text: t("csrfText"),
      color:
        "bg-cyan-50 border-cyan-200 dark:bg-cyan-900/20 dark:border-cyan-700",
      iconColor: "text-cyan-600 dark:text-cyan-400",
    },
    {
      icon: Scale,
      title: t("complianceTitle"),
      text: t("complianceText"),
      color:
        "bg-fuchsia-50 border-fuchsia-200 dark:bg-fuchsia-900/20 dark:border-fuchsia-700",
      iconColor: "text-fuchsia-600 dark:text-fuchsia-400",
    },
  ];

  const DIAGRAM_STEPS: FlowStep[] = [
    {
      emoji: "🖥️",
      circleClass:
        "bg-slate-100 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-500",
      badge: t("diagramStep1Badge"),
      badgeClass:
        "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
      desc: t("diagramStep1Desc"),
    },
    {
      emoji: "🔒",
      circleClass:
        "bg-emerald-100 dark:bg-emerald-900/40 border-2 border-emerald-400 dark:border-emerald-600",
      badge: t("diagramStep2Badge"),
      badgeClass:
        "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
      desc: t("diagramStep2Desc"),
    },
    {
      emoji: "🛡️",
      circleClass:
        "bg-primary/10 dark:bg-primary/15 border-2 border-primary/30 dark:border-primary/40",
      badge: t("diagramStep3Badge"),
      badgeClass: "bg-primary/10 dark:bg-primary/15 text-primary",
      desc: t("diagramStep3Desc"),
    },
    {
      emoji: "🔐",
      circleClass:
        "bg-violet-100 dark:bg-violet-900/40 border-2 border-violet-400 dark:border-violet-600",
      badge: t("diagramStep4Badge"),
      badgeClass:
        "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
      desc: t("diagramStep4Desc"),
    },
    {
      emoji: "🗄️",
      circleClass:
        "bg-sky-100 dark:bg-sky-900/40 border-2 border-sky-300 dark:border-sky-600",
      badge: t("diagramStep5Badge"),
      badgeClass:
        "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",
      desc: t("diagramStep5Desc"),
    },
  ];

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10">
      {/* Hero */}
      <Section
        className={`${heroBannerClass} text-white py-14 md:py-16 lg:py-20`}
      >
        <div className={`${page.container.md} text-center`}>
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
      >
        {/* Overview */}
        <Section className="text-center">
          <Heading level={2} className="mb-3">
            {t("overviewTitle")}
          </Heading>
          <Text variant="secondary" className="max-w-2xl mx-auto">
            {t("overviewText")}
          </Text>
        </Section>

        {/* Security cards */}
        <Section>
          <div className="grid gap-5 md:grid-cols-2">
            {SECTIONS.map(({ icon: Icon, title, text, color, iconColor }) => (
              <div key={title} className={`rounded-xl border p-5 ${color}`}>
                <div
                  className={`w-10 h-10 rounded-lg bg-white/60 dark:bg-white/10 ${flex.center} mb-3`}
                >
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

        {/* Flow diagram */}
        <Section>
          <FlowDiagram
            title={`🛡️ ${t("diagramTitle")}`}
            titleClass="text-primary"
            connectorClass="bg-primary/20 dark:bg-primary/30"
            steps={DIAGRAM_STEPS}
            centered
          />
        </Section>

        {/* Last updated */}
        <Text variant="secondary" className="text-center text-sm">
          {t("lastUpdated")}
        </Text>

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
          <div className={`${flex.center} gap-4 flex-wrap`}>
            <TextLink href={String(ROUTES.PUBLIC.PRIVACY)}>
              {t("ctaPrivacy")}
            </TextLink>
            <TextLink href={String(ROUTES.PUBLIC.CONTACT)} variant="muted">
              {t("ctaContact")}
            </TextLink>
          </div>
        </Section>
      </div>
    </div>
  );
}
