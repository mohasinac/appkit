import { normalizeError } from "../../../errors/normalize";
import { serverLogger } from "../../../monitoring/server-logger";
import { ProseHero } from "./ProseHero";
import { Row } from "@mohasinac/appkit/ui";
import { ROUTES } from "../../../constants";
import { PAGE_CONTAINER } from "../../../_internal/shared/styles/page";
import { Div } from "../../../ui/components/Div";
import { Heading, Text } from "../../../ui/components/Typography";
import { Section } from "../../../ui/components/Semantic";
import { Stack } from "../../../ui/components/Layout";
import { TextLink } from "../../../ui/components/TextLink";
import { siteSettingsRepository } from "../../admin/repository/site-settings.repository";
import type { SiteSettingsDocument } from "../../admin/schemas/firestore";
import { getCompositeSentence } from "../../../_internal/shared/content/composite-sentences";
import { getFragmentedParagraph } from "../../../_internal/shared/content/fragmented-paragraphs";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";


export type PolicyKey =
  | "privacy"
  | "terms"
  | "cookies"
  | "refund"
  | "ethics"
  | "conduct"
  | "cancellation"
  | "grievance";

export interface PolicyPageViewProps {
  /**
   * Which policy to render. Omit for a non-policy "guide" page (the
   * how-X-works family) — in that mode the i18n sections, the admin-HTML
   * override and the related-policies footer are all skipped entirely, and
   * `title` / `subtitle` / `children` drive the page instead. See the guard
   * clause at the top of the function body for exactly what guide mode does
   * and does not touch of the policy-mode code below it.
   */
  policy?: PolicyKey;
  /**
   * Stable, hand-chosen id for this page's admin-composable region (Phase
   * 12). Follows the ROUTE, not the `policy` value — every caller computes
   * and passes its own distinct id (e.g. `cancellation-policy`, `terms`).
   */
  pageId: string;
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
  /**
   * Rendered after the policy sections and before the related links.
   *
   * The slot exists for /grievance, whose officer block (name, designation,
   * email, phone) comes from `appkit.config.js` → `business.grievance` rather
   * than from i18n — those values are deployment-specific and some are still
   * undecided, so they render through `<PendingValue>` as a visible
   * `[to be confirmed]` marker.
   *
   * 🛑 Deliberately a `children` ReactNode and not a render prop: this is an
   * async Server Component, and a function prop would have to cross the
   * server/client boundary at the call site to be useful. The caller builds
   * the node and passes it down, which needs nothing serialisable.
   *
   * Note it renders under the i18n sections but is SKIPPED when an admin HTML
   * override is present — an override replaces the page's body, and silently
   * appending a block the admin cannot see or edit would make the override a
   * half-truth.
   *
   * In guide mode (no `policy`) this is the WHOLE page body — there is no
   * i18n-sections/admin-HTML branch to skip, so `children` always renders.
   */
  children?: React.ReactNode;

  /**
   * Guide-mode hero title. Required in practice when `policy` is omitted —
   * `PolicyKey`'s i18n path supplies its own title, this is what replaces it
   * for a page that has none. Ignored when `policy` is set.
   */
  title?: string;
  /** Guide-mode hero subtitle. Ignored when `policy` is set. */
  subtitle?: string;
  /**
   * Content max-width. Every one of the 8 real policy pages relies on the
   * `sm` default below (unchanged from before this prop existed); every one
   * of the 7 how-X-works guides used `page.container.md` directly before
   * their migration onto this component, so that becomes guide mode's
   * default too. Override only if a future page genuinely needs the other.
   */
  containerSize?: "sm" | "md";
}

/**
 * The numbered "step 1 → step N" card list six of the seven how-X-works
 * guides each hand-rolled as their own `renderXStepsSection` — same circle
 * icon, same number-dot title, same secondary description, differing only in
 * the data. Lifted here verbatim (not generalised further) once a seventh
 * near-identical copy made the duplication the thing worth fixing.
 *
 * Deliberately NOT wired into `PolicyPageViewProps` as a positioned slot —
 * guide pages differ in WHERE this sits relative to their other content
 * (EMI's eligibility alert has to come before it, everyone else's doesn't),
 * so this is a plain composable export a caller places inside `children`
 * wherever its own order requires, same as `FlowDiagram` already is.
 */
export function PolicySteps({ title, items }: PolicyStepsProps) {
  return (
    <Section>
      <Heading level={2} className="mb-8" align="center">{title}</Heading>
      <Stack gap="5">
        {items.map(({ number, icon, title: stepTitle, text }) => (
          <Row
            key={number}
            className="p-[var(--appkit-space-5)]"
            border="default"
            surface="muted"
            align="start"
            gap="md"
            rounded="xl"
          >
            <Row
              align="center"
              justify="center"
              className="flex-shrink-0 w-10 h-10 bg-primary/10 dark:bg-primary/15"
              rounded="full"
            >
              {icon}
            </Row>
            <Div>
              <Text className="mb-0.5" weight="semibold">{number}. {stepTitle}</Text>
              <Text variant="secondary" className="leading-relaxed" size="sm">{text}</Text>
            </Div>
          </Row>
        ))}
      </Stack>
    </Section>
  );
}

