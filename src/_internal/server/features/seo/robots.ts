import type { MetadataRoute } from "next";
// The defining module, not the `/client` entry — this is reached from
// server-only metadata paths (Root Cause #76).
import { ROUTES } from "../../../../next/routing/route-map";

export interface RobotsOptions {
  siteUrl: string;
}

export function buildRobots({ siteUrl }: RobotsOptions): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/", // audit-hardcoded-api-routes-ok: robots.txt disallow prefix, not an endpoint reference
          "/store/",
          "/user/",
          "/auth/",
          "/checkout/",
          "/cart/",
          /*
           * The one entry here that is a PAGE rather than a subtree prefix —
           * its twelve siblings end in "/" because they disallow a whole tree,
           * and `/wishlist` is a single route. So it genuinely is a route
           * reference and takes the constant; the earlier
           * eslint-disable here was treating a real finding as noise.
           */
          ROUTES.USER.WISHLIST,
          /*
           * Admin-only tool under a public prefix. Belongs here for the same
           * reason /admin/ does, and takes the CONSTANT rather than a literal
           * so a route rename cannot leave this entry pointing at nothing.
           *
           * 🛑 A Disallow stops the crawl, which means the page's own
           * `noindex` is never read — the layout's server-side redirect is
           * what actually guarantees there is no indexable content here.
           */
          ROUTES.PUBLIC.TOOL_STICKER_TRACER,
          "/preview/",
          "/track/",
          "/unauthorized/",
          /*
           * 🛑 `/_next/` IS DELIBERATELY NOT DISALLOWED — do not re-add it.
           *
           * It was here until 2026-10-24 and it was blocking Googlebot from
           * fetching the app's own JS and CSS chunks, i.e. from RENDERING the
           * page at all. Google's guidance is explicit that blocking resources
           * needed for rendering harms how a page is understood.
           *
           * It was actively load-bearing here rather than merely untidy: every
           * dynamic route streams its metadata late, so the `<title>` lands
           * inside `<body>` (measured at byte 563,190 of a 747 KB document,
           * with the `<head>` ending at 8,180 carrying no title at all). The
           * one mechanism that recovers it is React hoisting those tags into
           * `<head>` during hydration — which cannot happen if the crawler is
           * forbidden from downloading the script that performs the hoist.
           *
           * Blocking it buys nothing: these are immutable, content-hashed
           * static assets that are not indexable documents, and Google does not
           * list them as search results.
           */
          "/profile/*/edit",
        ],
      },
      {
        userAgent: ["GPTBot", "ChatGPT-User", "Google-Extended", "CCBot"],
        disallow: "/",
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
