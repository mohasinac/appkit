/**
 * Prize Draw OG image renderer — OG-coverage-followup 2026-05-23.
 * Migrated to renderOgLayout factory 2026-05-24 (Session 5 W1-1).
 */

import type { ReactElement } from "react";
import { renderOgLayout } from "../seo/og-layout";
import { resolveOgImageUrl } from "../seo/og";

export interface PrizeDrawOgData {
  title: string;
  pricePerEntryLabel?: string | null;
  imageUrl?: string | null;
  revealStatus?: "pending" | "open" | "closed" | null;
  entriesLabel?: string | null;
}

interface PrizeDrawDocLike {
  title?: string | null;
  name?: string | null;
  pricePerEntry?: number | null;
  price?: number | null;
  currency?: string | null;
  mainImage?: string | null;
  images?: (string | null | undefined)[] | null;
  prizeRevealStatus?: "pending" | "open" | "closed" | null;
  prizeMaxEntries?: number | null;
  prizeCurrentEntries?: number | null;
}

export function renderPrizeDrawOg(
  doc: PrizeDrawDocLike | null | undefined,
  opts: { siteName: string; baseUrl?: string },
): ReactElement {
  const entryPrice = doc?.pricePerEntry ?? doc?.price ?? null;
  // "Free entry" is kept — it is a fact about the draw, not a disclosed amount,
  // and it is the half of this chip that actually earns a click. The priced case
  // renders nothing: an OG image is a public URL with the value burned into the
  // pixels, which no sign-in gate or paywall markup can reach.
  const pricePerEntryLabel =
    typeof entryPrice === "number" && entryPrice > 0 ? null : "Free entry";

  const max = doc?.prizeMaxEntries ?? null;
  const current = doc?.prizeCurrentEntries ?? 0;
  const entriesLabel =
    typeof max === "number" && max > 0
      ? `${Math.max(0, max - current).toLocaleString("en-IN")} of ${max.toLocaleString("en-IN")} entries left`
      : null;

  return renderPrizeDrawOgImage(
    {
      title: doc?.title ?? doc?.name ?? "Prize Draw",
      pricePerEntryLabel,
      imageUrl: resolveOgImageUrl(doc?.mainImage || doc?.images?.[0] || null, opts.baseUrl),
      revealStatus: doc?.prizeRevealStatus ?? null,
      entriesLabel,
    },
    opts.siteName,
  );
}

const REVEAL_BADGE_TEXT: Record<NonNullable<PrizeDrawOgData["revealStatus"]>, string> = {
  pending: "Reveal pending",
  open: "Reveal open",
  closed: "Reveal closed",
};

export function renderPrizeDrawOgImage(
  data: PrizeDrawOgData,
  siteName: string,
): ReactElement {
  const badges = [
    data.pricePerEntryLabel,
    data.revealStatus ? REVEAL_BADGE_TEXT[data.revealStatus] : null,
  ].filter((s): s is string => Boolean(s));
  return renderOgLayout({
    title: data.title,
    subtitle: data.entriesLabel ?? undefined,
    imageUrl: data.imageUrl,
    siteName: `${siteName} · Prize Draw`,
    badges: badges.length > 0 ? badges : undefined,
    theme: { accentColor: "#fbbf24" },
  });
}
