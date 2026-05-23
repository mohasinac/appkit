/**
 * Prize Draw OG image renderer — OG-coverage-followup 2026-05-23.
 *
 * Two layers (mirror of classified/og.tsx):
 *  - `renderPrizeDrawOg(doc, opts)` — maps a ProductDocument with
 *    `listingType:"prize-draw"` into the OG data shape.
 *  - `renderPrizeDrawOgImage(data, siteName)` — pure JSX primitive,
 *    consumer wraps with `new ImageResponse(...)`.
 *
 * Prize-draw-specific accents:
 *  - Header pill says "Prize Draw" with amber accent.
 *  - Per-entry price chip (₹X / entry).
 *  - Reveal status badge (Open / Closed / Pending).
 *  - Entries-remaining chip when prizeMaxEntries is set.
 */

import type { ReactElement } from "react";
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

function formatPriceInr(paise: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function renderPrizeDrawOg(
  doc: PrizeDrawDocLike | null | undefined,
  opts: { siteName: string; baseUrl?: string },
): ReactElement {
  const entryPaise = doc?.pricePerEntry ?? doc?.price ?? null;
  const pricePerEntryLabel =
    typeof entryPaise === "number" && entryPaise > 0
      ? `${formatPriceInr(entryPaise, doc?.currency ?? "INR")} / entry`
      : "Free entry";

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

const REVEAL_BADGE: Record<
  NonNullable<PrizeDrawOgData["revealStatus"]>,
  { text: string; bg: string; border: string; color: string }
> = {
  pending: {
    text: "Reveal pending",
    bg: "rgba(148, 163, 184, 0.18)",
    border: "rgba(148, 163, 184, 0.4)",
    color: "#e2e8f0",
  },
  open: {
    text: "Reveal open",
    bg: "rgba(74, 222, 128, 0.18)",
    border: "rgba(74, 222, 128, 0.4)",
    color: "#bbf7d0",
  },
  closed: {
    text: "Reveal closed",
    bg: "rgba(239, 68, 68, 0.18)",
    border: "rgba(239, 68, 68, 0.45)",
    color: "#fee2e2",
  },
};

export function renderPrizeDrawOgImage(
  data: PrizeDrawOgData,
  siteName: string,
): ReactElement {
  const { title, pricePerEntryLabel, imageUrl, revealStatus, entriesLabel } = data;
  const revealBadge = revealStatus ? REVEAL_BADGE[revealStatus] : null;

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#0f172a",
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.18,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.94) 0%, rgba(15,23,42,0.78) 100%)",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "60px",
          gap: "48px",
          alignItems: "center",
        }}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt={title}
            style={{
              width: 380,
              height: 380,
              objectFit: "contain",
              borderRadius: 16,
              flexShrink: 0,
            }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
          <div
            style={{
              fontSize: 18,
              color: "#fbbf24",
              fontWeight: 600,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {siteName} · Prize Draw
          </div>
          <div
            style={{
              fontSize: imageUrl ? 44 : 56,
              fontWeight: 700,
              color: "#f1f5f9",
              lineHeight: 1.2,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 12,
              marginTop: 4,
              flexWrap: "wrap",
            }}
          >
            {pricePerEntryLabel && (
              <div
                style={{
                  display: "inline-flex",
                  padding: "10px 22px",
                  borderRadius: 999,
                  background: "rgba(251, 191, 36, 0.18)",
                  color: "#fef3c7",
                  fontSize: 24,
                  fontWeight: 700,
                  border: "1px solid rgba(251, 191, 36, 0.4)",
                }}
              >
                {pricePerEntryLabel}
              </div>
            )}
            {revealBadge && (
              <div
                style={{
                  display: "inline-flex",
                  padding: "10px 22px",
                  borderRadius: 999,
                  background: revealBadge.bg,
                  color: revealBadge.color,
                  fontSize: 22,
                  fontWeight: 600,
                  border: `1px solid ${revealBadge.border}`,
                }}
              >
                {revealBadge.text}
              </div>
            )}
          </div>
          {entriesLabel && (
            <div style={{ fontSize: 22, color: "#94a3b8" }}>{entriesLabel}</div>
          )}
        </div>
      </div>
    </div>
  );
}
