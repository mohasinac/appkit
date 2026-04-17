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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "4rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        401
      </h1>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>{heading}</h2>
      <p style={{ opacity: 0.7, marginBottom: "2rem" }}>{description}</p>
      <div style={{ display: "flex", gap: "1rem" }}>
        <a href={loginHref}>{loginLabel}</a>
        <a href={homeHref}>{homeLabel}</a>
      </div>
    </div>
  );
}
