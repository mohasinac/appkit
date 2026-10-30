import { normalizeError } from "../../../errors/normalize";
import { serverLogger } from "../../../monitoring/server-logger";
import { ProseHero } from "./ProseHero";
import { siteSettingsRepository } from "../../admin/repository/site-settings.repository";
import { ROUTES } from "../../../constants";
import { PAGE_CONTAINER } from "../../../_internal/shared/styles/page";
import { Div } from "../../../ui/components/Div";
import { Heading, Text } from "../../../ui/components/Typography";
import { Section } from "../../../ui/components/Semantic";
import { Stack } from "../../../ui/components/Layout";
import { FlowDiagram } from "../../../ui/components/FlowDiagram";
import type { FlowStep } from "../../../ui/components/FlowDiagram";
import { TextLink } from "../../../ui/components/TextLink";

const CLS_FOOTER_LINK = "text-sky-600 dark:text-sky-400 hover:underline";

export interface ShippingPolicyViewProps {
}

export async function ShippingPolicyView({
}: ShippingPolicyViewProps = {}) {
  const page = { container: PAGE_CONTAINER };
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("shippingPolicy");

  /*
   * 🛑 `siteSettings.legalPages.shipping` was WRITTEN by the admin form and
   * read by nothing.
   *
   * Every other legal page renders through `PolicyPageView`, which checks that
   * group for an admin HTML override. This page does not — it has a bespoke
   * layout with a five-step delivery diagram that a flat `sections[]` cannot
   * express — so the override had no reader and an admin who rewrote the
   * shipping policy saw their text saved successfully and never appear.
   *
   * Reading it here rather than converting the page is the deliberate choice:
   * converting would mean flattening 38 i18n keys into `sections[]` and losing
   * the diagram, which is a regression dressed up as consolidation.
   */
  let adminHtml = "";
  try {
    const settings = await siteSettingsRepository.getSingleton();
    adminHtml = settings.legalPages?.shipping ?? "";
  } catch (_err) {
    void normalizeError(_err);
    // The i18n copy below is a complete policy in its own right, so a failed
    // read degrades to it — but an admin who HAS overridden this page would
    // silently see the old text, so the operator needs to know.
    serverLogger.warn("about.shippingPolicyView: siteSettings.legalPages read failed", {
      field: "shipping",
      error: normalizeError(_err).message,
    });
  }

  const SECTIONS = [
    { title: t("orderProcessTitle"), text: t("orderProcessText") },
    { title: t("standardTitle"), text: t("standardText") },
    { title: t("expressTitle"), text: t("expressText") },
    { title: t("freeShippingTitle"), text: t("freeShippingText") },
    { title: t("collectorDropShippingTitle"), text: t("collectorDropShippingText") },
    { title: t("trackingTitle"), text: t("trackingText") },
    { title: t("internationalTitle"), text: t("internationalText") },
    { title: t("damagedTitle"), text: t("damagedText") },
  ];

  const DIAGRAM_STEPS: FlowStep[] = [
    {
      emoji: "✅",
      circleClass:
        "bg-primary/10 dark:bg-primary/15 border-2 border-primary/30 dark:border-primary/40",
      badge: t("diagramStatus1"),
      badgeClass: "bg-primary/10 dark:bg-primary/15 text-primary",
      desc: t("diagramStatus1Desc"),
    },
    {
      emoji: "📦",
      circleClass:
        "bg-amber-100 dark:bg-amber-900/40 border-2 border-amber-300 dark:border-amber-600",
      badge: t("diagramStatus2"),
      badgeClass:
        "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
      desc: t("diagramStatus2Desc"),
    },
    {
      emoji: "🚀",
      circleClass:
        "bg-sky-100 dark:bg-sky-900/40 border-2 border-sky-300 dark:border-sky-600",
      badge: t("diagramStatus3"),
      badgeClass:
        "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",
      desc: t("diagramStatus3Desc"),
    },
    {
      emoji: "🚚",
      circleClass:
        "bg-violet-100 dark:bg-violet-900/40 border-2 border-violet-300 dark:border-violet-600",
      badge: t("diagramStatus4"),
      badgeClass:
        "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
      desc: t("diagramStatus4Desc"),
    },
    {
      emoji: "🏠",
      circleClass:
        "bg-emerald-100 dark:bg-emerald-900/40 border-2 border-emerald-400 dark:border-emerald-600",
      badge: t("diagramStatus5"),
      badgeClass:
        "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
      desc: t("diagramStatus5Desc"),
    },
  ];

  return (
    <Div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10">
      {/* Header */}
      {/*
        `subtitleSize="sm"` here where the original had the default, matching
        PolicyPageView: both subtitles are a "Last updated …" line and the two
        pages are siblings. The difference was drift, like the mb-3/mb-4 one.
      */}
      <ProseHero
        width="sm"
        centered={false}
        subtitleSize="sm"
        title={t("title")}
        subtitle={t("lastUpdated")}
      />

      <Div className={`${page.container.sm}`} padding="content-banner">
        {adminHtml ? (
          /*
            Admin-set HTML replaces the WHOLE body — subtitle, sections,
            diagram and contact block — matching PolicyPageView's behaviour
            exactly. Rendering the override above the bundled copy would show
            two shipping policies on one page, and the reader has no way to
            know which one binds.
          */
          <Div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: adminHtml }}
          />
        ) : (
          <>
        <Text size="lg" variant="secondary" className="mb-8">
          {t("subtitle")}
        </Text>

        <FlowDiagram
          title={`🚚 ${t("diagramTitle")}`}
          titleClass="text-sky-700 dark:text-sky-300"
          connectorClass="bg-sky-200 dark:bg-sky-800"
          steps={DIAGRAM_STEPS}
          className="mb-10"
          note={`📌 ${t("diagramNote")}`}
        />

        <Stack gap="xl">
          {SECTIONS.map(({ title, text }) => (
            <Section key={title}>
              <Heading level={2} className="mb-3">
                {title}
              </Heading>
              <Text variant="secondary" className="leading-relaxed">
                {text}
              </Text>
            </Section>
          ))}

          {/* Contact */}
          <Section rounded="xl" padding="lg" border="default" surface="subtle">
            <Heading level={2} className="mb-2">
              {t("contactTitle")}
            </Heading>
            <Text variant="secondary">{t("contactText")}</Text>
          </Section>
        </Stack>
          </>
        )}

        {/*
          Outside the override branch on purpose: these are NAVIGATION, not
          policy text. An admin replacing the copy should not also remove the
          way out of the page.
        */}
        <Div layout="flex" gap="6" textSize="sm" className={`mt-12 border-t`} border="default" padding="t-xl">
          <TextLink
            href={String(ROUTES.PUBLIC.TRACK_ORDER)}
            className={CLS_FOOTER_LINK}
          >
            {t("trackOrder")}
          </TextLink>
          <TextLink
            href={String(ROUTES.PUBLIC.HELP)}
            className={CLS_FOOTER_LINK}
          >
            {t("helpCenter")}
          </TextLink>
          <TextLink
            href={String(ROUTES.PUBLIC.CONTACT)}
            className={CLS_FOOTER_LINK}
          >
            {t("contactUs")}
          </TextLink>
          <TextLink
            href={String(ROUTES.PUBLIC.REFUND_POLICY)}
            className={CLS_FOOTER_LINK}
          >
            Refund Policy
          </TextLink>
        </Div>
      </Div>
    </Div>
  );
}
