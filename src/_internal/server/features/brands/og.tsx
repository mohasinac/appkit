import type { ReactElement } from "react";
import { resolveOgImageUrl } from "../seo/og";

export interface BrandOgData {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
}

interface BrandDocLike {
  name?: string | null;
  description?: string | null;
  logoURL?: string | null;
}

/** High-level OG renderer — accepts the raw brand document from `getBrandForDetail`. */
export function renderBrandOg(
  doc: BrandDocLike | null | undefined,
  opts: { siteName: string; baseUrl?: string },
): ReactElement {
  const name = doc?.name ?? "Brand";
  return renderBrandOgImage(
    {
      name,
      description:
        doc?.description?.slice(0, 120) ??
        `Shop authentic ${name} collectibles on ${opts.siteName}.`,
      logoUrl: resolveOgImageUrl(doc?.logoURL ?? null, opts.baseUrl),
    },
    opts.siteName,
  );
}

export function renderBrandOgImage(data: BrandOgData, siteName: string): ReactElement {
  const { name, description, logoUrl } = data;

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
          gap: 32,
          padding: "60px",
          textAlign: "center",
        }}
      >
        {logoUrl && (
          <img
            src={logoUrl}
            alt={name}
            style={{ width: 160, height: 160, objectFit: "contain", borderRadius: 16 }}
          />
        )}
        <div style={{ fontSize: 18, color: "#94a3b8", fontWeight: 500, letterSpacing: 2, textTransform: "uppercase" }}>
          {siteName}
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, color: "#f1f5f9", lineHeight: 1.1 }}>
          {name}
        </div>
        {description && (
          <div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 800, lineHeight: 1.5 }}>
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
