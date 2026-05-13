/**
 * Category OG image renderer — S6 OG1.
 *
 * Two layers:
 *  - `renderCategoryOg(doc, opts)` — high-level: maps a raw category doc
 *    (from `getCategoryForDetail`) into the OG data shape.
 *  - `renderCategoryOgImage(data, siteName)` — pure JSX primitive, no
 *    next/og dependency; consumer wraps with `new ImageResponse(...)`.
 *
 * Mirrors the brand/store OG layout so the public catalog feels uniform.
 */

import type { ReactElement } from "react";

export interface CategoryOgData {
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
  productCount?: number | null;
}

interface CategoryDocLike {
  name?: string | null;
  description?: string | null;
  display?: { coverImage?: string | null } | null;
  metrics?: { totalItemCount?: number | null } | null;
}

export function renderCategoryOg(
  doc: CategoryDocLike | null | undefined,
  opts: { siteName: string },
): ReactElement {
  const name = doc?.name ?? "Category";
  return renderCategoryOgImage(
    {
      name,
      description:
        doc?.description?.slice(0, 140) ??
        `Browse ${name} on ${opts.siteName}.`,
      coverImageUrl: doc?.display?.coverImage ?? null,
      productCount: doc?.metrics?.totalItemCount ?? null,
    },
    opts.siteName,
  );
}

export function renderCategoryOgImage(
  data: CategoryOgData,
  siteName: string,
): ReactElement {
  const { name, description, coverImageUrl, productCount } = data;
  const itemLabel =
    typeof productCount === "number" && productCount > 0
      ? `${productCount.toLocaleString("en-IN")} item${productCount === 1 ? "" : "s"}`
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
      {coverImageUrl && (
        <img
          src={coverImageUrl}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.35,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.7) 100%)",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          padding: "80px 72px",
          width: "100%",
          height: "100%",
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            fontSize: 18,
            color: "#94a3b8",
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {siteName} · Category
        </div>
        <div
          style={{
            fontSize: 76,
            fontWeight: 800,
            color: "#f8fafc",
            lineHeight: 1.05,
            letterSpacing: -1,
          }}
        >
          {name}
        </div>
        {description && (
          <div
            style={{
              fontSize: 26,
              color: "#cbd5e1",
              fontWeight: 400,
              lineHeight: 1.35,
              maxWidth: 960,
            }}
          >
            {description}
          </div>
        )}
        {itemLabel && (
          <div
            style={{
              display: "inline-flex",
              alignSelf: "flex-start",
              padding: "10px 22px",
              borderRadius: 999,
              background: "rgba(56, 189, 248, 0.18)",
              color: "#e0f2fe",
              fontSize: 22,
              fontWeight: 600,
              border: "1px solid rgba(56, 189, 248, 0.4)",
              marginTop: 8,
            }}
          >
            {itemLabel}
          </div>
        )}
      </div>
    </div>
  );
}
