/**
 * UnauthorizedView — 401 page template.
 *
 * Render this when a user tries to access a resource they are not
 * authenticated for. Wire up the `loginHref` prop to your sign-in route.
 *
 * Usage in your app:
 *   // app/[locale]/unauthorized/page.tsx
 *   import { UnauthorizedView } from "@mohasinac/appkit/next";
 *   export default function UnauthorizedPage() {
 *     return <UnauthorizedView loginHref="/en/auth/login" />;
 *   }
 */

import { Div } from "../../ui/components/Div";
import { Row } from "../../ui/components/Layout";
import { Heading, Text } from "../../ui/components/Typography";
import { TextLink } from "../../ui/components/TextLink";
import { DEFAULT_ROUTE_MAP } from "../routing/route-map";

export interface UnauthorizedViewProps {
  /** Override the heading text. */
  heading?: string;
  /** Override the body text. */
  description?: string;
  /** Label for the sign-in link. */
  loginLabel?: string;
  /** href for the sign-in link. */
  loginHref?: string;
  /** Label for the home link. */
  homeLabel?: string;
  /** href for the home link. */
  homeHref?: string;
}

export function UnauthorizedView({
  heading = "401 — Unauthorized",
  description = "You need to be signed in to view this page.",
  loginLabel = "Sign in",
  loginHref = DEFAULT_ROUTE_MAP.AUTH.LOGIN,
  homeLabel = "Go home",
  homeHref = DEFAULT_ROUTE_MAP.HOME,
}: UnauthorizedViewProps) {
  return (
    <Div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
      <Heading level={1} variant="primary" className="text-7xl font-bold mb-2">
        401
      </Heading>
      <Heading level={2} className="mb-3">
        {heading}
      </Heading>
      <Text variant="secondary" className="mb-8">
        {description}
      </Text>
      <Row gap="md">
        <TextLink href={loginHref}>{loginLabel}</TextLink>
        <TextLink href={homeHref}>{homeLabel}</TextLink>
      </Row>
    </Div>
  );
}
