import { ROUTES } from "../../../constants";
import { THEME_CONSTANTS } from "../../../tokens";
import { Div, Heading, Text, Section, Stack } from "../../../ui";
import { TextLink } from "../../../ui";
import { ShieldAlert, Home, LogIn } from "lucide-react";

const DEFAULT_HERO_CLASS =
  "bg-gradient-to-br from-rose-600 to-red-700 dark:from-rose-700 dark:to-red-800";

export interface UnauthorizedViewProps {
  heroBannerClass?: string;
}

export async function UnauthorizedView({
  heroBannerClass = DEFAULT_HERO_CLASS,
}: UnauthorizedViewProps = {}) {
  const { themed, flex, page } = THEME_CONSTANTS;
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("unauthorized");

  const LINKS = [
    {
      icon: Home,
      label: t("linkHome"),
      href: String(ROUTES.HOME),
      isPrimary: true,
    },
    {
      icon: LogIn,
      label: t("linkLogin"),
      href: String(ROUTES.AUTH.LOGIN),
      isPrimary: false,
    },
  ];

  return (
    <Div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10">
      <Section
        className={`${heroBannerClass} text-white min-h-[60vh] flex flex-col items-center justify-center py-20 text-center`}
      >
        <Div className={`${page.container.sm}`}>
          <Div className={`w-20 h-20 ${flex.center} mx-auto mb-6`} surface="default" rounded="2xl">
            <ShieldAlert className="w-10 h-10 text-white" />
          </Div>
          <Heading
            level={1}
            variant="none"
            className="mb-4 text-white" size="4xl"
          >
            {t("title")}
          </Heading>
          <Text
            variant="none"
            className="text-white/80 max-w-lg mx-auto mb-8" size="lg"
          >
            {t("subtitle")}
          </Text>
          <Div className={`${flex.center} gap-4 flex-wrap`}>
            {LINKS.map(({ icon: Icon, label, href, isPrimary }) => (
              <TextLink
                key={href}
                href={href}
                className={
                  isPrimary
                    ? "bg-white text-rose-700 font-semibold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-colors"
                    : "border border-white/40 text-white px-6 py-2.5 rounded-xl hover:bg-white/10 transition-colors"
                }
              >
                <span className="inline-flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {label}
                </span>
              </TextLink>
            ))}
          </Div>
        </Div>
      </Section>

      <Div className={`${page.container.sm}`} padding="y-2xl">
        <Section
          className={`text-center border ${themed.border} ${themed.bgSecondary}`} rounded="2xl" padding="lg"
        >
          <Heading level={2} className="mb-2" size="base">
            {t("helpTitle")}
          </Heading>
          <Text variant="secondary" className="mb-3" size="sm">
            {t("helpText")}
          </Text>
          <Stack gap="sm" className="flex-row flex-wrap justify-center gap-4">
            <TextLink
              href={String(ROUTES.PUBLIC.HELP)}
              variant="muted"
              className="text-sm"
            >
              {t("helpCenter")}
            </TextLink>
            <TextLink
              href={String(ROUTES.PUBLIC.CONTACT)}
              variant="muted"
              className="text-sm"
            >
              {t("contact")}
            </TextLink>
          </Stack>
        </Section>
      </Div>
    </Div>
  );
}
