import type { ReactElement } from "react";

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
  opts: { siteName: string; locale?: string },
): ReactElement {
  const locale = opts.locale ?? "en-IN";
  const endDate = doc?.auctionEndDate
    ? doc.auctionEndDate instanceof Date
      ? doc.auctionEndDate
      : new Date(doc.auctionEndDate as unknown as string)
    : null;
  const endsLabel = endDate
    ? `Ends ${endDate.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}`
    : null;
  return renderAuctionOgImage(
    {
      title: doc?.title ?? "Live Auction",
      endsLabel,
      imageUrl: doc?.mainImage || doc?.images?.[0] || null,
    },
    opts.siteName,
  );
}

export function renderAuctionOgImage(data: AuctionOgData, siteName: string): ReactElement {
  const { title, endsLabel, imageUrl } = data;

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
          <div style={{ fontSize: 20, color: "#f59e0b", fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
            {siteName} · Live Auction
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
          {endsLabel && (
            <div style={{ fontSize: 28, fontWeight: 600, color: "#f59e0b" }}>
              {endsLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
