import { ROUTES } from "../../../constants";
import { THEME_CONSTANTS } from "../../../tokens";
import { Heading, Text, Section, Stack, FlowDiagram } from "../../../ui";
import type { FlowStep } from "../../../ui";
import { TextLink } from "../../../ui";
import { getTranslations } from "next-intl/server";
import { ShieldCheck, ThumbsUp, Pencil } from "lucide-react";

const DEFAULT_HERO_CLASS =
  "bg-gradient-to-br from-violet-700 to-indigo-700 dark:from-violet-800 dark:to-indigo-800";

export interface HowReviewsWorkViewProps {
  heroBannerClass?: string;
}

export async function HowReviewsWorkView({
  heroBannerClass = DEFAULT_HERO_CLASS,
}: HowReviewsWorkViewProps = {}) {
  const { themed, flex, page } = THEME_CONSTANTS;
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
    <div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10" data-section="howreviewsworkview-div-171">
      {/* Hero */}
      <Section
        className={`${heroBannerClass} text-white py-14 md:py-16 lg:py-20`}
      >
        <div className={`${page.container.md} text-center`} data-section="howreviewsworkview-div-172">
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
       data-section="howreviewsworkview-div-173">
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
               data-section="howreviewsworkview-div-174">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/15 ${flex.center} text-xl`}
                 data-section="howreviewsworkview-div-175">
                  {icon}
                </div>
                <div data-section="howreviewsworkview-div-176">
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
            title={`⭐ ${t("diagramTitle")}`}
            titleClass="text-primary"
            connectorClass="bg-primary/20 dark:bg-primary/30"
            steps={DIAGRAM_STEPS}
            centered
          />
        </Section>

        {/* Info cards */}
        <Section>
          <div className="grid gap-5 md:grid-cols-3" data-section="howreviewsworkview-div-177">
            {INFO_CARDS.map(({ icon: Icon, title, text, color, iconColor }) => (
              <div key={title} className={`rounded-xl border p-5 ${color}`} data-section="howreviewsworkview-div-178">
                <div
                  className={`w-10 h-10 rounded-lg bg-white/60 dark:bg-white/10 ${flex.center} mb-3`}
                 data-section="howreviewsworkview-div-179">
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
          <div className={`${flex.center} gap-4 flex-wrap`} data-section="howreviewsworkview-div-180">
            <TextLink href={String(ROUTES.USER.ORDERS)}>
              {t("ctaOrders")}
            </TextLink>
            <TextLink
              href={String(ROUTES.PUBLIC.HOW_ORDERS_WORK)}
              variant="muted"
            >
              {t("ctaHowOrders")}
            </TextLink>
          </div>
        </Section>
      </div>
    </div>
  );
}
