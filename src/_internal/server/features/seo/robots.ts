import type { MetadataRoute } from "next";

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
          // A robots.txt disallow PREFIX, not a route reference: the twelve
          // siblings here are path patterns ending in "/" and only this one
          // lacks the slash, so it is the sole entry the route-literal selector
          // sees. Same reasoning as the `audit-hardcoded-api-routes-ok` marker
          // on "/api/" above.
          // eslint-disable-next-line no-restricted-syntax
          "/wishlist",
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
