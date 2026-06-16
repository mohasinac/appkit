import type { ReactElement } from "react";
import { renderOgLayout } from "../seo/og-layout";
import { resolveOgImageUrl } from "../seo/og";

export interface PreOrderOgData {
  title: string;
  releaseDateLabel?: string | null;
  imageUrl?: string | null;
}

interface PreOrderDocLike {
  title?: string | null;
  preOrderReleaseDate?: Date | string | null;
  mainImage?: string | null;
  images?: (string | null | undefined)[] | null;
}

/** High-level OG renderer — accepts the raw pre-order document from `getPreOrderForDetail`. */
export function renderPreOrderOg(
  doc: PreOrderDocLike | null | undefined,
  opts: { siteName: string; locale?: string; baseUrl?: string },
): ReactElement {
  const locale = opts.locale ?? "en-IN";
  const release = doc?.preOrderReleaseDate
    // audit-unknown-ok: TS structural escape — primitive cast
    ? new Date(doc.preOrderReleaseDate as unknown as string)
    : null;
  const releaseDateLabel = release
    ? `Ships ${release.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}`
    : null;
  return renderPreOrderOgImage(
    {
      title: doc?.title ?? "Pre-Order",
      releaseDateLabel,
      imageUrl: resolveOgImageUrl(doc?.mainImage || doc?.images?.[0] || null, opts.baseUrl),
    },
    opts.siteName,
  );
}

export function renderPreOrderOgImage(data: PreOrderOgData, siteName: string): ReactElement {
  return renderOgLayout({
    title: data.title,
    imageUrl: data.imageUrl,
    siteName: `${siteName} · Pre-Order`,
    accentSlot: data.releaseDateLabel,
    theme: { accentColor: "#818cf8" },
  });
}
