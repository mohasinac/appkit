import { ROUTES } from "../../../constants";
import { THEME_CONSTANTS } from "../../../tokens";
import { Div, Heading, Text, Section, Stack } from "../../../ui";
import { TextLink } from "../../../ui";
import { siteSettingsRepository } from "../../../repositories";


export interface PolicyPageViewProps {
  /** Which policy to render */
  policy: "privacy" | "terms" | "cookies" | "refund";
}

const namespaceMap = {
  privacy: "privacy",
  terms: "terms",
  cookies: "cookies",
  refund: "refundPolicy",
} as const;

const firestoreFieldMap: Record<PolicyPageViewProps["policy"], string> = {
  privacy: "privacy",
  terms: "terms",
  cookies: "cookies",
  refund: "refundPolicy",
};

export async function PolicyPageView({
  policy,
}: PolicyPageViewProps) {
  const { themed, page } = THEME_CONSTANTS;
  const { getTranslations } = await import("next-intl/server");

  const t = await getTranslations(namespaceMap[policy]);

  // Check Firestore for admin-overridden HTML content
  let adminHtml = "";
  try {
    const settings = await siteSettingsRepository.getSingleton();
    const legalPages = (settings as any).legalPages ?? {};
    adminHtml = legalPages[firestoreFieldMap[policy]] ?? "";
  } catch {
    // Firestore unavailable — fall back to i18n
  }

  // i18n fallback sections
  const rawSections = t.raw("sections") as Array<{
    heading: string;
    body: string;
  }>;
  const sections = Array.isArray(rawSections) ? rawSections : [];

  const relatedLinks: { label: string; href: string }[] = [
    { label: t("relatedPrivacy"), href: String(ROUTES.PUBLIC.PRIVACY) },
    { label: t("relatedTerms"), href: String(ROUTES.PUBLIC.TERMS) },
    { label: t("relatedCookies"), href: String(ROUTES.PUBLIC.COOKIE_POLICY) },
    { label: t("relatedRefund"), href: String(ROUTES.PUBLIC.REFUND_POLICY) },
  ].filter((l) => {
    const policyPath = { privacy: "/privacy", terms: "/terms", cookies: "/cookies", refund: "/refund-policy" }[policy];
    return !l.href.endsWith(policyPath ?? "");
  });

  return (
    <Div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10">
      {/* Hero */}
      <Section
        tone="accent-banner" className="text-white md:py-16 lg:py-20" padding="y-2-5xl"
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

      <Div className={`${page.container.sm} md:py-12 lg:py-16`} padding="y-2xl">
        {adminHtml ? (
          /* Admin-set HTML takes priority */
          <div
            className="prose prose-neutral dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: adminHtml }}
          />
        ) : (
          <>
            {/* Intro */}
            {t("intro") && (
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
            <Div className="flex flex-wrap gap-4">
              {relatedLinks.map((l) => (
                <TextLink
                  key={l.href}
                  href={l.href}
                  variant="muted" size="sm">
                  {l.label}
                </TextLink>
              ))}
            </Div>
          </Div>
        )}
      </Div>
    </Div>
  );
}
