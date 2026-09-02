import { normalizeError } from "../../../errors/normalize";
import { serverLogger } from "../../../monitoring/server-logger";
import { Row } from "@mohasinac/appkit/ui";
import { ROUTES } from "../../../constants";
import { PAGE_CONTAINER } from "../../../_internal/shared/styles/page";
import { Div, Heading, Text, Section, Stack } from "../../../ui";
import { TextLink } from "../../../ui";
import { siteSettingsRepository } from "../../../repositories";
import type { SiteSettingsDocument } from "../../admin/schemas/firestore";


export type PolicyKey =
  | "privacy"
  | "terms"
  | "cookies"
  | "refund"
  | "ethics"
  | "conduct";

export interface PolicyPageViewProps {
  /** Which policy to render */
  policy: PolicyKey;
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
};

const POLICY_KEYS = Object.keys(POLICY_META) as PolicyKey[];

export async function PolicyPageView({
  policy,
}: PolicyPageViewProps) {
  const page = { container: PAGE_CONTAINER };
  const meta = POLICY_META[policy];
  const { getTranslations } = await import("next-intl/server");

  const t = await getTranslations(meta.namespace);

  // Check Firestore for admin-overridden HTML content
  let adminHtml = "";
  try {
    const settings = await siteSettingsRepository.getSingleton();
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
      <Section color="inverse" 
        tone="accent-banner" padding="banner"
      >
        <Div className={`${page.container.sm}`}>
          <Heading color="inverse" level={1} variant="none" className="mb-3">
            {t("title")}
          </Heading>
          <Text color="inverse" variant="none" className="/80" size="sm">
            {t("lastUpdated")}
          </Text>
        </Div>
      </Section>

      <Div className={`${page.container.sm}`} padding="content-banner">
        {adminHtml ? (
          /* Admin-set HTML takes priority */
          <Div
            className="prose prose-neutral dark:prose-invert max-w-none"
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
