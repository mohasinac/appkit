import { ROUTES } from "../../../constants";
import { THEME_CONSTANTS } from "../../../tokens";
import { Div, Heading, Text, Section, Stack } from "../../../ui";
import { TextLink } from "../../../ui";
import { siteSettingsRepository } from "../../../repositories";

const DEFAULT_HERO_CLASS =
  "bg-gradient-to-br from-violet-700 to-indigo-700 dark:from-violet-800 dark:to-indigo-800";

export interface PolicyPageViewProps {
  /** Which policy to render */
  policy: "privacy" | "terms" | "cookies" | "refund";
  heroBannerClass?: string;
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
  heroBannerClass = DEFAULT_HERO_CLASS,
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
        className={`${heroBannerClass} text-white py-14 md:py-16 lg:py-20`}
      >
        <Div className={`${page.container.sm}`}>
          <Heading level={1} variant="none" className="mb-3 text-white">
            {t("title")}
          </Heading>
          <Text variant="none" className="text-white/80 text-sm">
            {t("lastUpdated")}
          </Text>
        </Div>
      </Section>

      <Div className={`${page.container.sm} py-10 md:py-12 lg:py-16`}>
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
              <Text variant="secondary" className="mb-10 text-base leading-relaxed">
                {t("intro")}
              </Text>
            )}

            {/* Policy sections from i18n */}
            <Stack gap="xl" className="space-y-10">
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
          <Div className={`mt-14 pt-8 border-t ${themed.border}`}>
            <Heading
              level={3}
              className="text-sm font-semibold mb-3 uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
            >
              {t("relatedTitle")}
            </Heading>
            <Div className="flex flex-wrap gap-4">
              {relatedLinks.map((l) => (
                <TextLink
                  key={l.href}
                  href={l.href}
                  variant="muted"
                  className="text-sm"
                >
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
