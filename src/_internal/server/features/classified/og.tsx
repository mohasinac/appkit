import type { ReactElement } from "react";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import { resolveOgImageUrl } from "../seo/og";

export interface ClassifiedOgData {
  title: string;
  priceLabel?: string | null;
  location?: string | null;
  imageUrl?: string | null;
}

interface ClassifiedDocLike {
  title?: string | null;
  price?: number | null;
  currency?: string | null;
  mainImage?: string | null;
  images?: (string | null | undefined)[] | null;
  classified?: { meetupArea?: { city?: string; locality?: string } } | null;
}

export function renderClassifiedOg(
  doc: ClassifiedDocLike | null | undefined,
  opts: { siteName: string; baseUrl?: string },
): ReactElement {
  const meta = doc?.classified;
  const location = meta?.meetupArea
    ? [meta.meetupArea.locality, meta.meetupArea.city].filter(Boolean).join(", ")
    : null;

  const priceLabel =
    doc?.price != null
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: doc.currency ?? "INR",
          maximumFractionDigits: 0,
        }).format(doc.price / 100)
      : null;

  return renderClassifiedOgImage(
    {
      title: doc?.title ?? "Classified Listing",
      priceLabel,
      location,
      imageUrl: resolveOgImageUrl(doc?.mainImage || doc?.images?.[0] || null, opts.baseUrl),
    },
    opts.siteName,
  );
}

export function renderClassifiedOgImage(data: ClassifiedOgData, siteName: string): ReactElement {
  const { title, priceLabel, location, imageUrl } = data;

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
            opacity: 0.12,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.96) 0%, rgba(15,23,42,0.82) 100%)",
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
              width: 400,
              height: 400,
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
              color: "#38bdf8",
              fontWeight: 600,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {siteName} · Classified
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
          {priceLabel && (
            <div style={{ fontSize: 32, fontWeight: 700, color: "#4ade80" }}>
              {priceLabel}
            </div>
          )}
          {location && (
            <div style={{ fontSize: 22, color: "#94a3b8" }}>{location}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Type-safe overload that accepts the full ProductDocument. */
export function renderClassifiedOgFromDoc(
  doc: ProductDocument | null | undefined,
  opts: { siteName: string; baseUrl?: string },
): ReactElement {
  return renderClassifiedOg(doc, opts);
}
