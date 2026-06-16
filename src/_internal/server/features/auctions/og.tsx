import type { ReactElement } from "react";
import { renderOgLayout } from "../seo/og-layout";
import { resolveOgImageUrl } from "../seo/og";

export interface AuctionOgData {
  title: string;
  endsLabel?: string | null;
  imageUrl?: string | null;
}

interface AuctionDocLike {
  title?: string | null;
  auctionEndDate?: Date | string | null;
  mainImage?: string | null;
  images?: (string | null | undefined)[] | null;
}

/** High-level OG renderer — accepts the raw auction document from `getAuctionForDetail`. */
export function renderAuctionOg(
  doc: AuctionDocLike | null | undefined,
  opts: { siteName: string; locale?: string; baseUrl?: string },
): ReactElement {
  const locale = opts.locale ?? "en-IN";
  const endDate = doc?.auctionEndDate
    ? doc.auctionEndDate instanceof Date
      ? doc.auctionEndDate
      // audit-unknown-ok: TS structural escape — primitive cast
      : new Date(doc.auctionEndDate as unknown as string)
    : null;
  const endsLabel = endDate
    ? `Ends ${endDate.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}`
    : null;
  return renderAuctionOgImage(
    {
      title: doc?.title ?? "Live Auction",
      endsLabel,
      imageUrl: resolveOgImageUrl(doc?.mainImage || doc?.images?.[0] || null, opts.baseUrl),
    },
    opts.siteName,
  );
}

export function renderAuctionOgImage(data: AuctionOgData, siteName: string): ReactElement {
  return renderOgLayout({
    title: data.title,
    imageUrl: data.imageUrl,
    siteName: `${siteName} · Live Auction`,
    accentSlot: data.endsLabel,
    theme: { accentColor: "#f59e0b" },
  });
}
