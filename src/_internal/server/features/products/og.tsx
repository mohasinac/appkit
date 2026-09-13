import type { ReactElement } from "react";
import { renderOgLayout } from "../seo/og-layout";
import { resolveOgImageUrl } from "../seo/og";

export interface ProductOgData {
  title: string;
  price?: number | null;
  imageUrl?: string | null;
}

export interface OgOptions {
  siteName: string;
}

interface ProductDocLike {
  title?: string | null;
  price?: number | null;
  mainImage?: string | null;
  images?: (string | null | undefined)[] | null;
}

/** High-level OG renderer — accepts the raw product document from `getProductForDetail`. */
export function renderProductOg(doc: ProductDocLike | null | undefined, opts: OgOptions & { baseUrl?: string }): ReactElement {
  return renderProductOgImage(
    {
      title: doc?.title ?? "Product",
      price: doc?.price ?? null,
      imageUrl: resolveOgImageUrl(doc?.mainImage || doc?.images?.[0] || null, opts.baseUrl),
    },
    opts.siteName,
  );
}

export function renderProductOgImage(data: ProductOgData, siteName: string): ReactElement {
  // 🛑 No money in the accent slot. An OG image is a PUBLIC image URL anyone can
  // fetch directly, with the amount burned into the pixels — no gate reaches it,
  // and no paywall markup describes it. The auction and pre-order OGs already
  // use a non-money accent (end date / release date); this matches them.
  return renderOgLayout({
    title: data.title,
    imageUrl: data.imageUrl,
    siteName,
    accentSlot: null,
  });
}
