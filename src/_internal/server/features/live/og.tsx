import type { ReactElement } from "react";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import { renderOgLayout } from "../seo/og-layout";
import { resolveOgImageUrl } from "../seo/og";

export interface LiveItemOgData {
  title: string;
  species?: string | null;
  priceLabel?: string | null;
  imageUrl?: string | null;
}

interface LiveItemDocLike {
  title?: string | null;
  price?: number | null;
  currency?: string | null;
  mainImage?: string | null;
  images?: (string | null | undefined)[] | null;
  liveItem?: { species?: string } | null;
}

export function renderLiveItemOg(
  doc: LiveItemDocLike | null | undefined,
  opts: { siteName: string; baseUrl?: string },
): ReactElement {
  const priceLabel =
    doc?.price != null
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: doc.currency ?? "INR",
          maximumFractionDigits: 0,
        }).format(doc.price / 100)
      : null;

  return renderLiveItemOgImage(
    {
      title: doc?.title ?? "Live Listing",
      species: doc?.liveItem?.species ?? null,
      priceLabel,
      imageUrl: resolveOgImageUrl(doc?.mainImage || doc?.images?.[0] || null, opts.baseUrl),
    },
    opts.siteName,
  );
}

export function renderLiveItemOgImage(data: LiveItemOgData, siteName: string): ReactElement {
  return renderOgLayout({
    title: data.title,
    subtitle: data.species ?? undefined,
    imageUrl: data.imageUrl,
    siteName: `${siteName} · Live Listing`,
    accentSlot: data.priceLabel,
    theme: { background: "#052e16", accentColor: "#86efac" },
  });
}

/** Type-safe overload that accepts the full ProductDocument. */
export function renderLiveItemOgFromDoc(
  doc: ProductDocument | null | undefined,
  opts: { siteName: string; baseUrl?: string },
): ReactElement {
  return renderLiveItemOg(doc, opts);
}