export interface PolicyStepItem {
  number: number;
  icon: string;
  title: string;
  text: string;
}

export interface PolicyStepsProps {
  title: string;
  items: PolicyStepItem[];
}

export interface PolicyCtaLink {
  label: string;
  href: string;
}

export interface PolicyCtaProps {
  title: string;
  text: string;
  primary: PolicyCtaLink;
  secondary?: PolicyCtaLink;
}

/**
 * The centered, bordered "browse more / related guide" panel every one of
 * the seven how-X-works guides ends on — each had its own byte-for-byte
 * `renderXCtaSection` differing only in copy and links. Lifted here verbatim
 * for the same reason as `PolicySteps` above.
 */
export function PolicyCta({ title, text, primary, secondary }: PolicyCtaProps) {
  return (
    <Section className="p-[var(--appkit-space-8)] text-center" border="default" surface="subtle" rounded="2xl">
      <Heading level={2} className="mb-3">{title}</Heading>
      <Text variant="secondary" className="mb-6 max-w-lg mx-auto">{text}</Text>
      <Row align="center" justify="center" gap="md" wrap>
        <TextLink href={primary.href}>{primary.label}</TextLink>
        {secondary && (
          <TextLink href={secondary.href} variant="muted">{secondary.label}</TextLink>
        )}
      </Row>
    </Section>
  );
}

/**
 * Single source of truth for every policy page this shell can render.
 *
 * Declared as `Record<PolicyKey, …>` on purpose: adding a member to `PolicyKey`
 * without adding its entry here is a COMPILE error, not a silent gap. This
 * replaced three separate hand-maintained enumerations of the same union
 * (a namespace map, a Firestore-field map, and an inline path lookup inside the
 * related-links filter) — see Recurrent Root Cause #61.
 *
 * - `path`            — used to exclude the current page from its own related list
 * - `namespace`       — next-intl namespace holding this page's copy
 * - `firestoreField`  — key inside `siteSettings.legalPages` carrying the admin HTML override
 * - `relatedLabelKey` — i18n key that OTHER policy namespaces use to label a link to this page
 */
const POLICY_META: Record<
  PolicyKey,
  {
    path: string;
    namespace: string;
    firestoreField: keyof SiteSettingsDocument["legalPages"];
    relatedLabelKey: string;
  }
> = {
  privacy: {
    path: String(ROUTES.PUBLIC.PRIVACY),
    namespace: "privacy",
    firestoreField: "privacy",
    relatedLabelKey: "relatedPrivacy",
  },
  terms: {
    path: String(ROUTES.PUBLIC.TERMS),
    namespace: "terms",
    firestoreField: "terms",
    relatedLabelKey: "relatedTerms",
  },
  cookies: {
    path: String(ROUTES.PUBLIC.COOKIE_POLICY),
    namespace: "cookies",
    firestoreField: "cookies",
    relatedLabelKey: "relatedCookies",
  },
  refund: {
    path: String(ROUTES.PUBLIC.REFUND_POLICY),
    namespace: "refundPolicy",
    firestoreField: "refundPolicy",
    relatedLabelKey: "relatedRefund",
  },
  ethics: {
    path: String(ROUTES.PUBLIC.ETHICS),
    namespace: "ethics",
    firestoreField: "ethics",
    relatedLabelKey: "relatedEthics",
  },
  conduct: {
    path: String(ROUTES.PUBLIC.CODE_OF_CONDUCT),
    namespace: "codeOfConduct",
    firestoreField: "codeOfConduct",
    relatedLabelKey: "relatedConduct",
  },
  cancellation: {
    path: String(ROUTES.PUBLIC.CANCELLATION_POLICY),
    namespace: "cancellationPolicy",
    firestoreField: "cancellation",
    relatedLabelKey: "relatedCancellation",
  },
  grievance: {
    path: String(ROUTES.PUBLIC.GRIEVANCE),
    namespace: "grievance",
    firestoreField: "grievance",
    relatedLabelKey: "relatedGrievance",
  },
};

const POLICY_KEYS = Object.keys(POLICY_META) as PolicyKey[];

