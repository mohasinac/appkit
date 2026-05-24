import type { ReactElement } from "react";
import { renderOgLayout } from "../seo/og-layout";
import { resolveOgImageUrl } from "../seo/og";

export interface StoreOgData {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
}

interface StoreDocLike {
  storeName?: string | null;
  storeDescription?: string | null;
  storeLogoURL?: string | null;
  storeBannerURL?: string | null;
}

/** High-level OG renderer — accepts the raw store document from `getStoreForDetail`. */
export function renderStoreOg(
  doc: StoreDocLike | null | undefined,
  opts: { siteName: string; baseUrl?: string },
): ReactElement {
  return renderStoreOgImage(
    {
      name: doc?.storeName ?? `${opts.siteName} Store`,
      description: doc?.storeDescription?.slice(0, 120) ?? null,
      logoUrl: resolveOgImageUrl(doc?.storeLogoURL ?? null, opts.baseUrl),
      bannerUrl: resolveOgImageUrl(doc?.storeBannerURL ?? null, opts.baseUrl),
    },
    opts.siteName,
  );
}

export function renderStoreOgImage(data: StoreOgData, siteName: string): ReactElement {
  return renderOgLayout({
    title: data.name,
    subtitle: data.description ?? undefined,
    imageUrl: data.logoUrl ?? data.bannerUrl,
    siteName: `${siteName} · Store`,
    theme: { accentColor: "#38bdf8" },
  });
}
