import type { ReactElement } from "react";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import { renderOgLayout } from "../seo/og-layout";
import { resolveOgImageUrl } from "../seo/og";

export interface ClassifiedOgData {
  title: string;
  location?: string | null;
  imageUrl?: string | null;
}

interface ClassifiedDocLike {
  title?: string | null;
  price?: number | null;
  currency?: string | null;
  mainImage?: string | null;
  images?: (string | null | undefined)[] | null;
  classified?: { meetupArea?: { city?: string; locality?: string } } | null;
}

export function renderClassifiedOg(
  doc: ClassifiedDocLike | null | undefined,
  opts: { siteName: string; baseUrl?: string },
): ReactElement {
  const meta = doc?.classified;
  const location = meta?.meetupArea
    ? [meta.meetupArea.locality, meta.meetupArea.city].filter(Boolean).join(", ")
    : null;

  return renderClassifiedOgImage(
    {
      title: doc?.title ?? "Classified Listing",
      location,
      imageUrl: resolveOgImageUrl(doc?.mainImage || doc?.images?.[0] || null, opts.baseUrl),
    },
    opts.siteName,
  );
}

export function renderClassifiedOgImage(data: ClassifiedOgData, siteName: string): ReactElement {
  return renderOgLayout({
    title: data.title,
    subtitle: data.location ?? undefined,
    imageUrl: data.imageUrl,
    siteName: `${siteName} · Classified`,
    accentSlot: null,
    theme: { accentColor: "#38bdf8" },
  });
}

/** Type-safe overload that accepts the full ProductDocument. */
export function renderClassifiedOgFromDoc(
  doc: ProductDocument | null | undefined,
  opts: { siteName: string; baseUrl?: string },
): ReactElement {
  return renderClassifiedOg(doc, opts);
}
