import type { ReactElement } from "react";
import { renderOgLayout } from "../seo/og-layout";
import { resolveOgImageUrl } from "../seo/og";

export interface CatalogueItemOgData {
  title: string;
  ownerName?: string | null;
  imageUrl?: string | null;
}

interface CatalogueItemDocLike {
  title?: string | null;
  price?: number | null;
  mainImage?: string | null;
  images?: (string | null | undefined)[] | null;
}

export function renderCatalogueItemOg(
  doc: CatalogueItemDocLike | null | undefined,
  opts: { siteName: string; baseUrl?: string; ownerName?: string | null },
): ReactElement {
  return renderCatalogueItemOgImage(
    {
      title: doc?.title ?? "Catalogue Item",
      ownerName: opts.ownerName,
      imageUrl: resolveOgImageUrl(doc?.mainImage || doc?.images?.[0] || null, opts.baseUrl),
    },
    opts.siteName,
  );
}

export function renderCatalogueItemOgImage(data: CatalogueItemOgData, siteName: string): ReactElement {
  return renderOgLayout({
    title: data.title,
    subtitle: data.ownerName ? `Owned by ${data.ownerName}` : undefined,
    imageUrl: data.imageUrl,
    siteName: `${siteName} · Catalogue`,
    accentSlot: null,
    theme: { accentColor: "#a78bfa" },
  });
}
