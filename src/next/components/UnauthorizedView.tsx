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

import { Row } from "../../ui/components/Layout";
import { Heading, Text } from "../../ui/components/Typography";
import { TextLink } from "../../ui/components/TextLink";
import { SignInLink } from "../../ui/components/SignInLink";
import { DEFAULT_ROUTE_MAP } from "../routing/route-map";

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
import { AdminComposableRegion } from "../../features/dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../_internal/shared/features/dashboard/recent-entry";

import { Stack } from "@mohasinac/appkit/client";
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
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

export function UnauthorizedView({
  heading = "401 — Unauthorized",
  description = "You need to be signed in to view this page.",
  loginLabel = "Sign in",
  loginHref = DEFAULT_ROUTE_MAP.AUTH.LOGIN,
  homeLabel = "Go home",
  homeHref = DEFAULT_ROUTE_MAP.HOME,
  pageRegionCards = [],
}: UnauthorizedViewProps) {
  return (
    <Stack justify="center" className="min-h-[60vh] text-center" padding="x-xl" align="center">
      <Heading level={1} variant="primary" size="7xl" className="mb-2" weight="bold">
        401
      </Heading>
      <Heading level={2} className="mb-3">
        {heading}
      </Heading>
      <Text variant="secondary" className="mb-8">
        {description}
      </Text>
      <Row gap="md">
        <SignInLink href={loginHref} className="text-primary hover:underline">
          {loginLabel}
        </SignInLink>
        <TextLink href={homeHref}>{homeLabel}</TextLink>
      </Row>
      <AdminComposableRegion pageId="unauthorized" initialCards={pageRegionCards} />
    </Stack>
  );
}
