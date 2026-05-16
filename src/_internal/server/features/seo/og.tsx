import { ImageResponse } from "next/og";

export const DEFAULT_OG_SIZE = { width: 1200, height: 630 };

/**
 * Resolves a potentially relative image URL to an absolute URL for use in
 * next/og (Satori). Satori cannot resolve relative paths; all <img src> values
 * must be absolute URLs or data URIs.
 */
export function resolveOgImageUrl(
  url: string | null | undefined,
  baseUrl?: string,
): string | null {
  if (!url) return null;
  if (!baseUrl) return url;
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  return `${baseUrl.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
}

export interface DefaultOgOptions {
  siteName: string;
  tagline?: string;
  domain?: string;
  logoUrl?: string;
}

export function buildDefaultOgImage({ siteName, tagline, domain, logoUrl }: DefaultOgOptions): ImageResponse {
  const subtitle = tagline ?? "Shop, Bid & Sell — India's Multi-Seller Marketplace";
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #3570fc 0%, #65c408 50%, #e91e8c 100%)",
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.07,
          backgroundImage:
            "radial-gradient(circle at 25% 25%, white 1px, transparent 0), radial-gradient(circle at 75% 75%, white 1px, transparent 0)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 140,
          height: 140,
          borderRadius: 28,
          background: "rgba(255,255,255,0.18)",
          marginBottom: 36,
          overflow: "hidden",
        }}
      >
        {logoUrl ? (
          <img src={logoUrl} alt={siteName} style={{ width: 100, height: 100, objectFit: "contain" }} />
        ) : (
          <div style={{ fontSize: 64, display: "flex" }}>🛍️</div>
        )}
      </div>
      <div
        style={{
          fontSize: 80,
          fontWeight: 800,
          color: "white",
          letterSpacing: "-2px",
          marginBottom: 16,
          textShadow: "0 4px 24px rgba(0,0,0,0.3)",
          display: "flex",
        }}
      >
        {siteName}
      </div>
      <div
        style={{
          fontSize: 32,
          color: "rgba(255,255,255,0.85)",
          fontWeight: 400,
          letterSpacing: "0.5px",
          display: "flex",
        }}
      >
        {subtitle}
      </div>
      {domain && (
        <div
          style={{
            position: "absolute",
            bottom: 36,
            fontSize: 22,
            color: "rgba(255,255,255,0.6)",
            letterSpacing: "1px",
            display: "flex",
          }}
        >
          {domain}
        </div>
      )}
    </div>,
    { ...DEFAULT_OG_SIZE },
  );
}
