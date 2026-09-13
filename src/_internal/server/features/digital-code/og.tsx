import type { ReactElement } from "react";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import { renderOgLayout } from "../seo/og-layout";
import { resolveOgImageUrl } from "../seo/og";

export interface DigitalCodeOgData {
  title: string;
  deliveryMethod?: string | null;
  imageUrl?: string | null;
}

interface DigitalCodeDocLike {
  title?: string | null;
  price?: number | null;
  currency?: string | null;
  mainImage?: string | null;
  images?: (string | null | undefined)[] | null;
  digitalCode?: { codeDeliveryMethod?: string } | null;
}

export function renderDigitalCodeOg(
  doc: DigitalCodeDocLike | null | undefined,
  opts: { siteName: string; baseUrl?: string },
): ReactElement {
  const deliveryMethod =
    doc?.digitalCode?.codeDeliveryMethod === "auto-claim"
      ? "Instant delivery"
      : doc?.digitalCode?.codeDeliveryMethod === "manual-email"
        ? "Delivered via email"
        : null;

  return renderDigitalCodeOgImage(
    {
      title: doc?.title ?? "Digital Code",
      deliveryMethod,
      imageUrl: resolveOgImageUrl(doc?.mainImage || doc?.images?.[0] || null, opts.baseUrl),
    },
    opts.siteName,
  );
}

export function renderDigitalCodeOgImage(
  data: DigitalCodeOgData,
  siteName: string,
): ReactElement {
  return renderOgLayout({
    title: data.title,
    subtitle: data.deliveryMethod ?? undefined,
    imageUrl: data.imageUrl,
    siteName: `${siteName} · Digital Code`,
    accentSlot: null,
    theme: { background: "#0c0a1e", accentColor: "#a78bfa" },
  });
}

/** Type-safe overload that accepts the full ProductDocument. */
export function renderDigitalCodeOgFromDoc(
  doc: ProductDocument | null | undefined,
  opts: { siteName: string; baseUrl?: string },
): ReactElement {
  return renderDigitalCodeOg(doc, opts);
}
