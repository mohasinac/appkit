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
  images?: ({ url: string } | string | null | undefined)[] | null;
}

/** High-level OG renderer — accepts the raw product document from `getProductForDetail`. */
export function renderProductOg(doc: ProductDocLike | null | undefined, opts: OgOptions & { baseUrl?: string }): ReactElement {
  return renderProductOgImage(
    {
      title: doc?.title ?? "Product",
      price: doc?.price ?? null,
      imageUrl: resolveOgImageUrl(doc?.mainImage ||
          (typeof doc?.images?.[0] === "string" ? doc.images[0] : doc?.images?.[0]?.url) ||
          null, opts.baseUrl),
    },
    opts.siteName,
  );
}

export function renderProductOgImage(data: ProductOgData, siteName: string): ReactElement {
  // 🛑 No money in the accent slot. An OG image is a PUBLIC image URL anyone can
  // fetch directly, with the amount burned into the pixels — no gate reaches it,
  // and no paywall markup describes it. The collector drop and pre-order OGs already
  // use a non-money accent (end date / release date); this matches them.
  return renderOgLayout({
    title: data.title,
    imageUrl: data.imageUrl,
    siteName,
    accentSlot: null,
  });
}


/* ──────────────────────────────────────────────────────────────────────────
 * D5 — the CITY card.
 *
 * 🛑 NO MONEY ON IT, by rule rather than by taste. An OG image is a public
 * image URL with its content burned into the pixels: no sign-in gate reaches it
 * and no paywall markup describes it, so a price here would be the one hole in
 * the guest-price gate that cannot be closed afterwards (Root Cause #93). A
 * COUNT is not an amount, so "6 listings" is fine and "from ₹499" is not.
 *
 * 🛑 And the count is stated only when EXACT. The city page's read is bounded,
 * so past the cap `total` is a floor — and a floor burned into an image cannot
 * be corrected on the next request, because every platform that scrapes it
 * caches the pixels.
 *
 * 🛑 It lives HERE rather than in a `city-og.tsx` of its own because
 * `audit-hex-tokens` and `audit-html-wrappers` both exempt exactly
 * `_internal/server/features/<feature>/og.tsx` — Satori supports neither CSS
 * custom properties nor appkit primitives, so a differently-named OG file
 * fails two audits for rules that cannot apply to it. The exemption encodes
 * the convention; this follows it.
 * ────────────────────────────────────────────────────────────────────────── */

export interface CityOgData {
  city: string;
  state: string;
  /** Exact listing count, or `null` when the read saturated its cap. */
  listingCount: number | null;
}

export function renderCityOg(data: CityOgData, siteName: string): ReactElement {
  const { city, state, listingCount } = data;
  const sub =
    listingCount === null
      ? "Classified listings — meet the seller, inspect, pay in person"
      : listingCount === 0
        ? "No classified listings here right now — everything on site ships nationwide"
        : `${listingCount} classified listing${listingCount === 1 ? "" : "s"} — meet the seller, inspect, pay in person`;

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
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          padding: "60px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 18,
            color: "#94a3b8",
            fontWeight: 500,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {siteName}
        </div>
        <div style={{ fontSize: 68, fontWeight: 800, color: "#f1f5f9", lineHeight: 1.1 }}>
          {city}
        </div>
        <div style={{ fontSize: 28, color: "#cbd5e1", fontWeight: 600 }}>{state}</div>
        <div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 820, lineHeight: 1.5 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}
