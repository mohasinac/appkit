import type { ReactElement } from "react";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export interface LiveItemOgData {
  title: string;
  species?: string | null;
  priceLabel?: string | null;
  imageUrl?: string | null;
}

interface LiveItemDocLike {
  title?: string | null;
  price?: number | null;
  currency?: string | null;
  mainImage?: string | null;
  images?: (string | null | undefined)[] | null;
  liveItem?: { species?: string } | null;
}

export function renderLiveItemOg(
  doc: LiveItemDocLike | null | undefined,
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

  return renderLiveItemOgImage(
    {
      title: doc?.title ?? "Live Listing",
      species: doc?.liveItem?.species ?? null,
      priceLabel,
      imageUrl: doc?.mainImage || doc?.images?.[0] || null,
    },
    opts.siteName,
  );
}

export function renderLiveItemOgImage(data: LiveItemOgData, siteName: string): ReactElement {
  const { title, species, priceLabel, imageUrl } = data;

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#052e16",
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
            opacity: 0.15,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(5,46,22,0.96) 0%, rgba(5,46,22,0.82) 100%)",
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
              color: "#86efac",
              fontWeight: 600,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {siteName} · Live Listing
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
          {species && (
            <div style={{ fontSize: 24, color: "#86efac", fontStyle: "italic" }}>
              {species}
            </div>
          )}
          {priceLabel && (
            <div style={{ fontSize: 32, fontWeight: 700, color: "#4ade80" }}>
              {priceLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Type-safe overload that accepts the full ProductDocument. */
export function renderLiveItemOgFromDoc(
  doc: ProductDocument | null | undefined,
  opts: { siteName: string },
): ReactElement {
  return renderLiveItemOg(doc, opts);
}
