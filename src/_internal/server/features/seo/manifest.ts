import type { MetadataRoute } from "next";
import { ROUTES } from "../../../../next/routing/route-map";

export interface ManifestOptions {
  name: string;
  shortName: string;
  description: string;
}

export function buildManifest({ name, shortName, description }: ManifestOptions): MetadataRoute.Manifest {
  return {
    name,
    short_name: shortName,
    description,
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#3570fc",
    categories: ["shopping", "marketplace", "business"],
    lang: "en",
    dir: "ltr",
    prefer_related_applications: false,
    icons: [
      {
        src: "/favicon/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable" as any,
      },
      {
        src: "/favicon/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable" as any,
      },
    ],
    screenshots: [],
    shortcuts: [
      {
        name: "Browse Products",
        url: String(ROUTES.PUBLIC.PRODUCTS),
        description: "Browse the latest products",
      },
      {
        name: "Live Auctions",
        url: String(ROUTES.PUBLIC.AUCTIONS),
        description: "Join live auction bidding",
      },
      {
        name: "Categories",
        url: String(ROUTES.PUBLIC.CATEGORIES),
        description: "Explore product categories",
      },
      {
        name: "Stores",
        url: String(ROUTES.PUBLIC.STORES),
        description: "Browse seller storefronts",
      },
    ],
  };
}
