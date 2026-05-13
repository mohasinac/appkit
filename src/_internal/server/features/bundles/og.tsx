/**
 * Bundle OG image renderer — S-SBUNI-4 2026-05-13.
 *
 * Two layers (mirror of categories/og.tsx):
 *  - `renderBundleOg(doc, opts)` — high-level: maps a bundle CategoryDocument
 *    (categoryType:"bundle") into the OG data shape.
 *  - `renderBundleOgImage(data, siteName)` — pure JSX primitive, no next/og
 *    dependency; consumer wraps with `new ImageResponse(...)`.
 *
 * Bundle-specific accents over the category layout:
 *  - Header pill says "Bundle" instead of "Category"
 *  - Price + item-count chip-row replaces the category itemCount pill
 *  - Stock-status badge surfaces when bundleStockStatus !== "in_stock"
 */

import type { ReactElement } from "react";

export interface BundleOgData {
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
  priceLabel?: string | null;
  itemCount?: number | null;
  stockStatus?: "in_stock" | "partial" | "out_of_stock" | null;
}

interface BundleDocLike {
  name?: string | null;
  description?: string | null;
  display?: { coverImage?: string | null } | null;
  bundlePriceInPaise?: number | null;
  bundleProductIds?: string[] | null;
  bundleStockStatus?: "in_stock" | "partial" | "out_of_stock" | null;
}

function formatPriceInr(paise: number): string {
  const rupees = Math.round(paise / 100);
  return `₹${rupees.toLocaleString("en-IN")}`;
}

export function renderBundleOg(
  doc: BundleDocLike | null | undefined,
  opts: { siteName: string },
): ReactElement {
  const name = doc?.name ?? "Bundle";
  const priceLabel =
    typeof doc?.bundlePriceInPaise === "number" && doc.bundlePriceInPaise > 0
      ? formatPriceInr(doc.bundlePriceInPaise)
      : null;
  return renderBundleOgImage(
    {
      name,
      description:
        doc?.description?.slice(0, 140) ??
        `Curated multi-product bundle on ${opts.siteName}.`,
      coverImageUrl: doc?.display?.coverImage ?? null,
      priceLabel,
      itemCount: doc?.bundleProductIds?.length ?? null,
      stockStatus: doc?.bundleStockStatus ?? null,
    },
    opts.siteName,
  );
}

const STOCK_BADGE: Record<
  NonNullable<BundleOgData["stockStatus"]>,
  { text: string; bg: string; border: string; color: string } | null
> = {
  in_stock: null,
  partial: {
    text: "Partial stock",
    bg: "rgba(234, 179, 8, 0.18)",
    border: "rgba(234, 179, 8, 0.4)",
    color: "#fef3c7",
  },
  out_of_stock: {
    text: "Out of stock",
    bg: "rgba(239, 68, 68, 0.18)",
    border: "rgba(239, 68, 68, 0.45)",
    color: "#fee2e2",
  },
};

export function renderBundleOgImage(
  data: BundleOgData,
  siteName: string,
): ReactElement {
  const { name, description, coverImageUrl, priceLabel, itemCount, stockStatus } = data;
  const itemLabel =
    typeof itemCount === "number" && itemCount > 0
      ? `${itemCount} item${itemCount === 1 ? "" : "s"}`
      : null;
  const stockBadge = stockStatus ? STOCK_BADGE[stockStatus] : null;

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
      {coverImageUrl && (
        <img
          src={coverImageUrl}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.35,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.7) 100%)",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          padding: "80px 72px",
          width: "100%",
          height: "100%",
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            fontSize: 18,
            color: "#94a3b8",
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {siteName} · Bundle
        </div>
        <div
          style={{
            fontSize: 76,
            fontWeight: 800,
            color: "#f8fafc",
            lineHeight: 1.05,
            letterSpacing: -1,
          }}
        >
          {name}
        </div>
        {description && (
          <div
            style={{
              fontSize: 26,
              color: "#cbd5e1",
              fontWeight: 400,
              lineHeight: 1.35,
              maxWidth: 960,
            }}
          >
            {description}
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 12,
            marginTop: 8,
            flexWrap: "wrap",
          }}
        >
          {priceLabel && (
            <div
              style={{
                display: "inline-flex",
                padding: "10px 22px",
                borderRadius: 999,
                background: "rgba(56, 189, 248, 0.18)",
                color: "#e0f2fe",
                fontSize: 26,
                fontWeight: 700,
                border: "1px solid rgba(56, 189, 248, 0.4)",
              }}
            >
              {priceLabel}
            </div>
          )}
          {itemLabel && (
            <div
              style={{
                display: "inline-flex",
                padding: "10px 22px",
                borderRadius: 999,
                background: "rgba(148, 163, 184, 0.18)",
                color: "#e2e8f0",
                fontSize: 22,
                fontWeight: 600,
                border: "1px solid rgba(148, 163, 184, 0.35)",
              }}
            >
              {itemLabel}
            </div>
          )}
          {stockBadge && (
            <div
              style={{
                display: "inline-flex",
                padding: "10px 22px",
                borderRadius: 999,
                background: stockBadge.bg,
                color: stockBadge.color,
                fontSize: 22,
                fontWeight: 600,
                border: `1px solid ${stockBadge.border}`,
              }}
            >
              {stockBadge.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
