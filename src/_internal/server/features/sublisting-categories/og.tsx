import type { ReactElement } from "react";

export interface SublistingCategoryOgData {
  name: string;
  description?: string | null;
  productCount?: number | null;
  coverImage?: string | null;
}

interface SublistingCategoryDocLike {
  name?: string | null;
  itemCode?: string | null;
  description?: string | null;
  productCount?: number | null;
  coverImage?: string | null;
}

/** High-level OG renderer — accepts the raw sublisting-category doc from the repository. */
export function renderSublistingCategoryOg(
  doc: SublistingCategoryDocLike | null | undefined,
  opts: { siteName: string },
): ReactElement {
  const baseName = doc?.name ?? "Sub-listing";
  const name = doc?.itemCode ? `${baseName} (${doc.itemCode})` : baseName;
  return renderSublistingCategoryOgImage(
    {
      name,
      description: doc?.description?.slice(0, 120) ?? null,
      productCount: doc?.productCount ?? null,
      coverImage: doc?.coverImage ?? null,
    },
    opts.siteName,
  );
}

export function renderSublistingCategoryOgImage(data: SublistingCategoryOgData, siteName: string): ReactElement {
  const { name, description, productCount, coverImage } = data;
  const countLabel =
    productCount !== null && productCount !== undefined && productCount > 0
      ? `${productCount} listing${productCount !== 1 ? "s" : ""} available`
      : null;

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
      {coverImage && (
        <img
          src={coverImage}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.12 }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(15,23,42,0.82) 100%)",
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
        {coverImage && (
          <img
            src={coverImage}
            alt={name}
            style={{ width: 300, height: 300, objectFit: "cover", borderRadius: 16, flexShrink: 0 }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
          <div style={{ fontSize: 16, color: "#f59e0b", fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
            {siteName} · Listings
          </div>
          <div
            style={{
              fontSize: coverImage ? 48 : 60,
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
                fontSize: 24,
                color: "#94a3b8",
                lineHeight: 1.45,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {description}
            </div>
          )}
          {countLabel && (
            <div style={{ fontSize: 20, fontWeight: 600, color: "#f59e0b" }}>
              {countLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