export async function PolicyPageView({
  policy,
  pageId,
  pageRegionCards = [],
  children,
  title,
  subtitle,
  containerSize,
}: PolicyPageViewProps) {
  const page = { container: PAGE_CONTAINER };

  /*
   * Guide mode — no `policy`, so none of the i18n/admin-HTML-override/
   * related-policies machinery below applies. This is the shell every
   * how-X-works guide used to hand-roll (identical negative-margin wrapper,
   * identical `ProseHero` call with no overrides, identical
   * `AdminComposableRegion` mount) — lifted here so it is ONE copy instead
   * of eight. Everything from the `meta = POLICY_META[policy]` line down is
   * the original policy-mode implementation, untouched.
   */
  if (!policy) {
    const size = containerSize ?? "md";
    return (
      <Div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10">
        <ProseHero title={title} subtitle={subtitle} />
        <Stack gap="14" className={`${page.container[size]}`} padding="content-banner">
          <AdminComposableRegion pageId={pageId} initialCards={pageRegionCards} />
          {children}
        </Stack>
      </Div>
    );
  }

  const meta = POLICY_META[policy];
  const { getTranslations, getLocale } = await import("next-intl/server");

  const t = await getTranslations(meta.namespace);
  const locale = await getLocale();

  // Check Firestore for admin-overridden HTML content
  let adminHtml = "";
  let settings: SiteSettingsDocument | undefined;
  try {
    settings = await siteSettingsRepository.getSingleton();
    adminHtml = settings.legalPages?.[meta.firestoreField] ?? "";
  } catch (_err) {
    void normalizeError(_err);
    // Falls back to the bundled i18n copy below, which is a complete policy in
    // its own right — but an admin who has overridden this page would silently
    // see the old text, so the failure has to be visible to an operator.
    serverLogger.warn("about.policyPageView: siteSettings.legalPages read failed", {
      policy,
      field: meta.firestoreField,
      error: normalizeError(_err).message,
    });
  }

  // i18n fallback sections
  const rawSections = t.raw("sections") as Array<{
    heading: string;
    body: string;
  }>;
  const sections = Array.isArray(rawSections) ? rawSections : [];

  /*
   * 1A-ii composite-sentence cascade — `cancellationPolicy`'s section 3
   * heading names collector-drop/pre-order/clearance inline ("Collector
   * Drops, pre-orders and prize draws"). Overridden here rather than left as
   * static i18n so disabling one of those types drops it from the heading,
   * same as everywhere else this mechanism applies. Scoped to this one
   * (policy, index) pair deliberately — the OTHER 7 policy pages' sections
   * are plain single-topic prose with nothing to cascade.
   */
  if (policy === "cancellation" && sections[3]) {
    sections[3] = {
      ...sections[3],
      heading: getCompositeSentence("cancellationPolicy.sections.3.heading", locale, settings),
      body: getFragmentedParagraph("cancellationPolicy.sections.3.body", locale, settings),
    };
  }

  // Derived from POLICY_META, so a newly added policy appears in every other
  // page's related list automatically and can never link to itself.
  const relatedLinks: { label: string; href: string }[] = POLICY_KEYS.filter(
    (key) => key !== policy,
  ).map((key) => ({
    label: t(POLICY_META[key].relatedLabelKey),
    href: POLICY_META[key].path,
  }));

  return (
    <Div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10">
      {/* Hero */}
      {/* `lastUpdated` is metadata, not prose — hence `subtitleSize="sm"`. */}
      <ProseHero
        width="sm"
        centered={false}
        subtitleSize="sm"
        title={t("title")}
        subtitle={t("lastUpdated")}
      />

      <Div className={`${page.container.sm}`} padding="content-banner">
        <AdminComposableRegion pageId={pageId} initialCards={pageRegionCards} />

        {adminHtml ? (
          /* Admin-set HTML takes priority */
          <Div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: adminHtml }}
          />
        ) : (
          <>
            {/*
             * Intro — `t.has()`, never `t("intro") &&`.
             *
             * On a missing key next-intl logs MISSING_MESSAGE and RETURNS THE
             * KEY PATH, which is always truthy — so the old guard could never
             * be false and rendered the literal string "terms.intro" on the
             * page. `terms` was the one namespace of six that lacked the key.
             */}
            {t.has("intro") && (
              <Text variant="secondary" className="mb-10 leading-relaxed" size="base">
                {t("intro")}
              </Text>
            )}

            {/* Policy sections from i18n */}
            <Stack gap="xl">
              {sections.map((section, i) => (
                <Section key={i}>
                  <Heading level={2} className="mb-3">
                    {section.heading}
                  </Heading>
                  <Text
                    variant="secondary"
                    className="leading-relaxed whitespace-pre-line"
                  >
                    {section.body}
                  </Text>
                </Section>
              ))}
            </Stack>

            {/*
              Caller-supplied block (the grievance officer card). Inside this
              branch on purpose: an admin HTML override replaces the page body,
              and appending a block they cannot see or edit would make the
              override a half-truth.
            */}
            {children}
          </>
        )}

        {/* Related policies footer */}
        {relatedLinks.length > 0 && (
          <Div className={`mt-14 border-t`} border="default" padding="t-xl">
            <Heading
              level={3}
              className="mb-3 uppercase tracking-wide" color="muted" size="sm" weight="semibold"
            >
              {t("relatedTitle")}
            </Heading>
            <Row wrap gap="md">
              {relatedLinks.map((l) => (
                <TextLink
                  key={l.href}
                  href={l.href}
                  variant="muted" size="sm">
                  {l.label}
                </TextLink>
              ))}
            </Row>
          </Div>
        )}
      </Div>
    </Div>
  );
}
