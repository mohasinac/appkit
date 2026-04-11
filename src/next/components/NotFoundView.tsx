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
  homeHref = "/",
}: NotFoundViewProps) {
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
        404
      </h1>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>{heading}</h2>
      <p style={{ opacity: 0.7, marginBottom: "2rem" }}>{description}</p>
      <a href={homeHref}>{homeLabel}</a>
    </div>
  );
}
