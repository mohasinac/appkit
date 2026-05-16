import type { ReactElement } from "react";
import { resolveOgImageUrl } from "../seo/og";

export interface StoreOgData {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
}

interface StoreDocLike {
  storeName?: string | null;
  storeDescription?: string | null;
  storeLogoURL?: string | null;
  storeBannerURL?: string | null;
}

/** High-level OG renderer — accepts the raw store document from `getStoreForDetail`. */
export function renderStoreOg(
  doc: StoreDocLike | null | undefined,
  opts: { siteName: string; baseUrl?: string },
): ReactElement {
  return renderStoreOgImage(
    {
      name: doc?.storeName ?? `${opts.siteName} Store`,
      description: doc?.storeDescription?.slice(0, 120) ?? null,
      logoUrl: resolveOgImageUrl(doc?.storeLogoURL ?? null, opts.baseUrl),
      bannerUrl: resolveOgImageUrl(doc?.storeBannerURL ?? null, opts.baseUrl),
    },
    opts.siteName,
  );
}

export function renderStoreOgImage(data: StoreOgData, siteName: string): ReactElement {
  const { name, description, logoUrl, bannerUrl } = data;
  const bgImage = bannerUrl || logoUrl;

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
      {bgImage && (
        <img
          src={bgImage}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.12 }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(15,23,42,0.85) 100%)",
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
        {logoUrl && (
          <img
            src={logoUrl}
            alt={name}
            style={{ width: 200, height: 200, objectFit: "contain", borderRadius: 16, flexShrink: 0, background: "rgba(255,255,255,0.06)" }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
          <div style={{ fontSize: 18, color: "#38bdf8", fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
            {siteName} · Store
          </div>
          <div
            style={{
              fontSize: logoUrl ? 52 : 62,
              fontWeight: 700,
              color: "#f1f5f9",
              lineHeight: 1.15,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {name}
          </div>
          {description && (
            <div
              style={{
                fontSize: 26,
                color: "#94a3b8",
                lineHeight: 1.4,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
