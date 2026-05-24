import type { ReactElement } from "react";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import { renderOgLayout } from "../seo/og-layout";
import { resolveOgImageUrl } from "../seo/og";

export interface ClassifiedOgData {
  title: string;
  priceLabel?: string | null;
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

  const priceLabel =
    doc?.price != null
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: doc.currency ?? "INR",
          maximumFractionDigits: 0,
        }).format(doc.price / 100)
      : null;

  return renderClassifiedOgImage(
    {
      title: doc?.title ?? "Classified Listing",
      priceLabel,
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
    accentSlot: data.priceLabel,
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
