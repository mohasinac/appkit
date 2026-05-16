import type { ReactElement } from "react";
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
  const { title, price, imageUrl } = data;
  const priceLabel = price ? `₹${(price / 100).toLocaleString("en-IN")}` : null;

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
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.15 }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.8) 100%)",
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
            style={{ width: 420, height: 420, objectFit: "contain", borderRadius: 16, flexShrink: 0 }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
          <div style={{ fontSize: 20, color: "#84e122", fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
            {siteName}
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
            <div style={{ fontSize: 36, fontWeight: 800, color: "#84e122" }}>
              {priceLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
