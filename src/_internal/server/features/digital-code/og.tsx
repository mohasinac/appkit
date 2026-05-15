import type { ReactElement } from "react";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export interface DigitalCodeOgData {
  title: string;
  priceLabel?: string | null;
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
  opts: { siteName: string },
): ReactElement {
  const priceLabel =
    doc?.price != null
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: doc.currency ?? "INR",
          maximumFractionDigits: 0,
        }).format(doc.price / 100)
      : null;

  const deliveryMethod =
    doc?.digitalCode?.codeDeliveryMethod === "auto-claim"
      ? "Instant delivery"
      : doc?.digitalCode?.codeDeliveryMethod === "manual-email"
        ? "Delivered via email"
        : null;

  return renderDigitalCodeOgImage(
    {
      title: doc?.title ?? "Digital Code",
      priceLabel,
      deliveryMethod,
      imageUrl: doc?.mainImage || doc?.images?.[0] || null,
    },
    opts.siteName,
  );
}

export function renderDigitalCodeOgImage(
  data: DigitalCodeOgData,
  siteName: string,
): ReactElement {
  const { title, priceLabel, deliveryMethod, imageUrl } = data;

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#0c0a1e",
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
            opacity: 0.1,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(12,10,30,0.97) 0%, rgba(12,10,30,0.83) 100%)",
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
              color: "#a78bfa",
              fontWeight: 600,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {siteName} · Digital Code
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
          {deliveryMethod && (
            <div style={{ fontSize: 22, color: "#94a3b8" }}>{deliveryMethod}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Type-safe overload that accepts the full ProductDocument. */
export function renderDigitalCodeOgFromDoc(
  doc: ProductDocument | null | undefined,
  opts: { siteName: string },
): ReactElement {
  return renderDigitalCodeOg(doc, opts);
}
