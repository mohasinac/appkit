/**
 * NotFoundView — Next.js not-found.tsx template.
 *
 * Rendered when `notFound()` is called inside a route segment, or when a
 * route is not matched.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 *
 * Usage in your app:
 *   // app/[locale]/not-found.tsx
 *   export { NotFoundView as default } from "@mohasinac/appkit/next";
 *
 *   // Or with customisation:
 *   import { NotFoundView } from "@mohasinac/appkit/next";
 *   export default function NotFound() {
 *     return <NotFoundView heading="Page not found" homeHref="/en" />;
 *   }
 */

import { Div } from "../../ui/components/Div";
import { Heading, Text } from "../../ui/components/Typography";
import { TextLink } from "../../ui/components/TextLink";
import { DEFAULT_ROUTE_MAP } from "../routing/route-map";

export interface NotFoundViewProps {
  /** Override the heading text. */
  heading?: string;
  /** Override the body text. */
  description?: string;
  /** Override the "Go home" label. */
  homeLabel?: string;
  /** Override the home link href. */
  homeHref?: string;
}

export function NotFoundView({
  heading = "404 — Page not found",
  description = "The page you are looking for does not exist.",
  homeLabel = "Go home",
  homeHref = DEFAULT_ROUTE_MAP.HOME,
}: NotFoundViewProps) {
  return (
    <Div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
      <Heading level={1} variant="primary" className="text-7xl font-bold mb-2">
        404
      </Heading>
      <Heading level={2} className="mb-3">
        {heading}
      </Heading>
      <Text variant="secondary" className="mb-8">
        {description}
      </Text>
      <TextLink href={homeHref}>{homeLabel}</TextLink>
    </Div>
  );
}
