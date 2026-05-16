import type { ReactElement } from "react";

export interface ReviewOgData {
  productTitle: string;
  rating: number;
  reviewerInitial: string;
  reviewExcerpt?: string | null;
}

interface ReviewDocLike {
  title?: string | null;
  productName?: string | null;
  rating?: number | null;
  userName?: string | null;
  body?: string | null;
}

function stars(n: number): string {
  return "★".repeat(Math.min(5, Math.max(1, Math.round(n))));
}

export function renderReviewOg(
  doc: ReviewDocLike | null | undefined,
  opts: { siteName: string },
): ReactElement {
  return renderReviewOgImage(
    {
      productTitle: doc?.productName ?? doc?.title ?? "Collectible",
      rating: doc?.rating ?? 5,
      reviewerInitial: (doc?.userName?.[0] ?? "?").toUpperCase(),
      reviewExcerpt: doc?.body ? doc.body.slice(0, 120) : null,
    },
    opts.siteName,
  );
}

export function renderReviewOgImage(data: ReviewOgData, siteName: string): ReactElement {
  const { productTitle, rating, reviewerInitial, reviewExcerpt } = data;

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#0f172a",
        fontFamily: "sans-serif",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px",
        position: "relative",
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
          width: "100%",
          maxWidth: 1080,
          gap: 32,
        }}
      >
        <div style={{ fontSize: 18, color: "#94a3b8", letterSpacing: 2, textTransform: "uppercase" }}>
          {siteName} · Customer Review
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              background: "linear-gradient(135deg, #3570fc, #e91e8c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 700,
              color: "white",
              flexShrink: 0,
            }}
          >
            {reviewerInitial}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 32, color: "#f59e0b", letterSpacing: 2 }}>
              {stars(rating)}
            </div>
            <div style={{ fontSize: 20, color: "#64748b" }}>
              {rating}/5
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#f1f5f9",
            lineHeight: 1.2,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {productTitle}
        </div>
        {reviewExcerpt && (
          <div
            style={{
              fontSize: 24,
              color: "#94a3b8",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            &ldquo;{reviewExcerpt}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}
