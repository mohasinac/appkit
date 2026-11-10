import { ROUTES } from "../../../constants";
import { PAGE_CONTAINER } from "../../../_internal/shared/styles/page";
import { Div } from "../../../ui/components/Div";
import { Heading, Span, Text } from "../../../ui/components/Typography";
import { Row } from "../../../ui/components/Layout";
import { Section } from "../../../ui/components/Semantic";
import { TextLink } from "../../../ui/components/TextLink";
import { SignInLink } from "../../../ui/components/SignInLink";
import { ShieldAlert, Home, LogIn } from "lucide-react";

export interface UnauthorizedViewProps {
}

/*
 * 🛑 THE SIGN-IN LINK IS A CLIENT COMPONENT, AND THAT IS NOT INCIDENTAL.
 *
 * This view is a SERVER component, so it cannot read `window.location` to put
 * the current page into `?next=`. The two ways to get it here are a prop
 * threaded from every page that renders this view, or a client leaf that reads
 * it itself. `SignInLink` is the leaf.
 *
 * 🛑 What must NOT be done is a `() => string` prop. A function cannot be
 * serialized into the RSC flight payload; React writes an error row at that
 * prop position, the server render still returns 200 with complete HTML, and
 * the browser dies deserializing it at hydration (minified #441, above every
 * `<Suspense>` boundary). That shape took two content hosts down for a week.
 */

export async function UnauthorizedView({
}: UnauthorizedViewProps = {}) {
  const page = { container: PAGE_CONTAINER };
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("unauthorized");

  const LINKS = [
    {
      icon: Home,
      label: t("linkHome"),
      href: String(ROUTES.HOME),
      isPrimary: true,
      isSignIn: false,
    },
    {
      icon: LogIn,
      label: t("linkLogin"),
      href: String(ROUTES.AUTH.LOGIN),
      isPrimary: false,
      isSignIn: true,
    },
  ];

  return (
    <Div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10">
      <Section padding="y-5xl" color="inverse" layout="flex-col" align="center" justify="center"
        tone="accent-banner" className="min-h-[60vh] text-center"
      >
        <Div className={`${page.container.sm}`}>
          <Row align="center" justify="center" className={`w-20 h-20 mx-auto mb-6`} surface="default" rounded="2xl">
            <ShieldAlert className="w-10 h-10 text-white" />
          </Row>
          <Heading color="inverse" 
            level={1}
            variant="none"
            className="mb-4" size="4xl"
          >
            {t("title")}
          </Heading>
          <Text color="inverse-muted"
            variant="none"
            className="max-w-lg mx-auto mb-8" size="lg"
          >
            {t("subtitle")}
          </Text>
          <Row align="center" justify="center" gap="md" wrap >
            {LINKS.map(({ icon: Icon, label, href, isPrimary, isSignIn }) => {
              const cls = isPrimary
                ? "bg-white text-rose-700 font-semibold px-[var(--appkit-space-6)] py-[var(--appkit-space-2-5)] rounded-xl hover:bg-white/90 transition-colors"
                : "border border-white/40 text-white px-[var(--appkit-space-6)] py-[var(--appkit-space-2-5)] rounded-xl hover:bg-white/10 transition-colors";
              const body = (
                <Span layout="inline-flex" gap="md" >
                  <Icon className="w-4 h-4" />
                  {label}
                </Span>
              );
              return isSignIn ? (
                <SignInLink key={href} href={href} className={cls}>
                  {body}
                </SignInLink>
              ) : (
                <TextLink key={href} href={href} className={cls}>
                  {body}
                </TextLink>
              );
            })}
          </Row>
        </Div>
      </Section>

      <Div className={`${page.container.sm}`} padding="y-2xl">
        <Section
          className={`text-center`} border="default" surface="subtle" rounded="2xl" padding="lg"
        >
          <Heading level={2} className="mb-2" size="base">
            {t("helpTitle")}
          </Heading>
          <Text variant="secondary" className="mb-3" size="sm">
            {t("helpText")}
          </Text>
          <Row justify="center" gap="lg" wrap>
            <TextLink
              href={String(ROUTES.PUBLIC.HELP)}
              variant="muted" size="sm">
              {t("helpCenter")}
            </TextLink>
            <TextLink
              href={String(ROUTES.PUBLIC.CONTACT)}
              variant="muted" size="sm">
              {t("contact")}
            </TextLink>
          </Row>
        </Section>
      </Div>
    </Div>
  );
}
