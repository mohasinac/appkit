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
          "/api/",
          "/seller/",
          "/user/",
          "/auth/",
          "/checkout/",
          "/cart/",
          "/demo/",
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
