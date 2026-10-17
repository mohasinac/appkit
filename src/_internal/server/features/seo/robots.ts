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
          "/preview/",
          "/track/",
          "/unauthorized/",
          "/_next/",
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
