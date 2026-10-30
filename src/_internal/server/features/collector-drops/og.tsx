import type { ReactElement } from "react";
import { renderOgLayout } from "../seo/og-layout";
import { resolveOgImageUrl } from "../seo/og";

export interface CollectorDropOgData {
  title: string;
  endsLabel?: string | null;
  imageUrl?: string | null;
}

interface CollectorDropDocLike {
  title?: string | null;
  collectorDropEndDate?: Date | string | null;
  mainImage?: string | null;
  images?: ({ url: string } | string | null | undefined)[] | null;
}

/** High-level OG renderer — accepts the raw collector drop document from `getCollectorDropForDetail`. */
export function renderCollectorDropOg(
  doc: CollectorDropDocLike | null | undefined,
  opts: { siteName: string; locale?: string; baseUrl?: string },
): ReactElement {
  const locale = opts.locale ?? "en-IN";
  const endDate = doc?.collectorDropEndDate
    ? doc.collectorDropEndDate instanceof Date
      ? doc.collectorDropEndDate
      : new Date(doc.collectorDropEndDate as unknown as string)
    : null;
  const endsLabel = endDate
    ? `Ends ${endDate.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}`
    : null;
  return renderCollectorDropOgImage(
    {
      title: doc?.title ?? "Live Collector Drop",
      endsLabel,
      imageUrl: resolveOgImageUrl(doc?.mainImage ||
          (typeof doc?.images?.[0] === "string" ? doc.images[0] : doc?.images?.[0]?.url) ||
          null, opts.baseUrl),
    },
    opts.siteName,
  );
}

export function renderCollectorDropOgImage(data: CollectorDropOgData, siteName: string): ReactElement {
  return renderOgLayout({
    title: data.title,
    imageUrl: data.imageUrl,
    siteName: `${siteName} · Live Collector Drop`,
    accentSlot: data.endsLabel,
    theme: { accentColor: "#f59e0b" },
  });
}
