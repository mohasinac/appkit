import { ROUTES } from "../../../constants";
import { THEME_CONSTANTS } from "../../../tokens";
import { Heading, Text, Section, Stack } from "../../../ui";
import { TextLink } from "../../../ui";
import { getTranslations } from "next-intl/server";

const DEFAULT_HERO_CLASS =
  "bg-gradient-to-br from-violet-700 to-indigo-700 dark:from-violet-800 dark:to-indigo-800";

export interface PolicyPageViewProps {
  /** Which policy to render */
  policy: "privacy" | "terms" | "cookies" | "refund";
  heroBannerClass?: string;
}

export async function PolicyPageView({
  policy,
  heroBannerClass = DEFAULT_HERO_CLASS,
}: PolicyPageViewProps) {
  const { themed, page } = THEME_CONSTANTS;

  const namespaceMap = {
    privacy: "privacyPolicy",
    terms: "termsOfService",
    cookies: "cookiePolicy",
    refund: "refundPolicy",
  } as const;

  const t = await getTranslations(namespaceMap[policy]);

  // Each policy namespace must export: title, lastUpdated, intro, sections (JSON array)
  // sections: [{ heading: string, body: string }]
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
  ].filter((l) => !l.href.includes(`/${policy}`));

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10" data-section="policypageview-div-181">
      {/* Hero */}
      <Section
        className={`${heroBannerClass} text-white py-14 md:py-16 lg:py-20`}
      >
        <div className={`${page.container.sm}`} data-section="policypageview-div-182">
          <Heading level={1} variant="none" className="mb-3 text-white">
            {t("title")}
          </Heading>
          <Text variant="none" className="text-white/80 text-sm">
            {t("lastUpdated")}
          </Text>
        </div>
      </Section>

      <div className={`${page.container.sm} py-10 md:py-12 lg:py-16`} data-section="policypageview-div-183">
        {/* Intro */}
        {t("intro") && (
          <Text variant="secondary" className="mb-10 text-base leading-relaxed">
            {t("intro")}
          </Text>
        )}

        {/* Policy sections */}
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

        {/* Related policies footer */}
        {relatedLinks.length > 0 && (
          <div className={`mt-14 pt-8 border-t ${themed.border}`} data-section="policypageview-div-184">
            <Heading
              level={3}
              className="text-sm font-semibold mb-3 uppercase tracking-wide text-neutral-500"
            >
              {t("relatedTitle")}
            </Heading>
            <div className="flex flex-wrap gap-4" data-section="policypageview-div-185">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
