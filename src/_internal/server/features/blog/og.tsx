import type { ReactElement } from "react";

export interface BlogOgData {
  title: string;
  excerpt?: string | null;
  authorName?: string | null;
  category?: string | null;
  coverImage?: string | null;
}

interface BlogDocLike {
  title?: string | null;
  excerpt?: string | null;
  authorName?: string | null;
  category?: string | null;
  coverImage?: string | { url?: string | null } | null;
}

/** High-level OG renderer — accepts the raw blog post document from `getBlogPostForDetail`. */
export function renderBlogOg(
  doc: BlogDocLike | null | undefined,
  opts: { siteName: string },
): ReactElement {
  const coverImage =
    typeof doc?.coverImage === "string"
      ? doc.coverImage
      : (doc?.coverImage as { url?: string } | null | undefined)?.url ?? null;
  return renderBlogOgImage(
    {
      title: doc?.title ?? `${opts.siteName} Blog`,
      excerpt: doc?.excerpt?.slice(0, 120) ?? null,
      authorName: doc?.authorName ?? null,
      category: doc?.category ?? null,
      coverImage,
    },
    opts.siteName,
  );
}

export function renderBlogOgImage(data: BlogOgData, siteName: string): ReactElement {
  const { title, excerpt, authorName, category, coverImage } = data;

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
            alt={title}
            style={{ width: 360, height: 360, objectFit: "cover", borderRadius: 16, flexShrink: 0 }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 16, color: "#34d399", fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
              {siteName} · Blog
            </div>
            {category && (
              <div
                style={{
                  fontSize: 13,
                  color: "#6ee7b7",
                  fontWeight: 500,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  background: "rgba(52,211,153,0.12)",
                  padding: "3px 10px",
                  borderRadius: 100,
                }}
              >
                {category}
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: coverImage ? 44 : 56,
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
          {excerpt && (
            <div
              style={{
                fontSize: 22,
                color: "#94a3b8",
                lineHeight: 1.45,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {excerpt}
            </div>
          )}
          {authorName && (
            <div style={{ fontSize: 18, color: "#64748b", fontWeight: 500, marginTop: 4 }}>
              By {authorName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
